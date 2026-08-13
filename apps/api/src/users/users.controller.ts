import { Body, Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { CreateUserDto } from './create-user.dto.js';
import { UsersService } from './users.service.js';
@Controller('users') @UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get() list(@Req() request: AuthenticatedRequest) { this.admin(request); return this.users.list(); }
  @Post() create(@Body() input: CreateUserDto, @Req() request: AuthenticatedRequest) { this.admin(request); return this.users.create(input, request.user!.sub); }
  private admin(request: AuthenticatedRequest) { if (request.user?.role !== 'ADMIN') throw new ForbiddenException('Ação exclusiva de administrador'); }
}

