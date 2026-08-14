import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma } from '@confirma/database';
import type { ReportsQueryDto } from './reports-query.dto.js';

@Injectable()
export class ReportsService {
  async dispatchesCsv(query: ReportsQueryDto) {
    const messagePeriod = buildMessagePeriod(query.dateFrom, query.dateTo);
    const messageFilter = messagePeriod ? { createdAt: messagePeriod } : {};
    const rows = await prisma.convocation.findMany({
      where: {
        ...(query.campaignId ? { campaignId: query.campaignId } : {}),
        ...(messagePeriod ? { messages: { some: messageFilter } } : {}),
      },
      include: {
        patient: {
          include: { phones: { where: { selectedForWhatsApp: true }, take: 1 } },
        },
        campaign: true,
        messages: { where: messageFilter, orderBy: { createdAt: 'asc' } },
        responses: { orderBy: { receivedAt: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return csv(
      [
        'Campanha',
        'Paciente',
        'Telefone',
        'Etapa',
        'Situação',
        'Próxima ação',
        'Mensagens no período',
        'Resposta',
      ],
      rows.map((row) => [
        row.campaign.name,
        row.patient.displayName,
        row.patient.phones[0]?.normalizedValue ?? '',
        stageLabel(row.stage),
        statusLabel(row.status),
        formatDateTime(row.nextActionAt),
        row.messages.length,
        responseLabel(row.responses.at(-1)?.action),
      ]),
    );
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

  let end: Date | undefined;
  if (endStart) {
    end = new Date(endStart);
    end.setDate(end.getDate() + 1);
  }
  return { ...(start ? { gte: start } : {}), ...(end ? { lt: end } : {}) };
}

function localDateStart(value: string) {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3) return undefined;
  const [year, month, day] = parts;
  if (year === undefined || month === undefined || day === undefined) return undefined;
  const result = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day
  ) {
    return undefined;
  }
  return result;
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

function statusLabel(value: string) {
  return (
    (
      {
        SCHEDULED: 'Programada',
        QUEUED: 'Na fila',
        PROCESSING: 'Em processamento',
        WAITING_RESPONSE: 'Aguardando resposta',
        CONFIRMED: 'Confirmada',
        CANCELLED: 'Cancelada',
        SEND_ERROR: 'Falha no envio',
        FINISHED_NO_RESPONSE: 'Finalizada sem resposta',
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

function csv(headers: string[], rows: unknown[][]) {
  return `\uFEFF${[headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')}\n`;
}
