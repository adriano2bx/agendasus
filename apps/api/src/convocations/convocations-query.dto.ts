import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ConvocationsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
  @IsOptional() @IsString() @MaxLength(180) query?: string;
  @IsOptional() @IsUUID() campaignId?: string;
  @IsOptional()
  @IsIn([
    'SCHEDULED',
    'QUEUED',
    'PROCESSING',
    'WAITING_RESPONSE',
    'CONFIRMED',
    'CANCELLED',
    'SEND_ERROR',
    'FINISHED_NO_RESPONSE',
  ])
  status?: string;
  @IsOptional() @IsIn(['FIRST', 'SECOND', 'THIRD', 'FINISHED']) stage?: string;
  @IsOptional() @IsString() @MaxLength(180) procedure?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateFrom?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateTo?: string;
}
