import { ConflictException, Injectable } from '@nestjs/common';
import { prisma } from '@confirma/database';
import { hash } from 'bcryptjs';
import type { CreateUserDto } from './create-user.dto.js';
@Injectable()
export class UsersService {
  list() { return prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true, createdAt: true }, orderBy: { createdAt: 'desc' } }); }
  async create(input: CreateUserDto, authorId: string) {
    const email = input.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) throw new ConflictException('Já existe um usuário com este e-mail');
    const user = await prisma.user.create({ data: { name: input.name.trim(), email, passwordHash: await hash(input.password, 12), role: input.role } });
    await prisma.auditLog.create({ data: { userId: authorId, eventType: 'USER_CREATED', entityType: 'user', entityId: user.id } });
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }
}

