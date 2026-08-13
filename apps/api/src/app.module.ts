import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { CampaignsModule } from './campaigns/campaigns.module.js';
import { ConvocationsModule } from './convocations/convocations.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { HealthController } from './health/health.controller.js';
import { ImportsModule } from './imports/imports.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [AuthModule, ImportsModule, CampaignsModule, WebhooksModule, DashboardModule, ConvocationsModule, ReportsModule, UsersModule],
  controllers: [HealthController],
})
export class AppModule {}
