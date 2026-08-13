import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { environment } from '../environment.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { BootstrapAdminService } from './bootstrap-admin.service.js';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: environment().JWT_SECRET,
      signOptions: { expiresIn: environment().JWT_EXPIRES_IN as never },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, BootstrapAdminService],
  exports: [AuthGuard],
})
export class AuthModule {}
