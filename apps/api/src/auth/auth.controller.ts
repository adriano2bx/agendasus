import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './login.dto.js';

@Controller('auth')
export class AuthController {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() input: LoginDto, @Req() request: Request) {
    const key = `${request.ip ?? 'unknown'}:${input.email.toLowerCase()}`;
    const now = Date.now();
    const current = this.attempts.get(key);
    if (current && current.resetAt > now && current.count >= 5) {
      throw new HttpException(
        'Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    try {
      const result = await this.authService.login(input);
      this.attempts.delete(key);
      return result;
    } catch (error) {
      const active =
        current && current.resetAt > now ? current : { count: 0, resetAt: now + 15 * 60_000 };
      this.attempts.set(key, { ...active, count: active.count + 1 });
      throw error;
    }
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.authService.me(request.user!.sub);
  }
}
