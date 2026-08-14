import { IsOptional, IsUUID, Matches } from 'class-validator';

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
}
