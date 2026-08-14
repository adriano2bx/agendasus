import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { CreateUserDto } from './create-user.dto.js';
import { UpdateUserDto } from './update-user.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    this.requireAdministrator(request);
    return this.users.list();
  }

  @Post()
  create(@Body() input: CreateUserDto, @Req() request: AuthenticatedRequest) {
    this.requireAdministrator(request);
    return this.users.create(input, request.user!.sub);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    this.requireAdministrator(request);
    return this.users.update(id, input, request.user!.sub);
  }

  private requireAdministrator(request: AuthenticatedRequest) {
    if (request.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Gerenciamento de usuários exclusivo do administrador');
    }
  }
}
