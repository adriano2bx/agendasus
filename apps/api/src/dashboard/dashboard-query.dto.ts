import { IsOptional, IsUUID, Matches } from 'class-validator';

export class DashboardQueryDto {
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateFrom?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateTo?: string;
  @IsOptional() @IsUUID() campaignId?: string;
}
