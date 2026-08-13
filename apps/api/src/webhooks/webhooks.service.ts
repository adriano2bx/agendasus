import { createHash, timingSafeEqual } from 'node:crypto';
import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Prisma, prisma } from '@confirma/database';
import { QUEUES, type ProcessWebhookJob } from '@confirma/queue';
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
    if (expected && (!secret || secret.length !== expected.length || !timingSafeEqual(Buffer.from(secret), Buffer.from(expected)))) {
      throw new ForbiddenException('Assinatura do webhook inválida');
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Payload de webhook inválido');
    }
    const event = value as GupshupEnvelope;
    if (typeof event.type !== 'string' || !event.payload || typeof event.payload !== 'object') {
      throw new BadRequestException('Evento Gupshup sem tipo ou payload');
    }
    const payload = event.payload as Record<string, unknown>;
    const providerMessageId = stringValue(payload.gsId) ?? stringValue(payload.id) ?? contextGsId(payload);
    const providerEventId = stringValue(payload.id);
    const deduplicationKey = createHash('sha256')
      .update(JSON.stringify({ type: event.type, providerMessageId, providerEventId, timestamp: event.timestamp, payload }))
      .digest('hex');

    const existing = await prisma.messageEvent.findUnique({ where: { deduplicationKey } });
    const stored = existing ?? await prisma.messageEvent.create({
      data: {
        providerMessageId,
        providerEventId,
        eventType: event.type,
        deduplicationKey,
        payload: value as Prisma.InputJsonValue,
      },
    });
    if (!existing && stored.processingStatus === 'PENDING') {
      await this.queue.add(
        'process-webhook',
        { messageEventId: stored.id },
        { jobId: `webhook:${stored.id}`, attempts: 5, backoff: { type: 'exponential', delay: 2_000 }, removeOnComplete: 1_000, removeOnFail: 1_000 },
      );
    }
    return { accepted: true, duplicate: Boolean(existing), eventId: stored.id, queue: QUEUES.webhooks };
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function contextGsId(payload: Record<string, unknown>): string | null {
  const context = payload.context;
  return context && typeof context === 'object' ? stringValue((context as Record<string, unknown>).gsId) : null;
}
