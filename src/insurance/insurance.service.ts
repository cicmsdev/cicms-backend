import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateInsuranceDto } from './dto/create-insurance.dto';
import { UpdateInsuranceDto } from './dto/update-insurance.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class InsuranceService {
  constructor(private prisma: DatabaseService) { }

    async checkCompanyName(createInsuranceDto: CreateInsuranceDto) {
  const existingCompany = await this.prisma.insuranceCompany.findUnique({
    where: { name: createInsuranceDto.name },
  });

  if (existingCompany) {
    throw new ConflictException('Insurance company name already exists');
  }
}

// Check if contact email already exists
async checkCompanyEmail(createInsuranceDto: CreateInsuranceDto) {
  const existingEmail = await this.prisma.insuranceCompany.findUnique({
    where: { email: createInsuranceDto.email },
  });

  if (existingEmail) {
    throw new ConflictException('Contact email already exists');
  }
}

async createInsurance(createInsuranceDto: CreateInsuranceDto) {
  try {
    // Check for duplicate name and email
    await this.checkCompanyName(createInsuranceDto);
    await this.checkCompanyEmail(createInsuranceDto);

    // Create new insurance company
    await this.prisma.insuranceCompany.create({
      data: {
        ...createInsuranceDto,
      },
    });
    
    return { message: 'Insurance Created Successfully' };
  } catch (error) {
    // If it's already a ConflictException, just rethrow it
    if (error instanceof ConflictException) {
      throw error;
    }    
    // Log unexpected errors for debugging
    console.error('Error creating insurance company:', error);
    throw new InternalServerErrorException('Failed to create insurance company');
  }
}

  async findAll() {
    try {
      const insuranceCompanies = await this.prisma.insuranceCompany.findMany({
        select: {
          companyId: true,
          name: true,
          email: true,
          policyNumberPrefix: true,
          // Include any other fields you want to return
        }
      });
      
      return {
        message: 'Insurance companies retrieved successfully',
        data: insuranceCompanies,
        count: insuranceCompanies.length
      };
    } catch (error) {
      console.error('Error fetching insurance companies:', error);
      throw new InternalServerErrorException('Failed to retrieve insurance companies');
    }
  }

  async findOne(id: string) {
  try {
    const insuranceCompany = await this.prisma.insuranceCompany.findUnique({
      where: { companyId: id },
      select: {
        companyId: true,
        name: true,
        email: true, // or contactEmail depending on your schema
        policyNumberPrefix: true,
        
        // Include other fields you want to return
      }
    });

    if (!insuranceCompany) {
      throw new NotFoundException(`Insurance company with ID ${id} not found`);
    }

    return {
      message: 'Insurance company retrieved successfully',
      data: insuranceCompany
    };
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw error;
    }
    
    console.error('Error fetching insurance company:', error);
    throw new InternalServerErrorException('Failed to retrieve insurance company');
  }
}

  async updateInsurance(id: string, updateInsuranceDto: UpdateInsuranceDto) {
    try {
      const existingCompany = await this.prisma.insuranceCompany.findUnique({
        where: { companyId: id },
      });

      if (!existingCompany) {
        throw new NotFoundException(
          `Insurance company with ID ${id} not found`,
        );
      }

      // Check if updating name or email conflicts with another record
      if (
        updateInsuranceDto.name &&
        updateInsuranceDto.name !== existingCompany.name
      ) {
        const nameTaken = await this.prisma.insuranceCompany.findUnique({
          where: { name: updateInsuranceDto.name },
        });
        if (nameTaken) {
          throw new ConflictException('Insurance company name already exists');
        }
      }

      if (
        updateInsuranceDto.email &&
        updateInsuranceDto.email !== existingCompany.email
      ) {
        const emailTaken = await this.prisma.insuranceCompany.findUnique({
          where: { email: updateInsuranceDto.email },
        });
        if (emailTaken) {
          throw new ConflictException('Contact email already exists');
        }
      }

      const updatedCompany = await this.prisma.insuranceCompany.update({
        where: { companyId: id },
        data: { ...updateInsuranceDto },
      });

      return {
        message: 'Insurance company updated successfully',
        data: updatedCompany,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      console.error('Error updating insurance company:', error);
      throw new InternalServerErrorException(
        'Failed to update insurance company',
      );
    }
  }

  async removeInsurance(id: string) {
    try {
      const existingCompany = await this.prisma.insuranceCompany.findUnique({
        where: { companyId: id },
      });

      if (!existingCompany || !existingCompany.isActive) {
        throw new NotFoundException(
          `Insurance company with ID ${id} not found`,
        );
      }

      // Soft delete → set isActive = false
      await this.prisma.insuranceCompany.update({
        where: { companyId: id },
        data: { isActive: false },
      });

      return {
        message: 'Insurance company deactivated successfully',
        data: { companyId: id },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error deactivating insurance company:', error);
      throw new InternalServerErrorException(
        'Failed to deactivate insurance company',
      );
    }
  }

  async restoreInsurance(id: string) {
    try {
      const existingCompany = await this.prisma.insuranceCompany.findUnique({
        where: { companyId: id },
      });

      if (!existingCompany || existingCompany.isActive) {
        throw new NotFoundException(
          `Insurance company with ID ${id} is not deleted or does not exist`,
        );
      }

      await this.prisma.insuranceCompany.update({
        where: { companyId: id },
        data: { isActive: true },
      });

      return {
        message: 'Insurance company restored successfully',
        data: { companyId: id },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error restoring insurance company:', error);
      throw new InternalServerErrorException(
        'Failed to restore insurance company',
      );
    }
  }
}
