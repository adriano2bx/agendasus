import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class BillingQueryDto {
  @IsOptional() @IsISO8601() dateFrom?: string;
  @IsOptional() @IsISO8601() dateTo?: string;
  @IsOptional() @IsUUID() campaignId?: string;
  @IsOptional() @IsUUID() messageId?: string;
  @IsOptional() @IsString() providerMessageId?: string;
  @IsOptional() @IsIn(['FIRST', 'SECOND', 'THIRD']) stage?: 'FIRST' | 'SECOND' | 'THIRD';
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() billable?: boolean;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(250) limit = 50;
  @IsOptional() @IsIn(['billingAt', 'cost', 'createdAt']) sortBy: 'billingAt' | 'cost' | 'createdAt' = 'billingAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'desc';
}
