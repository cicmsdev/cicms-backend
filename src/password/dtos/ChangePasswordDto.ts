import { IsNotEmpty, IsString, MinLength, IsEmail } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  old_password: string; // Current password user is using

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  new_password: string; // New password user wants to set

  @IsString()
  @IsNotEmpty()
  confirm_new_password: string; // Confirm new password
}
