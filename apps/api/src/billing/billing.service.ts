import { Injectable } from '@nestjs/common';
import { prisma } from '@confirma/database';
import type { BillingQueryDto } from './billing-query.dto.js';

@Injectable()
export class BillingService {
  async events(query: BillingQueryDto) {
    const where = this.where(query);
    const [rows, total] = await Promise.all([
      prisma.billingEvent.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: { message: { select: { id: true, stage: true, providerMessageId: true, convocation: { select: { campaign: { select: { id: true, name: true } } } } } } },
      }),
      prisma.billingEvent.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({ ...row, cost: row.cost?.toString() ?? null })),
      pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    };
  }

  async summary(query: BillingQueryDto) {
    const where = this.where(query);
    const [aggregate, billableMessages, nonBillableMessages, currencies] = await Promise.all([
      prisma.billingEvent.aggregate({ where, _count: { _all: true }, _sum: { cost: true } }),
      prisma.billingEvent.count({ where: { ...where, billable: true } }),
      prisma.billingEvent.count({ where: { ...where, billable: false } }),
      prisma.billingEvent.groupBy({ by: ['currency'], where, _count: { _all: true }, _sum: { cost: true } }),
    ]);
    return {
      events: aggregate._count._all,
      billableMessages,
      nonBillableMessages,
      totalCost: aggregate._sum.cost?.toString() ?? '0',
      currencies: currencies.map((item) => ({ currency: item.currency, events: item._count._all, totalCost: item._sum.cost?.toString() ?? '0' })),
    };
  }

  private where(query: BillingQueryDto): Record<string, unknown> {
    return {
      ...(query.dateFrom || query.dateTo ? { billingAt: { ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}), ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}) } } : {}),
      ...(query.messageId ? { messageId: query.messageId } : {}),
      ...(query.providerMessageId ? { providerMessageId: query.providerMessageId } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.billable !== undefined ? { billable: query.billable } : {}),
      ...(query.currency ? { currency: query.currency.toUpperCase() } : {}),
      ...(query.stage || query.campaignId ? { message: { ...(query.stage ? { stage: query.stage } : {}), ...(query.campaignId ? { convocation: { campaignId: query.campaignId } } : {}) } } : {}),
    };
  }
}
