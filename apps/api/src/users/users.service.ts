import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, prisma } from '@confirma/database';
import { hash } from 'bcryptjs';
import type { CreateUserDto } from './create-user.dto.js';
import type { UpdateUserDto } from './update-user.dto.js';

const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  list() {
    return prisma.user.findMany({
      where: { role: 'OPERATOR', deletedAt: null },
      select: publicUser,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  async create(input: CreateUserDto, administratorId: string) {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await hash(input.password, 12);
    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && (!existing.deletedAt || existing.role !== 'OPERATOR')) {
        throw new ConflictException('Já existe um usuário com este e-mail');
      }
      return await prisma.$transaction(async (transaction) => {
        const user = existing
          ? await transaction.user.update({
              where: { id: existing.id },
              data: {
                name: input.name.trim(),
                passwordHash,
                role: 'OPERATOR',
                active: true,
                deletedAt: null,
              },
              select: publicUser,
            })
          : await transaction.user.create({
              data: {
                name: input.name.trim(),
                email,
                passwordHash,
                role: 'OPERATOR',
                active: true,
              },
              select: publicUser,
            });
        await transaction.auditLog.create({
          data: {
            userId: administratorId,
            eventType: existing ? 'OPERATOR_REACTIVATED' : 'OPERATOR_CREATED',
            entityType: 'user',
            entityId: user.id,
            newData: { name: user.name, email: user.email, role: user.role, active: user.active },
          },
        });
        return user;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe um usuário com este e-mail');
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateUserDto, administratorId: string) {
    const existing = await prisma.user.findFirst({
      where: { id, role: 'OPERATOR', deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Operador não encontrado');
    const passwordHash = input.password ? await hash(input.password, 12) : undefined;
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: publicUser,
    });
    await prisma.auditLog.create({
      data: {
        userId: administratorId,
        eventType: 'OPERATOR_UPDATED',
        entityType: 'user',
        entityId: updated.id,
        previousData: { name: existing.name, active: existing.active },
        newData: {
          name: updated.name,
          active: updated.active,
          passwordChanged: Boolean(passwordHash),
        },
      },
    });
    return updated;
  }

  async remove(id: string, administratorId: string) {
    const existing = await prisma.user.findFirst({
      where: { id, role: 'OPERATOR', deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Operador não encontrado');
    const deletedAt = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { active: false, deletedAt },
      }),
      prisma.auditLog.create({
        data: {
          userId: administratorId,
          eventType: 'OPERATOR_DELETED',
          entityType: 'user',
          entityId: id,
          previousData: {
            name: existing.name,
            email: existing.email,
            active: existing.active,
          },
          newData: { active: false, deletedAt: deletedAt.toISOString() },
        },
      }),
    ]);
    return { id, deleted: true };
  }
}
