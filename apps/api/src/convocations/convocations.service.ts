import { Injectable } from '@nestjs/common';
import { prisma } from '@confirma/database';

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
        where, skip: (page - 1) * take, take, orderBy: { updatedAt: 'desc' },
        include: { patient: { include: { phones: { where: { selectedForWhatsApp: true }, take: 1 } } }, campaign: { select: { id: true, name: true } }, records: { include: { sourceRecord: { include: { procedures: true } } } }, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
    ]);
    return { page, take, total, items };
  }

  detail(id: string) {
    return prisma.convocation.findUniqueOrThrow({
      where: { id },
      include: {
        patient: { include: { phones: true } }, campaign: true,
        records: { include: { sourceRecord: { include: { procedures: true } } } },
        messages: { include: { events: { orderBy: { receivedAt: 'asc' } }, billingEvents: true }, orderBy: { createdAt: 'asc' } },
        responses: { orderBy: { receivedAt: 'asc' } },
      },
    });
  }
}

