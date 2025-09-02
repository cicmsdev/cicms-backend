import { 
  IsString, 
  IsEmail, 
  IsNotEmpty,
} from 'class-validator';

export class CreateInsuranceDto {

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    policyNumberPrefix: string;


}
