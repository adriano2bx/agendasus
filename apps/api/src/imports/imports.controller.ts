import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import { Body, Req } from '@nestjs/common';
import { ApproveImportDto } from './approve-import.dto.js';
import { ImportsService } from './imports.service.js';
import { UpdateImportRowDto } from './update-import-row.dto.js';
import { ImportsQueryDto } from './imports-query.dto.js';

@Controller('imports')
@UseGuards(AuthGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    }),
  )
  create(@Req() request: AuthenticatedRequest, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    return this.importsService.create(file, request.user!.sub);
  }

  @Get()
  list(@Query() query: ImportsQueryDto) {
    return this.importsService.list(query);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.importsService.findById(id);
  }

  @Get(':id/review')
  review(@Param('id', ParseUUIDPipe) id: string) {
    return this.importsService.review(id);
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ApproveImportDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.importsService.approve(id, request.user!.sub, input.note);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return this.importsService.cancel(id, request.user!.sub);
  }

  @Patch(':id/rows/:rowId')
  updateRow(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Body() input: UpdateImportRowDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.importsService.updateRow(id, rowId, input, request.user!.sub);
  }
}
