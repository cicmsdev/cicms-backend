import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateUserDto } from './dtos/CreateUserDtos';
import * as bcrypt from 'bcrypt';
import { renderTemplate } from 'src/emails/renderTemplates';
import { sendEmail } from 'src/emails/send-email';

@Injectable()
export class UsersService {
    constructor(private prisma: DatabaseService) { }

    // find all users
    async findAllUsers() {
        return await this.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                role: true,
                status: true,
                isDefaultPassword: true,
                lastLogin: true,
            }
        });
    }

    // check if user email exists
    async checkEmailExists(email: string) {
        const existingUserEmail = await this.prisma.user.findUnique({
            where: { email: email },
        });

        if (existingUserEmail) {
            throw new ConflictException(`Email ${email} already exists.`);
        }
    }

    // check user phone number exists
    async checkPhoneNumberExists(phoneNumber: string) {
        const existingUserPhoneNumber = await this.prisma.user.findUnique({
            where: { phoneNumber: phoneNumber },
        });

        if (existingUserPhoneNumber) {
            throw new ConflictException(`Phone number ${phoneNumber} already exists.`);
        }
    }

    // check if role id exists
    async checkRoleIdExists(roleId: string) {
        const existingRoleId = await this.prisma.role.findUnique({
            where: { id: roleId },
        });

        if (!existingRoleId) {
            throw new BadRequestException(`Role ID ${roleId} does not exist.`);
        }
    }

    //Generate a stronger password (8 characters with a mix of letters, numbers, and symbols)
    async generateDefaultPassword(): Promise<string> {
        const length = 10;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
        let password = '';
        for (let i = 0, n = charset.length; i < length; ++i) {
            password += charset.charAt(Math.floor(Math.random() * n));
        }
        return password;
    }

    async createUser(createUserDto: CreateUserDto) {
        try {
            // Check validations first
            await this.checkEmailExists(createUserDto.email);
            await this.checkPhoneNumberExists(createUserDto.phoneNumber);
            await this.checkRoleIdExists(createUserDto.roleId);

            const defaultPassword = await this.generateDefaultPassword();
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);



            // Create user
            await this.prisma.user.create({
                data: {
                    name: createUserDto.name,
                    email: createUserDto.email,
                    phoneNumber: createUserDto.phoneNumber,
                    roleId: createUserDto.roleId,
                    password: hashedPassword,
                }
            });

            // Prepare email content
            const html = renderTemplate('account-created.html', {
                name: createUserDto.name,
                defaultPassword,
                year: new Date().getFullYear(),
            });

            // Try to send email
            try {
                await sendEmail({
                    to: createUserDto.email,
                    subject: 'Your Account Has Been Created',
                    text: `Hello ${createUserDto.name}, Your account has been created. Temporary password: ${defaultPassword}`,
                    html,
                });
            } catch (emailError) {
                throw new BadRequestException('Failed to send email, user not created.');
            }

            return { message: `User created successfully. Temporary password: ${defaultPassword}` };

        } catch (error) {
            console.error('Error creating user:', error);

            // If it's already a known exception, re-throw it
            if (error instanceof ConflictException || error instanceof BadRequestException) {
                throw error;
            }

            // For unexpected errors, throw a generic bad request
            throw new BadRequestException('Failed to create user. Please try again.');
        }
    }
}
