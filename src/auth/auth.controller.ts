import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dtos/auth-user.dto';
import { VerifyOtpDto } from './dtos/verify-otp.dtos';
import { ResendOtpDto } from './dtos/resend-otp.dtos';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

   @Post('login')
  login(@Body() authDto: AuthDto) {
    return this.authService.login(authDto);
  }

  @Post('verify-otp')
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOTP(verifyOtpDto);
  }
  @Post('resend-otp')
  async resendOtp(@Body() resendOtp: ResendOtpDto) {
    return this.authService.resendOTP(resendOtp);
  }
}
