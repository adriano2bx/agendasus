import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { prisma } from '@confirma/database';
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: { sub: string; email: string; role: 'ADMIN' | 'OPERATOR' };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, bearerToken] = request.headers.authorization?.split(' ') ?? [];
    const token = bearerToken ?? readCookie(request.headers.cookie, 'confirma_access_token');

    if ((!scheme || scheme !== 'Bearer') && !token) {
      throw new UnauthorizedException('Autenticação obrigatória');
    }
    if (!token) throw new UnauthorizedException('Autenticação obrigatória');

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, active: true, deletedAt: true },
      });
      if (!user?.active || user.deletedAt) throw new UnauthorizedException('Usuário inativo');
      request.user = { sub: user.id, email: user.email, role: user.role };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}

function readCookie(header: string | undefined, name: string): string | undefined {
  return header
    ?.split(';')
    .map((part) => part.trim().split('='))
    .find(([key]) => key === name)?.[1];
}
