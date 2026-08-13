import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString() name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(12) password!: string;
  @IsEnum(['ADMIN', 'OPERATOR']) role!: 'ADMIN' | 'OPERATOR';
}

