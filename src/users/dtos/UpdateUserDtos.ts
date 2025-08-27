import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { RoleType } from '../enums/role-type.enum';
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
    @IsEnum(RoleType)
    roleType: RoleType;

    @IsNotEmpty()
    @IsEnum(UserStatus)
    status: UserStatus;

    defaultPassword?: string;
}


