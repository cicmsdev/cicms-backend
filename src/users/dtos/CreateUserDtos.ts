import { IsEmail, IsUUID, IsNotEmpty, IsString, IsOptional, IsDateString, MinLength } from 'class-validator';
export class CreateUserDto {
  @IsString()
  @MinLength(6)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(10)
  phoneNumber: string;

  @IsUUID()
  roleId: string;

  @IsOptional()
  @IsUUID()
  insuranceCompanyId?: string;
}