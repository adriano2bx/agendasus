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
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Autenticação obrigatória');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, active: true },
      });
      if (!user?.active) throw new UnauthorizedException('Usuário inativo');
      request.user = { sub: user.id, email: user.email, role: user.role };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
