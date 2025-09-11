import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateUserDto } from './dtos/CreateUserDtos';
import * as bcrypt from 'bcrypt';
import { renderTemplate } from 'src/emails/renderTemplates';
import { sendEmail } from 'src/emails/send-email';
import { $Enums, Prisma } from '@prisma/client';
import { CreateContractorDto } from './dtos/create-contractor.dto';
import { ListEvaluatorsDto } from 'src/claim/dtos/list-evaluators.dto';

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

    // find role id by name "Contractor"
    async getContractorRoleId(name: string) {
        try {
            const role = await this.prisma.role.findUnique({
                where: { name: 'Contractor' },
                select: { id: true },
            });
            if (!role) {
                throw new BadRequestException('Role name "Contractor" does not exist.');
            }
            return role.id;
        } catch (error) {
            console.error('Error finding Contractor role:', error);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException('Failed to find Contractor role.');
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

    async CreateuserContractor(dto: CreateContractorDto) {
        try {
            // Check validations first
            await this.checkEmailExists(dto.email);
            await this.checkPhoneNumberExists(dto.phoneNumber);
            const contractorRoleId = await this.getContractorRoleId('Contractor');

            const defaultPassword = await this.generateDefaultPassword();
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

            // Create user
            await this.prisma.user.create({
                data: {
                    name: dto.name,
                    email: dto.email,
                    phoneNumber: dto.phoneNumber,
                    roleId: contractorRoleId,
                    password: hashedPassword,
                }
            });


            // Prepare email content
            const html = renderTemplate('account-created.html', {
                name: dto.name,
                defaultPassword,
                year: new Date().getFullYear(),
            });

            // Try to send email
            try {
                await sendEmail({
                    to: dto.email,
                    subject: 'Your Account Has Been Created',
                    text: `Hello ${dto.name}, Your account has been created. Temporary password: ${defaultPassword}`,
                    html,
                });
            } catch (emailError) {
                throw new BadRequestException('Failed to send email, user not created.');
            }

            return { message: `User created successfully. Temporary password: ${defaultPassword}` };

        } catch (error) {
            console.error('Error creating contractor user:', error);
            throw new BadRequestException('Failed to create contractor user. Please try again.');

        }
    }

    async createUser(createUserDto: CreateUserDto) {
    try {
        // Validate email and phone
        await this.checkEmailExists(createUserDto.email);
        await this.checkPhoneNumberExists(createUserDto.phoneNumber);

        // Fetch role and ensure it exists
        const role = await this.prisma.role.findUnique({ where: { id: createUserDto.roleId } });
        if (!role) {
            throw new BadRequestException(`Role with ID ${createUserDto.roleId} does not exist.`);
        }

        // If the user is an insurance representative, ensure insuranceCompanyId is provided
        if (role.name === 'Insurance Representative' && !createUserDto.insuranceCompanyId) {
            throw new BadRequestException('Insurance representative must be assigned to an insurance company.');
        }

        // Generate default password
        const defaultPassword = await this.generateDefaultPassword();
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        // Create user using unchecked input to allow FK directly
        const newUser = await this.prisma.user.create({
            data: {
                name: createUserDto.name,
                email: createUserDto.email,
                phoneNumber: createUserDto.phoneNumber,
                roleId: createUserDto.roleId,
                password: hashedPassword,
                insuranceCompanyId: createUserDto.insuranceCompanyId ?? null,
            } as Prisma.UserUncheckedCreateInput,
        });

        // Prepare and send email
        const html = renderTemplate('account-created.html', {
            name: createUserDto.name,
            defaultPassword,
            year: new Date().getFullYear(),
        });

        await sendEmail({
            to: createUserDto.email,
            subject: 'Your Account Has Been Created',
            text: `Hello ${createUserDto.name}, Your account has been created. Temporary password: ${defaultPassword}`,
            html,
        });

        return { message: `User created successfully. Temporary password: ${defaultPassword}`, userId: newUser.id };
    } catch (error) {
        console.error('Error creating user:', error);
        if (error instanceof ConflictException || error instanceof BadRequestException) throw error;
        throw new BadRequestException('Failed to create user. Please try again.');
    }
}






}
