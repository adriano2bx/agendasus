import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { CampaignsModule } from './campaigns/campaigns.module.js';
import { HealthController } from './health/health.controller.js';
import { ImportsModule } from './imports/imports.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';

@Module({
  imports: [AuthModule, ImportsModule, CampaignsModule, WebhooksModule],
  controllers: [HealthController],
})
export class AppModule {}
