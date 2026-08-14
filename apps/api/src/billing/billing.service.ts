import { BadRequestException, Injectable } from '@nestjs/common';
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
        include: {
          message: {
            select: {
              id: true,
              stage: true,
              providerMessageId: true,
              convocation: { select: { campaign: { select: { id: true, name: true } } } },
            },
          },
        },
      }),
      prisma.billingEvent.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({ ...row, cost: row.cost?.toString() ?? null })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    };
  }

  async summary(query: BillingQueryDto) {
    const where = this.where(query);
    const [aggregate, billableMessages, nonBillableMessages, currencies] = await Promise.all([
      prisma.billingEvent.aggregate({ where, _count: { _all: true }, _sum: { cost: true } }),
      prisma.billingEvent.count({ where: { ...where, billable: true } }),
      prisma.billingEvent.count({ where: { ...where, billable: false } }),
      prisma.billingEvent.groupBy({
        by: ['currency'],
        where,
        _count: { _all: true },
        _sum: { cost: true },
      }),
    ]);
    return {
      events: aggregate._count._all,
      billableMessages,
      nonBillableMessages,
      totalCost: aggregate._sum.cost?.toString() ?? '0',
      currencies: currencies.map((item) => ({
        currency: item.currency,
        events: item._count._all,
        totalCost: item._sum.cost?.toString() ?? '0',
      })),
    };
  }

  private where(query: BillingQueryDto): Record<string, unknown> {
    const billingAt = billingPeriod(query.dateFrom, query.dateTo);
    return {
      ...(billingAt ? { billingAt } : {}),
      ...(query.messageId ? { messageId: query.messageId } : {}),
      ...(query.providerMessageId ? { providerMessageId: query.providerMessageId } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.billable !== undefined ? { billable: query.billable } : {}),
      ...(query.currency ? { currency: query.currency.toUpperCase() } : {}),
      ...(query.stage || query.campaignId
        ? {
            message: {
              ...(query.stage ? { stage: query.stage } : {}),
              ...(query.campaignId ? { convocation: { campaignId: query.campaignId } } : {}),
            },
          }
        : {}),
    };
  }
}

function billingPeriod(dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) return undefined;
  const start = dateFrom ? new Date(dateFrom) : undefined;
  const end = dateTo ? new Date(dateTo) : undefined;
  if (start && end && start > end) {
    throw new BadRequestException('A data inicial não pode ser posterior à data final');
  }
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
  if (end && dateTo && dateOnly.test(dateTo)) end.setUTCDate(end.getUTCDate() + 1);
  return {
    ...(start ? { gte: start } : {}),
    ...(end ? (dateTo && dateOnly.test(dateTo) ? { lt: end } : { lte: end }) : {}),
  };
}
