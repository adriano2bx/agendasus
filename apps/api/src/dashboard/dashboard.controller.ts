import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { DashboardService } from './dashboard.service.js';
import { DashboardQueryDto } from './dashboard-query.dto.js';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}
  @Get('overview')
  overview(@Query() query: DashboardQueryDto) {
    return this.dashboard.overview(query);
  }
}
