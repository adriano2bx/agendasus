import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveImportDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

