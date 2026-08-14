import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, prisma } from '@confirma/database';
import { compare } from 'bcryptjs';
import type { LoginDto } from './login.dto.js';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(
    input: LoginDto,
    metadata?: { ip?: string; userAgent?: string },
  ): Promise<{
    accessToken: string;
    user: { id: string; name: string; email: string; role: string };
  }> {
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });

    if (!user?.active || user.deletedAt || !(await compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        eventType: 'LOGIN_SUCCESS',
        entityType: 'user',
        entityId: user.id,
        ...(metadata ? { metadata: metadata as Prisma.InputJsonValue } : {}),
      },
    });

    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  me(id: string) {
    return prisma.user.findUniqueOrThrow({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async logout(id: string) {
    await prisma.auditLog.create({
      data: { userId: id, eventType: 'LOGOUT', entityType: 'user', entityId: id },
    });
  }
}
