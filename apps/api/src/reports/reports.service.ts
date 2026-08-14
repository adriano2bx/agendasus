import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma } from '@confirma/database';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type { ReportsQueryDto } from './reports-query.dto.js';

export type ReportKind = 'dispatches' | 'cancellations' | 'no-response';
type ReportTable = { title: string; headers: string[]; rows: unknown[][] };

@Injectable()
export class ReportsService {
  async dispatchesCsv(query: ReportsQueryDto) {
    return csv(await this.dispatchesTable(query));
  }

  async cancellationsCsv(query: ReportsQueryDto) {
    return csv(await this.cancellationsTable(query));
  }

  async noResponseCsv(query: ReportsQueryDto) {
    return csv(await this.noResponseTable(query));
  }

  async xlsx(kind: ReportKind, query: ReportsQueryDto) {
    const table = await this.table(kind, query);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Confirma SUS';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet(table.title.slice(0, 31), {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    sheet.addRow(table.headers);
    for (const row of table.rows) sheet.addRow(row.map((cell) => String(cell ?? '')));
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2B5A' } };
    header.alignment = { vertical: 'middle' };
    header.height = 24;
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: table.headers.length },
    };
    sheet.columns.forEach((column, index) => {
      const values = [
        table.headers[index] ?? '',
        ...table.rows.map((row) => String(row[index] ?? '')),
      ];
      column.width = Math.min(45, Math.max(12, ...values.map((value) => value.length + 2)));
      column.alignment = { vertical: 'top', wrapText: true };
    });
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async pdf(kind: ReportKind, query: ReportsQueryDto) {
    const table = await this.table(kind, query);
    return new Promise<Buffer>((resolve, reject) => {
      const document = new PDFDocument({
        size: 'A4',
        margin: 38,
        info: { Title: table.title, Author: 'Confirma SUS' },
      });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      document.font('Helvetica-Bold').fontSize(19).fillColor('#0D2B5A').text(table.title);
      document
        .moveDown(0.35)
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#667680')
        .text(`Gerado em ${formatDateTime(new Date())} · ${periodLabel(query)}`);
      document.moveDown(1);
      if (!table.rows.length) {
        document
          .fontSize(10)
          .fillColor('#667680')
          .text('Nenhum registro encontrado para os filtros selecionados.');
      }
      table.rows.forEach((row, rowIndex) => {
        if (document.y > 720) document.addPage();
        document
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .fillColor('#0BA99D')
          .text(`${rowIndex + 1}. ${String(row[0] ?? 'Registro')}`);
        document.moveDown(0.25);
        table.headers.forEach((label, columnIndex) => {
          const value = String(row[columnIndex] ?? '').trim();
          if (!value) return;
          document
            .font('Helvetica-Bold')
            .fontSize(7.5)
            .fillColor('#52636D')
            .text(`${label}: `, { continued: true });
          document.font('Helvetica').fillColor('#1D2933').text(value);
        });
        document.moveDown(0.6);
        document
          .strokeColor('#DCE4E9')
          .lineWidth(0.5)
          .moveTo(38, document.y)
          .lineTo(557, document.y)
          .stroke();
        document.moveDown(0.7);
      });
      document.end();
    });
  }

  private table(kind: ReportKind, query: ReportsQueryDto) {
    if (kind === 'dispatches') return this.dispatchesTable(query);
    if (kind === 'cancellations') return this.cancellationsTable(query);
    return this.noResponseTable(query);
  }

  private async dispatchesTable(query: ReportsQueryDto): Promise<ReportTable> {
    const period = buildMessagePeriod(query.dateFrom, query.dateTo);
    const messages = await prisma.message.findMany({
      where: {
        ...(period ? { createdAt: period } : {}),
        ...(query.stage ? { stage: query.stage } : {}),
        ...(query.status ? { status: query.status as never } : {}),
        convocation: {
          ...(query.campaignId ? { campaignId: query.campaignId } : {}),
          ...(query.procedure
            ? {
                records: {
                  some: {
                    sourceRecord: {
                      procedures: {
                        some: { name: { contains: query.procedure, mode: 'insensitive' } },
                      },
                    },
                  },
                },
              }
            : {}),
        },
      },
      include: {
        convocation: {
          include: {
            patient: true,
            selectedPhone: true,
            campaign: true,
            responses: { orderBy: { receivedAt: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return {
      title: 'Relatório de disparos',
      headers: [
        'Campanha',
        'Paciente',
        'Telefone',
        'Etapa',
        'Situação da mensagem',
        'Submetida',
        'Enviada',
        'Entregue',
        'Lida',
        'Falha',
        'Código da falha',
        'Motivo da falha',
        'Resposta final',
        'Data da resposta',
      ],
      rows: messages.map((message) => {
        const response = message.convocation.responses.at(-1);
        return [
          message.convocation.campaign.name,
          message.convocation.patient.displayName,
          message.phone || message.convocation.selectedPhone?.normalizedValue || '',
          stageLabel(message.stage),
          messageStatusLabel(message.status),
          formatDateTime(message.submittedAt),
          formatDateTime(message.sentAt),
          formatDateTime(message.deliveredAt),
          formatDateTime(message.readAt),
          formatDateTime(message.failedAt),
          message.failureCode ?? '',
          message.failureReason ?? '',
          responseLabel(response?.action),
          formatDateTime(response?.receivedAt),
        ];
      }),
    };
  }

  private async cancellationsTable(query: ReportsQueryDto): Promise<ReportTable> {
    const period = buildMessagePeriod(query.dateFrom, query.dateTo);
    const rows = await prisma.convocation.findMany({
      where: {
        status: 'CANCELLED',
        ...(period ? { cancelledAt: period } : {}),
        ...(query.campaignId ? { campaignId: query.campaignId } : {}),
      },
      include: {
        patient: true,
        selectedPhone: true,
        campaign: true,
        responses: { where: { action: 'CANCEL' }, orderBy: { receivedAt: 'desc' }, take: 1 },
      },
      orderBy: { cancelledAt: 'asc' },
    });
    return {
      title: 'Relatório de cancelamentos',
      headers: ['Campanha', 'Paciente', 'Telefone', 'Data do cancelamento', 'Etapa de origem'],
      rows: rows.map((row) => [
        row.campaign.name,
        row.patient.displayName,
        row.selectedPhone?.normalizedValue ?? '',
        formatDateTime(row.cancelledAt),
        stageLabel(row.responses[0]?.sourceStage ?? row.stage),
      ]),
    };
  }

  private async noResponseTable(query: ReportsQueryDto): Promise<ReportTable> {
    const period = buildMessagePeriod(query.dateFrom, query.dateTo);
    const rows = await prisma.convocation.findMany({
      where: {
        status: 'FINISHED_NO_RESPONSE',
        ...(period ? { finishedAt: period } : {}),
        ...(query.campaignId ? { campaignId: query.campaignId } : {}),
      },
      include: {
        patient: true,
        selectedPhone: true,
        campaign: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { finishedAt: 'asc' },
    });
    return {
      title: 'Relatório de finalizados sem resposta',
      headers: [
        'Campanha',
        'Paciente',
        'Telefone',
        'Finalizada em',
        'Quantidade de tentativas',
        'Primeira tentativa',
        'Segunda tentativa',
        'Terceira tentativa',
      ],
      rows: rows.map((row) => [
        row.campaign.name,
        row.patient.displayName,
        row.selectedPhone?.normalizedValue ?? '',
        formatDateTime(row.finishedAt),
        row.messages.length,
        formatDateTime(row.messages.find((message) => message.stage === 'FIRST')?.submittedAt),
        formatDateTime(row.messages.find((message) => message.stage === 'SECOND')?.submittedAt),
        formatDateTime(row.messages.find((message) => message.stage === 'THIRD')?.submittedAt),
      ]),
    };
  }
}

export function buildMessagePeriod(dateFrom?: string, dateTo?: string) {
  const start = dateFrom ? localDateStart(dateFrom) : undefined;
  const endStart = dateTo ? localDateStart(dateTo) : undefined;
  if ((dateFrom && !start) || (dateTo && !endStart)) {
    throw new BadRequestException('O período informado contém uma data inválida');
  }
  if (start && endStart && start > endStart) {
    throw new BadRequestException('A data inicial não pode ser posterior à data final');
  }
  if (!start && !endStart) return undefined;
  const end = endStart ? new Date(endStart) : undefined;
  if (end) end.setDate(end.getDate() + 1);
  return { ...(start ? { gte: start } : {}), ...(end ? { lt: end } : {}) };
}

function localDateStart(value: string) {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3) return undefined;
  const [year, month, day] = parts;
  if (year === undefined || month === undefined || day === undefined) return undefined;
  const result = new Date(year, month - 1, day, 0, 0, 0, 0);
  return result.getFullYear() === year &&
    result.getMonth() === month - 1 &&
    result.getDate() === day
    ? result
    : undefined;
}

function formatDateTime(value?: Date | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: process.env.APP_TIMEZONE ?? 'America/Sao_Paulo',
  }).format(value);
}

function stageLabel(value: string) {
  return (
    (
      {
        FIRST: '1ª convocação',
        SECOND: '2ª convocação',
        THIRD: '3ª convocação',
        FINISHED: 'Finalizada',
      } as Record<string, string>
    )[value] ?? 'Etapa não identificada'
  );
}

function messageStatusLabel(value: string) {
  return (
    (
      {
        QUEUED: 'Na fila',
        PROCESSING: 'Em processamento',
        SUBMITTED: 'Aceita pelo provedor',
        SENT: 'Enviada',
        DELIVERED: 'Entregue',
        READ: 'Lida',
        FAILED: 'Falha',
      } as Record<string, string>
    )[value] ?? 'Situação não identificada'
  );
}

function responseLabel(value?: string) {
  if (!value) return '';
  return (
    (
      {
        CONFIRM: 'Confirmou',
        CANCEL: 'Cancelou',
        FREE_TEXT: 'Texto livre',
        UNKNOWN: 'Não identificada',
      } as Record<string, string>
    )[value] ?? 'Não identificada'
  );
}

function csv(table: ReportTable) {
  return `\uFEFF${[table.headers, ...table.rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')}\n`;
}

function periodLabel(query: ReportsQueryDto) {
  if (query.dateFrom && query.dateTo) return `Período de ${query.dateFrom} a ${query.dateTo}`;
  if (query.dateFrom) return `A partir de ${query.dateFrom}`;
  if (query.dateTo) return `Até ${query.dateTo}`;
  return 'Todos os períodos';
}
