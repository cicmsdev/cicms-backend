import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateContractorDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  phoneNumber: string;
}