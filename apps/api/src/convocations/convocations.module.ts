import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ConvocationsController } from './convocations.controller.js';
import { ConvocationsService } from './convocations.service.js';

@Module({ imports: [AuthModule], controllers: [ConvocationsController], providers: [ConvocationsService] })
export class ConvocationsModule {}

