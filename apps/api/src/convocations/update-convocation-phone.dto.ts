import { IsUUID } from 'class-validator';

export class UpdateConvocationPhoneDto {
  @IsUUID()
  phoneId!: string;
}
