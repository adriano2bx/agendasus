import { IsDateString, IsInt, IsNotEmpty, IsString, Matches, Max, Min } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsDateString()
  firstActionAt!: string;

  @IsInt()
  @Min(1)
  @Max(30)
  secondIntervalDays!: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  secondStartTime!: string;

  @IsInt()
  @Min(1)
  @Max(30)
  thirdIntervalDays!: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  thirdStartTime!: string;
}

