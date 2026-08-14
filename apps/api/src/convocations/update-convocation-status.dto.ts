import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateConvocationStatusDto {
  @IsIn(['CONFIRMED', 'CANCELLED'])
  status!: 'CONFIRMED' | 'CANCELLED';

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
