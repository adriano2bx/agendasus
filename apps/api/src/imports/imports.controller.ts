import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
  create(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    return this.importsService.create(file);
  }

  @Get()
  list() {
    return this.importsService.list();
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
}
