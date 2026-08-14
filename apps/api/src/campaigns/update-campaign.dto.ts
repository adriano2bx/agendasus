import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCampaignDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) name?: string;
  @IsOptional() @IsDateString() firstActionAt?: string;
  @IsOptional() @IsInt() @Min(1) @Max(30) secondIntervalDays?: number;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) secondStartTime?: string;
  @IsOptional() @IsInt() @Min(1) @Max(30) thirdIntervalDays?: number;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) thirdStartTime?: string;
}
