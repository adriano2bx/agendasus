import { Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { ConvocationsService } from './convocations.service.js';

@Controller('convocations')
@UseGuards(AuthGuard)
export class ConvocationsController {
  constructor(private readonly convocations: ConvocationsService) {}
  @Get() list(@Query('page', new ParseIntPipe({ optional: true })) page?: number, @Query('status') status?: string, @Query('stage') stage?: string, @Query('campaignId') campaignId?: string) {
    return this.convocations.list({ ...(page === undefined ? {} : { page }), ...(status ? { status } : {}), ...(stage ? { stage } : {}), ...(campaignId ? { campaignId } : {}) });
  }
  @Get(':id') detail(@Param('id', ParseUUIDPipe) id: string) { return this.convocations.detail(id); }
}
