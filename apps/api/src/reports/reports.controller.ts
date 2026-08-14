import { Controller, Get, Header, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { ReportsQueryDto } from './reports-query.dto.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dispatches.csv')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="disparos.csv"')
  dispatches(@Query() query: ReportsQueryDto) {
    return this.reports.dispatchesCsv(query);
  }

  @Get('cancellations.csv')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="cancelamentos.csv"')
  cancellations(@Query() query: ReportsQueryDto) {
    return this.reports.cancellationsCsv(query);
  }

  @Get('no-response.csv')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="sem-resposta.csv"')
  noResponse(@Query() query: ReportsQueryDto) {
    return this.reports.noResponseCsv(query);
  }

  @Get('dispatches.xlsx')
  @Header('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('content-disposition', 'attachment; filename="disparos.xlsx"')
  async dispatchesExcel(@Query() query: ReportsQueryDto) {
    return new StreamableFile(await this.reports.xlsx('dispatches', query));
  }

  @Get('cancellations.xlsx')
  @Header('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('content-disposition', 'attachment; filename="cancelamentos.xlsx"')
  async cancellationsExcel(@Query() query: ReportsQueryDto) {
    return new StreamableFile(await this.reports.xlsx('cancellations', query));
  }

  @Get('no-response.xlsx')
  @Header('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('content-disposition', 'attachment; filename="sem-resposta.xlsx"')
  async noResponseExcel(@Query() query: ReportsQueryDto) {
    return new StreamableFile(await this.reports.xlsx('no-response', query));
  }

  @Get('dispatches.pdf')
  @Header('content-type', 'application/pdf')
  @Header('content-disposition', 'attachment; filename="disparos.pdf"')
  async dispatchesPdf(@Query() query: ReportsQueryDto) {
    return new StreamableFile(await this.reports.pdf('dispatches', query));
  }

  @Get('cancellations.pdf')
  @Header('content-type', 'application/pdf')
  @Header('content-disposition', 'attachment; filename="cancelamentos.pdf"')
  async cancellationsPdf(@Query() query: ReportsQueryDto) {
    return new StreamableFile(await this.reports.pdf('cancellations', query));
  }

  @Get('no-response.pdf')
  @Header('content-type', 'application/pdf')
  @Header('content-disposition', 'attachment; filename="sem-resposta.pdf"')
  async noResponsePdf(@Query() query: ReportsQueryDto) {
    return new StreamableFile(await this.reports.pdf('no-response', query));
  }
}
