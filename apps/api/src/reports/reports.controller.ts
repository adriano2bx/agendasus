import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { ReportsService } from './reports.service.js';
@Controller('reports') @UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  @Get('dispatches.csv') @Header('content-type', 'text/csv; charset=utf-8') @Header('content-disposition', 'attachment; filename="disparos.csv"')
  dispatches(@Query('campaignId') campaignId?: string) { return this.reports.dispatchesCsv(campaignId); }
}
