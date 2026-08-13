import { ConvocationStage, prisma } from '@confirma/database';
import { normalizeButtonAction } from '@confirma/domain';
import type { Job } from 'bullmq';
import type { ProcessWebhookJob } from '@confirma/queue';

export async function processWebhook(job: Job<ProcessWebhookJob>): Promise<void> {
  const event = await prisma.messageEvent.findUniqueOrThrow({ where: { id: job.data.messageEventId } });
  if (event.processingStatus === 'PROCESSED' || event.processingStatus === 'IGNORED') return;
  const envelope = asRecord(event.payload);
  const type = stringValue(envelope.type);
  const payload = asRecord(envelope.payload);
  const providerMessageId = stringValue(payload.gsId) ?? stringValue(payload.id) ?? contextGsId(payload) ?? event.providerMessageId;

  try {
    if (type === 'message-event') await processMessageEvent(event.id, payload, providerMessageId);
    else if (type === 'message') await processInboundMessage(event.id, payload, providerMessageId);
    else await mark(event.id, 'IGNORED');
  } catch (error) {
    await prisma.messageEvent.update({
      where: { id: event.id },
      data: { processingStatus: 'FAILED', processingError: error instanceof Error ? error.message.slice(0, 500) : 'Erro desconhecido' },
    });
    throw error;
  }
}

async function processMessageEvent(eventId: string, payload: Record<string, unknown>, providerMessageId: string | null) {
  const statusType = stringValue(payload.type)?.toLowerCase();
  if (!providerMessageId || !statusType) return mark(eventId, 'IGNORED');
  const message = await prisma.message.findFirst({ where: { providerMessageId } });
  if (!message) return mark(eventId, 'IGNORED');
  const now = new Date();
  const details = asRecord(payload.payload);

  await prisma.$transaction(async (transaction) => {
    const data = statusUpdate(statusType, now, details);
    if (!data) return transaction.messageEvent.update({ where: { id: eventId }, data: { messageId: message.id, processingStatus: 'IGNORED', processedAt: now } });
    await transaction.message.update({ where: { id: message.id }, data });
    await transaction.messageEvent.update({ where: { id: eventId }, data: { messageId: message.id, processingStatus: 'PROCESSED', processedAt: now } });
  });
}

async function processInboundMessage(eventId: string, payload: Record<string, unknown>, providerMessageId: string | null) {
  const content = asRecord(payload.payload);
  const text = stringValue(content.text) ?? '';
  const action = content.type === 'button' ? normalizeButtonAction(text) : 'UNKNOWN';
  const message = providerMessageId ? await prisma.message.findFirst({ where: { providerMessageId } }) : null;
  const now = new Date();
  if (!message) return mark(eventId, 'IGNORED');

  await prisma.$transaction(async (transaction) => {
    const convocation = await transaction.convocation.findUniqueOrThrow({ where: { id: message.convocationId } });
    const terminal = ['CONFIRMED', 'CANCELLED', 'FINISHED_NO_RESPONSE'].includes(convocation.status);
    await transaction.messageResponse.create({
      data: {
        messageId: message.id,
        convocationId: convocation.id,
        action: action === 'CONFIRM' ? 'CONFIRM' : action === 'CANCEL' ? 'CANCEL' : 'FREE_TEXT',
        sourceStage: message.stage,
        rawText: text.slice(0, 1_000),
        receivedAt: now,
      },
    });
    if (!terminal && action !== 'UNKNOWN') {
      await transaction.convocation.update({
        where: { id: convocation.id },
        data: action === 'CONFIRM'
          ? { status: 'CONFIRMED', confirmedAt: now, nextActionAt: null, stage: 'FINISHED' }
          : { status: 'CANCELLED', cancelledAt: now, nextActionAt: null, stage: 'FINISHED' },
      });
      await transaction.auditLog.create({
        data: { eventType: action === 'CONFIRM' ? 'PATIENT_CONFIRMED' : 'PATIENT_CANCELLED', entityType: 'convocation', entityId: convocation.id, metadata: { sourceStage: message.stage, messageId: message.id } },
      });
    }
    await transaction.messageEvent.update({ where: { id: eventId }, data: { messageId: message.id, processingStatus: 'PROCESSED', processedAt: now } });
  });
}

function statusUpdate(status: string, at: Date, details: Record<string, unknown>) {
  if (status === 'enqueued') return { status: 'SUBMITTED' as const };
  if (status === 'sent') return { status: 'SENT' as const, sentAt: at };
  if (status === 'delivered') return { status: 'DELIVERED' as const, deliveredAt: at };
  if (status === 'read') return { status: 'READ' as const, readAt: at };
  if (status === 'failed') return { status: 'FAILED' as const, failedAt: at, failureCode: stringValue(details.code) ?? 'GUPSHUP_FAILED', failureReason: stringValue(details.reason) ?? 'Falha reportada pelo provedor' };
  return null;
}

async function mark(eventId: string, status: 'PROCESSED' | 'IGNORED') {
  await prisma.messageEvent.update({ where: { id: eventId }, data: { processingStatus: status, processedAt: new Date() } });
}
function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function stringValue(value: unknown): string | null { return typeof value === 'string' && value ? value : null; }
function contextGsId(payload: Record<string, unknown>): string | null { return stringValue(asRecord(payload.context).gsId); }
