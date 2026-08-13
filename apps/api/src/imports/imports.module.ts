import { Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUES, createRedisConnection } from '@confirma/queue';
import { AuthModule } from '../auth/auth.module.js';
import { IMPORT_QUEUE } from './imports.constants.js';
import { ImportsController } from './imports.controller.js';
import { ImportsService } from './imports.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ImportsController],
  providers: [
    ImportsService,
    {
      provide: IMPORT_QUEUE,
      useFactory: () => new Queue(QUEUES.imports, { connection: createRedisConnection() }),
    },
  ],
})
export class ImportsModule {}
