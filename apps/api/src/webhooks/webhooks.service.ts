import { createHash, timingSafeEqual } from 'node:crypto';
import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Prisma, prisma } from '@confirma/database';
import type { ProcessWebhookJob } from '@confirma/queue';
import type { Queue } from 'bullmq';
import { WEBHOOK_QUEUE } from './webhooks.constants.js';

interface GupshupEnvelope {
  app?: unknown;
  type?: unknown;
  timestamp?: unknown;
  payload?: unknown;
}

@Injectable()
export class WebhooksService {
  constructor(@Inject(WEBHOOK_QUEUE) private readonly queue: Queue<ProcessWebhookJob>) {}

  async receive(value: unknown, secret?: string) {
    const expected = process.env.GUPSHUP_WEBHOOK_SECRET;
    if (
      expected &&
      (!secret ||
        secret.length !== expected.length ||
        !timingSafeEqual(Buffer.from(secret), Buffer.from(expected)))
    ) {
      throw new ForbiddenException('Assinatura do webhook inválida');
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Payload de webhook inválido');
    }
    const event = value as GupshupEnvelope;
    if (typeof event.type !== 'string' || !event.payload || typeof event.payload !== 'object') {
      throw new BadRequestException('Evento Gupshup sem tipo ou payload');
    }
    const expectedApp = process.env.GUPSHUP_APP_NAME;
    if (expectedApp && event.app !== expectedApp) {
      throw new ForbiddenException('Evento recebido para uma aplicação Gupshup diferente');
    }
    const eventType = event.type.toLowerCase();
    const payload = event.payload as Record<string, unknown>;
    const providerMessageId = providerMessageIdFor(eventType, payload);
    const providerEventId = stringValue(payload.id);
    const deduplicationKey = eventDeduplicationKey(eventType, payload);

    let existing = await prisma.messageEvent.findUnique({ where: { deduplicationKey } });
    let stored = existing;
    if (!stored) {
      try {
        stored = await prisma.messageEvent.create({
          data: {
            providerMessageId,
            providerEventId,
            eventType,
            deduplicationKey,
            payload: value as Prisma.InputJsonValue,
          },
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
          throw error;
        }
        existing = await prisma.messageEvent.findUnique({ where: { deduplicationKey } });
        if (!existing) throw error;
        stored = existing;
      }
    }
    if (!stored) throw new Error('Não foi possível persistir o evento do webhook');
    // Reenfileirar também um evento que já havia sido persistido. Assim, se a API
    // cair entre o INSERT e o Redis, a próxima entrega do provedor recupera o fluxo.
    if (stored.processingStatus === 'PENDING') {
      await this.queue.add(
        'process-webhook',
        { messageEventId: stored.id },
        {
          jobId: `webhook:${stored.id}`,
          attempts: 5,
          backoff: { type: 'exponential', delay: 2_000 },
          removeOnComplete: 1_000,
          removeOnFail: 1_000,
        },
      );
    }
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function contextGsId(payload: Record<string, unknown>): string | null {
  const context = payload.context;
  return context && typeof context === 'object'
    ? stringValue((context as Record<string, unknown>).gsId)
    : null;
}

function providerMessageIdFor(type: string, payload: Record<string, unknown>): string | null {
  return (
    stringValue(payload.gsId) ??
    contextGsId(payload) ??
    (['message-event', 'billing-event', 'billing'].includes(type) ? stringValue(payload.id) : null)
  );
}

function eventDeduplicationKey(type: string, payload: Record<string, unknown>): string {
  const details = recordValue(payload.payload);
  const subtype = stringValue(payload.type)?.toLowerCase() ?? '';
  const identity =
    type === 'message'
      ? stringValue(payload.id)
      : (stringValue(payload.gsId) ?? stringValue(payload.id) ?? contextGsId(payload));
  const eventTime = scalarValue(details.ts) ?? scalarValue(payload.timestamp);
  const stable = identity ? { type, subtype, identity, eventTime } : { type, subtype, payload };
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function scalarValue(value: unknown): string | number | null {
  return typeof value === 'string' || typeof value === 'number' ? value : null;
}
