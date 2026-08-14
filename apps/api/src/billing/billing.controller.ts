import { Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { BillingQueryDto } from './billing-query.dto.js';
import { BillingService } from './billing.service.js';

@Controller('billing')
@UseGuards(AuthGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('events')
  events(@Query() query: BillingQueryDto, @Req() request: AuthenticatedRequest) { this.admin(request); return this.billing.events(query); }

  @Get('summary')
  summary(@Query() query: BillingQueryDto, @Req() request: AuthenticatedRequest) { this.admin(request); return this.billing.summary(query); }

  @Get('campaigns/:campaignId')
  campaign(@Param('campaignId', ParseUUIDPipe) campaignId: string, @Query() query: BillingQueryDto, @Req() request: AuthenticatedRequest) { this.admin(request); query.campaignId = campaignId; return this.billing.summary(query); }

  private admin(request: AuthenticatedRequest) { if (request.user?.role !== 'ADMIN') throw new ForbiddenException('Acesso financeiro exclusivo via API para administrador'); }
}
