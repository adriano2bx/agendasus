import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class ReportsQueryDto {
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'A data inicial deve estar no formato AAAA-MM-DD' })
  dateFrom?: string;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'A data final deve estar no formato AAAA-MM-DD' })
  dateTo?: string;

  @IsOptional()
  @IsUUID('4', { message: 'A campanha informada é inválida' })
  campaignId?: string;

  @IsOptional() @IsIn(['FIRST', 'SECOND', 'THIRD']) stage?: 'FIRST' | 'SECOND' | 'THIRD';
  @IsOptional()
  @IsIn(['QUEUED', 'PROCESSING', 'SUBMITTED', 'SENT', 'DELIVERED', 'READ', 'FAILED'])
  status?: string;
  @IsOptional() @IsString() @MaxLength(180) procedure?: string;
}
