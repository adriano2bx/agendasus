import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma } from '@confirma/database';
import type { DashboardQueryDto } from './dashboard-query.dto.js';

@Injectable()
export class DashboardService {
  async overview(query: DashboardQueryDto) {
    const period = datePeriod(query.dateFrom, query.dateTo);
    const campaignWhere = query.campaignId ? { campaignId: query.campaignId } : {};
    const convocationWhere = { ...campaignWhere, ...(period ? { updatedAt: period } : {}) };
    const messageWhere = {
      ...(query.campaignId ? { convocation: { campaignId: query.campaignId } } : {}),
      ...(period ? { createdAt: period } : {}),
    };
    const activeConvocationStatuses = [
      'SCHEDULED',
      'QUEUED',
      'PROCESSING',
      'WAITING_RESPONSE',
      'SEND_ERROR',
    ] as const;

    const [
      activeCampaigns,
      pausedCampaigns,
      patientsInProcess,
      waitingResponse,
      sourceRecords,
      messages,
      confirmed,
      cancelled,
      noResponse,
      messageByStatus,
      stageByStatus,
      failedMessageConvocations,
      sendErrorConvocations,
    ] = await Promise.all([
      prisma.campaign.count({
        where: {
          status: { in: ['SCHEDULED', 'RUNNING'] },
          ...(query.campaignId ? { id: query.campaignId } : {}),
        },
      }),
      prisma.campaign.count({
        where: { status: 'PAUSED', ...(query.campaignId ? { id: query.campaignId } : {}) },
      }),
      prisma.convocation.count({
        where: { ...campaignWhere, status: { in: [...activeConvocationStatuses] } },
      }),
      prisma.convocation.count({ where: { ...campaignWhere, status: 'WAITING_RESPONSE' } }),
      prisma.sourceRecord.count({
        where: {
          ...(query.campaignId
            ? { convocations: { some: { convocation: { campaignId: query.campaignId } } } }
            : {}),
          ...(period ? { createdAt: period } : {}),
        },
      }),
      prisma.message.count({ where: messageWhere }),
      prisma.convocation.count({
        where: {
          ...campaignWhere,
          status: 'CONFIRMED',
          ...(period ? { confirmedAt: period } : {}),
        },
      }),
      prisma.convocation.count({
        where: {
          ...campaignWhere,
          status: 'CANCELLED',
          ...(period ? { cancelledAt: period } : {}),
        },
      }),
      prisma.convocation.count({
        where: {
          ...campaignWhere,
          status: 'FINISHED_NO_RESPONSE',
          ...(period ? { finishedAt: period } : {}),
        },
      }),
      prisma.message.groupBy({ by: ['status'], where: messageWhere, _count: { _all: true } }),
      prisma.message.groupBy({
        by: ['stage', 'status'],
        where: messageWhere,
        _count: { _all: true },
      }),
      prisma.message.findMany({
        where: { ...messageWhere, status: 'FAILED' },
        distinct: ['convocationId'],
        select: { convocationId: true },
      }),
      prisma.convocation.findMany({
        where: { ...convocationWhere, status: 'SEND_ERROR' },
        select: { id: true },
      }),
    ]);

    const failedIds = new Set([
      ...failedMessageConvocations.map((item) => item.convocationId),
      ...sendErrorConvocations.map((item) => item.id),
    ]);
    return {
      activeCampaigns,
      pausedCampaigns,
      patientsInProcess,
      waitingResponse,
      sourceRecords,
      messages,
      failures: failedIds.size,
      outcomes: { confirmed, cancelled, noResponse },
      messageByStatus: Object.fromEntries(
        messageByStatus.map((item) => [item.status, item._count._all]),
      ),
      stageByStatus: stageByStatus.map((item) => ({
        stage: item.stage,
        status: item.status,
        count: item._count._all,
      })),
      generatedAt: new Date(),
    };
  }
}

function datePeriod(dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) return undefined;
  const start = dateFrom ? new Date(`${dateFrom}T00:00:00`) : undefined;
  const end = dateTo ? new Date(`${dateTo}T00:00:00`) : undefined;
  if ((start && Number.isNaN(start.valueOf())) || (end && Number.isNaN(end.valueOf()))) {
    throw new BadRequestException('O período informado contém uma data inválida');
  }
  if (start && end && start > end) {
    throw new BadRequestException('A data inicial não pode ser posterior à data final');
  }
  if (end) end.setDate(end.getDate() + 1);
  return { ...(start ? { gte: start } : {}), ...(end ? { lt: end } : {}) };
}
