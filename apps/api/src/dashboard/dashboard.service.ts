import { Injectable } from '@nestjs/common';
import { prisma } from '@confirma/database';

@Injectable()
export class DashboardService {
  async overview() {
    const [campaigns, convocations, messages, convocationByStatus, messageByStatus, stageByStatus] = await Promise.all([
      prisma.campaign.count({ where: { status: { in: ['SCHEDULED', 'RUNNING', 'PAUSED'] } } }),
      prisma.convocation.count(),
      prisma.message.count(),
      prisma.convocation.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.message.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.convocation.groupBy({ by: ['stage', 'status'], _count: { _all: true } }),
    ]);
    return {
      activeCampaigns: campaigns,
      convocations,
      messages,
      convocationByStatus: Object.fromEntries(convocationByStatus.map((item) => [item.status, item._count._all])),
      messageByStatus: Object.fromEntries(messageByStatus.map((item) => [item.status, item._count._all])),
      stageByStatus: stageByStatus.map((item) => ({ stage: item.stage, status: item.status, count: item._count._all })),
    };
  }
}
