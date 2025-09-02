import { IsEmail, IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { UserStatus } from '../enums/user-status.enum';
export class UpdateUserDto {
    @IsNotEmpty()
    name: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    password: string;

    @IsNotEmpty()
    phoneNumber: string;

    @IsNotEmpty()
    @IsUUID()
    roleId: string;

    @IsNotEmpty()
    @IsEnum(UserStatus)
    status: UserStatus;

    defaultPassword?: string;
}


