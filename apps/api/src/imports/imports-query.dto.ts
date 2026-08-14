import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ImportsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional()
  @IsIn(['UPLOADED', 'PROCESSING', 'READY_FOR_REVIEW', 'REVIEW_REQUIRED', 'APPROVED', 'FAILED'])
  status?:
    | 'UPLOADED'
    | 'PROCESSING'
    | 'READY_FOR_REVIEW'
    | 'REVIEW_REQUIRED'
    | 'APPROVED'
    | 'FAILED';
}
