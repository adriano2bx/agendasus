import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Response } from 'express';
import { randomBytes } from 'node:crypto';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './login.dto.js';

@Controller('auth')
export class AuthController {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();
  private readonly ipAttempts = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() input: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const key = `${request.ip ?? 'unknown'}:${input.email.toLowerCase()}`;
    const ipKey = request.ip ?? 'unknown';
    const now = Date.now();
    const current = this.attempts.get(key);
    const ipCurrent = this.ipAttempts.get(ipKey);
    if (
      (current && current.resetAt > now && current.count >= 5) ||
      (ipCurrent && ipCurrent.resetAt > now && ipCurrent.count >= 30)
    ) {
      throw new HttpException(
        'Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    try {
      const result = await this.authService.login(input, {
        ...(request.ip ? { ip: request.ip } : {}),
        ...(request.headers['user-agent'] ? { userAgent: request.headers['user-agent'] } : {}),
      });
      this.attempts.delete(key);
      const csrfToken = randomBytes(32).toString('hex');
      const secure = process.env.NODE_ENV === 'production';
      response.cookie('confirma_access_token', result.accessToken, {
        httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 8 * 60 * 60 * 1000,
      });
      response.cookie('confirma_csrf_token', csrfToken, {
        httpOnly: false, secure, sameSite: 'lax', path: '/', maxAge: 8 * 60 * 60 * 1000,
      });
      return { user: result.user };
    } catch (error) {
      const active =
        current && current.resetAt > now ? current : { count: 0, resetAt: now + 15 * 60_000 };
      this.attempts.set(key, { ...active, count: active.count + 1 });
      const activeIp =
        ipCurrent && ipCurrent.resetAt > now ? ipCurrent : { count: 0, resetAt: now + 15 * 60_000 };
      this.ipAttempts.set(ipKey, { ...activeIp, count: activeIp.count + 1 });
      throw error;
    }
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.authService.me(request.user!.sub);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) {
    await this.authService.logout(request.user!.sub);
    response.clearCookie('confirma_access_token', { httpOnly: true, path: '/' });
    response.clearCookie('confirma_csrf_token', { path: '/' });
  }
}
