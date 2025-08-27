import { IsEmail, IsUUID, IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';
export class CreateUserDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  OTP_number: string;

  @IsDateString()
  @IsOptional()
  OTP_life_time: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;  
  
  @IsNotEmpty()
  @IsUUID()
  roleId: string;
}