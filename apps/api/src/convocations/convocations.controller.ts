import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { ConvocationsService } from './convocations.service.js';
import { UpdateConvocationStatusDto } from './update-convocation-status.dto.js';

@Controller('convocations')
@UseGuards(AuthGuard)
export class ConvocationsController {
  constructor(private readonly convocations: ConvocationsService) {}
  @Get() list(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('status') status?: string,
    @Query('stage') stage?: string,
    @Query('campaignId') campaignId?: string,
  ) {
    return this.convocations.list({
      ...(page === undefined ? {} : { page }),
      ...(status ? { status } : {}),
      ...(stage ? { stage } : {}),
      ...(campaignId ? { campaignId } : {}),
    });
  }
  @Get(':id') detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.convocations.detail(id);
  }
  @Post(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateConvocationStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (request.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Somente administradores podem alterar o status manualmente');
    }
    return this.convocations.updateStatus(id, input, request.user.sub);
  }
}
