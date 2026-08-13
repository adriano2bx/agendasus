import { Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUES, createRedisConnection } from '@confirma/queue';
import { WebhooksController } from './webhooks.controller.js';
import { WEBHOOK_QUEUE } from './webhooks.constants.js';
import { WebhooksService } from './webhooks.service.js';

@Module({
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    { provide: WEBHOOK_QUEUE, useFactory: () => new Queue(QUEUES.webhooks, { connection: createRedisConnection() }) },
  ],
})
export class WebhooksModule {}

