import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { CreateCampaignDto } from './create-campaign.dto.js';
import { CampaignsService } from './campaigns.service.js';
import { CampaignsQueryDto } from './campaigns-query.dto.js';
import { UpdateCampaignDto } from './update-campaign.dto.js';

@Controller('campaigns')
@UseGuards(AuthGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post('from-import/:importId')
  createFromImport(
    @Param('importId', ParseUUIDPipe) importId: string,
    @Body() input: CreateCampaignDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.campaignsService.createFromImport(importId, input, request.user!.sub);
  }

  @Get()
  list(@Query() query: CampaignsQueryDto) {
    return this.campaignsService.list(query);
  }

  @Get('options')
  options() {
    return this.campaignsService.options();
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaignsService.detail(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateCampaignDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.campaignsService.updateDraft(id, input, request.user!.sub);
  }

  @Post(':id/schedule')
  schedule(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return this.campaignsService.schedule(id, request.user!.sub);
  }

  @Post(':id/pause')
  pause(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return this.campaignsService.pause(id, request.user!.sub);
  }

  @Post(':id/resume')
  resume(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return this.campaignsService.resume(id, request.user!.sub);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return this.campaignsService.cancel(id, request.user!.sub);
  }
}
