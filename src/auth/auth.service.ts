import { BadRequestException, Injectable, NotFoundException, HttpException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { JwtService } from '@nestjs/jwt';
import { AuthDto } from './dtos/auth-user.dto';
import * as bcrypt from 'bcrypt';
import { renderTemplate } from 'src/emails/renderTemplates';
import { sendEmail } from 'src/emails/send-email';
import { VerifyOtpDto } from './dtos/verify-otp.dtos';
import { ResendOtpDto } from './dtos/resend-otp.dtos';

@Injectable()
export class AuthService {
    constructor(
        private prisma: DatabaseService,
        private jwtService: JwtService,
    ) { }

    // find user by email
    async findUserByEmail(email: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { email: email },
                include: { role: true },
            });
            if (!user) {
                throw new NotFoundException('User Not Found');
            }

            return user;
        } catch (error) {
            console.error('Error finding user:', error);
            
            // If it's already an HttpException, re-throw it
            if (error instanceof HttpException) {
                throw error;
            }
            
            // For unexpected errors, throw a generic bad request
            throw new BadRequestException('Failed to find user. Please try again.');
        }
    }

    // generate OTP
    async generateOTP(email: string) {
        try {
            const otpValidityDuration = 5; // OTP validity duration in minutes
            const OTP_number = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
            const OTP_life_time = new Date(Date.now() + otpValidityDuration * 60000); // OTP expiration time
            await this.prisma.user.update({
                where: { email: email },
                data: {
                    OTP_number,
                    OTP_life_time,
                },
            });
            return { OTP_number, otpValidityDuration };
        } catch (error) {
            console.error('Error generating OTP:', error);
            throw new BadRequestException('Failed to generate OTP. Please try again.');
        }
    }

    // mask email
    private maskEmail(email: string): string {
        const [local, domain] = email.split('@');
        const visible = local.slice(0, 2);
        const masked = '*'.repeat(Math.max(local.length - 2, 6));
        return `${visible}${masked}@${domain}`;
    }

    // login
    async login(authDto: AuthDto) {
        try {
            // Find the user
            const user = await this.findUserByEmail(authDto.email);

            // validate user credentials here 
            const isMatch = await bcrypt.compare(authDto.password, user.password);

            if (!isMatch) {
                throw new BadRequestException('Invalid credentials');
            }

            // If default password → force change
            if (user.isDefaultPassword) {
                return {
                    message: 'Your password is default. Please change your password.',
                    userId: user.id,
                    email: user.email,
                    mustChangePassword: true,
                    role: user.role.name,
                };
            }
            
            // generate OTP if not default password
            const { OTP_number, otpValidityDuration } = await this.generateOTP(user.email);
            
            // Prepare email content
            const html = renderTemplate('otp-verification.html', {
                name: user.name,
                OTP: OTP_number,
                validMinutes: otpValidityDuration,
                year: new Date().getFullYear(),
            });
            
            // Try to send email
            try {
                await sendEmail({
                    to: user.email,
                    subject: 'Your OTP Code',
                    text: `Hello ${user.name}, Your OTP code is ${OTP_number}. It is valid for ${otpValidityDuration} minutes.
                    Do not share this code with anyone. If you did not request it, please ignore this message.

                    SODIMEX Team
                    `,
                    html,
                });
            } catch (emailError) {
                throw new BadRequestException('Failed to send OTP email. Please try again.');
            }

            const maskedEmail = this.maskEmail(user.email);

            return {
                message: `Enter 6 digits we sent to ${maskedEmail}`,
                userId: user.id,
                name: user.name,
                email: user.email,
                mustChangePassword: false,
                role: user.role.name,
            };
        } catch (error) {
            console.error('Error during login:', error);
            
            // If it's already an HttpException, re-throw it to preserve the original message
            if (error instanceof HttpException) {
                throw error;
            }
            
            throw new BadRequestException('Login failed. Please try again.');
        }
    }

    // verify OTP
    async verifyOTP(dto: VerifyOtpDto) {
        try {
            const user = await this.findUserByEmail(dto.email);

            const incoming = String(dto.otp).trim();

            // Ensure the user actually has a role
            if (!user.roleId) {
                throw new BadRequestException("User has no role assigned. Contact admin.");
            }

            // Lookup role name (once)
            const role = await this.prisma.role.findUnique({
                where: { id: user.roleId },
                select: { name: true },
            });
            if (!role?.name) {
                throw new BadRequestException("User role not found.");
            }

            // Atomically consume OTP (guards against reuse/race)
            const now = new Date();
            const consumed = await this.prisma.user.updateMany({
                where: {
                    email: dto.email,
                    OTP_number: incoming,
                    OTP_life_time: { gt: now },
                },
                data: {
                    OTP_number: null,
                    OTP_life_time: null,
                    lastLogin: now,
                },
            });

            if (consumed.count !== 1) {
                // wrong OTP, expired, or already used
                throw new BadRequestException("Invalid or expired OTP. Please try again.");
            }

            // 4) Sign JWT with BOTH role & roleId (matches your guard)
            const payload = {
                sub: user.id,
                email: user.email,
                name: user.name,
                role: role.name,     // e.g., "Contractor"
                roleId: user.roleId, // guard uses this
            };

            const access_token = await this.jwtService.signAsync(payload, { expiresIn: "1d" });

            return {
                message: "OTP verified successfully",
                access_token,
                user: { id: user.id, email: user.email, name: user.name, role: role.name },
            };
        } catch (error) {
            console.error('Error during OTP verification:', error);
            
            // If it's already an HttpException, re-throw it
            if (error instanceof HttpException) {
                throw error;
            }
            
            throw new BadRequestException("OTP verification failed. Please try again.");
        }
    }

    // resend OTP
    async resendOTP(resendOtpDto: ResendOtpDto) {
        try {
            // Find the user
            const user = await this.findUserByEmail(resendOtpDto.email);

            // generate new OTP
            const { OTP_number, otpValidityDuration } = await this.generateOTP(user.email);

            // Prepare email content
            const html = renderTemplate('otp-verification.html', {
                name: user.name,
                OTP: OTP_number,
                validMinutes: otpValidityDuration,
                year: new Date().getFullYear(),
            });

            // Try to send email
            try {
                await sendEmail({
                    to: user.email,
                    subject: 'Your OTP Code',
                    text: `Hello ${user.name}, Your OTP code is ${OTP_number}. It is valid for ${otpValidityDuration} minutes.
                    Do not share this code with anyone. If you did not request it, please ignore this message.

                    SODIMEX Team
                    `,
                    html,
                });
            } catch (emailError) {
                throw new BadRequestException('Failed to send OTP email. Please try again.');
            }

            const maskedEmail = this.maskEmail(user.email);

            return {
                message: `Enter 6 digits we sent to ${maskedEmail}`,
                userId: user.id,  // Also include userId here
            };
        } catch (error) {
            console.error('Error during resending OTP:', error);
            
            // If it's already an HttpException, re-throw it
            if (error instanceof HttpException) {
                throw error;
            }
            
            throw new BadRequestException('Resend OTP failed. Please try again.');
        }
    }
}