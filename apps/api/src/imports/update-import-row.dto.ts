import { IsArray, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateImportRowDto {
  @IsOptional() @IsString() @MaxLength(40) codigoConvocacaoOrigem?: string;
  @IsOptional() @IsString() @MaxLength(180) nome?: string;
  @IsOptional() @Matches(/^\d{2}\/\d{2}\/\d{4}$/) dataNascimento?: string;
  @IsOptional() @IsString() @MaxLength(20) cpf?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) telefones?: string[];
  @IsOptional() @Matches(/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}$/) dataHora?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) procedimentos?: string[];
  @IsOptional() @IsString() @MaxLength(30) selectedPhone?: string;
}
