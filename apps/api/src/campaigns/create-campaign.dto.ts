import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsDateString()
  firstActionAt!: string;

  @IsInt()
  @Min(0)
  @Max(30)
  secondIntervalDays!: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  secondStartTime!: string;

  @IsInt()
  @Min(0)
  @Max(30)
  thirdIntervalDays!: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  thirdStartTime!: string;
}
