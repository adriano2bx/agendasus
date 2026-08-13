import { Redis } from 'ioredis';

export const QUEUES = {
  imports: 'confirma.imports',
  messages: 'confirma.messages',
  webhooks: 'confirma.webhooks',
  reports: 'confirma.reports',
} as const;

export interface ParseImportJob {
  importId: string;
  importFileId: string;
  temporaryPath: string;
}

export interface SendMessageJob {
  convocationId: string;
  stage: 'FIRST' | 'SECOND' | 'THIRD';
}

export interface ProcessWebhookJob {
  messageEventId: string;
}

export function createRedisConnection(redisUrl = process.env.REDIS_URL): Redis {
  if (!redisUrl) {
    throw new Error('REDIS_URL não configurada');
  }

  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
