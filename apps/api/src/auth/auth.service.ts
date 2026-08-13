import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { prisma } from '@confirma/database';
import { compare } from 'bcryptjs';
import type { LoginDto } from './login.dto.js';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(input: LoginDto): Promise<{
    accessToken: string;
    user: { id: string; name: string; email: string; role: string };
  }> {
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });

    if (!user?.active || !(await compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}

