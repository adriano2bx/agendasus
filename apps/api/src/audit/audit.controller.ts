import { Controller, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { AuditQueryDto } from './audit-query.dto.js';
import { AuditService } from './audit.service.js';

@Controller('audit')
@UseGuards(AuthGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() query: AuditQueryDto, @Req() request: AuthenticatedRequest) {
    if (request.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Auditoria exclusiva do administrador');
    }
    return this.audit.list(query);
  }
}
