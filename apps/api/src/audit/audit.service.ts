import { Injectable } from '@nestjs/common';
import { Prisma, prisma } from '@confirma/database';
import type { AuditQueryDto } from './audit-query.dto.js';

@Injectable()
export class AuditService {
  async list(input: AuditQueryDto) {
    const query = input.query?.trim();
    const createdAt = datePeriod(input.dateFrom, input.dateTo);
    const where: Prisma.AuditLogWhereInput = {
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.eventType ? { eventType: input.eventType } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(query
        ? {
            OR: [
              { eventType: { contains: query, mode: 'insensitive' } },
              { entityType: { contains: query, mode: 'insensitive' } },
              { entityId: { contains: query, mode: 'insensitive' } },
              { reason: { contains: query, mode: 'insensitive' } },
              { user: { name: { contains: query, mode: 'insensitive' } } },
              { user: { email: { contains: query, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [total, items, users, eventTypes] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' },
      }),
      prisma.auditLog.findMany({
        distinct: ['eventType'],
        select: { eventType: true },
        orderBy: { eventType: 'asc' },
      }),
    ]);
    return {
      items,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.max(1, Math.ceil(total / input.limit)),
      },
      filters: { users, eventTypes: eventTypes.map((item) => item.eventType) },
    };
  }
}

function datePeriod(dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) return null;
  return {
    ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
    ...(dateTo ? { lt: nextDay(dateTo) } : {}),
  };
}

function nextDay(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}
