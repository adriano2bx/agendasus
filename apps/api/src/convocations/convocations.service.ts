import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { prisma } from '@confirma/database';
import type { UpdateConvocationStatusDto } from './update-convocation-status.dto.js';

@Injectable()
export class ConvocationsService {
  async list(input: { page?: number; status?: string; stage?: string; campaignId?: string }) {
    const page = Math.max(1, input.page ?? 1);
    const take = 50;
    const where = {
      ...(input.campaignId ? { campaignId: input.campaignId } : {}),
      ...(input.status ? { status: input.status as never } : {}),
      ...(input.stage ? { stage: input.stage as never } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.convocation.count({ where }),
      prisma.convocation.findMany({
        where,
        skip: (page - 1) * take,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          patient: { include: { phones: { where: { selectedForWhatsApp: true }, take: 1 } } },
          campaign: { select: { id: true, name: true } },
          records: { include: { sourceRecord: { include: { procedures: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
    ]);
    return { page, take, total, items };
  }

  detail(id: string) {
    return prisma.convocation.findUniqueOrThrow({
      where: { id },
      include: {
        patient: { include: { phones: true } },
        campaign: true,
        records: { include: { sourceRecord: { include: { procedures: true } } } },
        messages: {
          include: { events: { orderBy: { receivedAt: 'asc' } }, billingEvents: true },
          orderBy: { createdAt: 'asc' },
        },
        responses: { orderBy: { receivedAt: 'asc' } },
      },
    });
  }

  async updateStatus(id: string, input: UpdateConvocationStatusDto, userId: string) {
    return prisma.$transaction(async (transaction) => {
      const convocation = await transaction.convocation.findUnique({ where: { id } });
      if (!convocation) throw new BadRequestException('Convocação não encontrada');
      const terminal = ['CONFIRMED', 'CANCELLED', 'FINISHED_NO_RESPONSE'];
      if (convocation.status === input.status) return convocation;
      if (terminal.includes(convocation.status)) {
        throw new ConflictException('Esta convocação já foi finalizada');
      }

      const now = new Date();
      const updated = await transaction.convocation.update({
        where: { id },
        data: {
          status: input.status,
          nextActionAt: null,
          version: { increment: 1 },
          ...(input.status === 'CONFIRMED'
            ? { confirmedAt: now, cancelledAt: null }
            : { cancelledAt: now, confirmedAt: null }),
        },
      });
      await transaction.auditLog.create({
        data: {
          userId,
          eventType: 'CONVOCATION_STATUS_CHANGED_MANUALLY',
          entityType: 'convocation',
          entityId: id,
          previousData: { status: convocation.status },
          newData: { status: input.status },
          reason: input.reason.trim(),
        },
      });

      const remaining = await transaction.convocation.count({
        where: {
          campaignId: convocation.campaignId,
          status: { notIn: ['CONFIRMED', 'CANCELLED', 'FINISHED_NO_RESPONSE', 'SEND_ERROR'] },
        },
      });
      if (remaining === 0) {
        await transaction.campaign.updateMany({
          where: {
            id: convocation.campaignId,
            status: { in: ['SCHEDULED', 'RUNNING', 'PAUSED'] },
          },
          data: { status: 'COMPLETED', completedAt: now },
        });
      }
      return updated;
    });
  }
}
