import { ConflictException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateRoleDto } from './dtos/create-role.dtos';
import { UpdateRoleDto } from './dtos/update-role.dto';
import { Role } from '@prisma/client';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: DatabaseService) {}

  async create(createRoleDto: CreateRoleDto) {
    const existingRole = await this.prisma.role.findUnique({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new ConflictException('Role Name Already Exists! Try Again');
    }

    return this.prisma.role.create({
      data: { ...createRoleDto },
    });
  }

  async findById(id: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { id },
    });
  }

  async findAll() {
    try {
      const roles = await this.prisma.role.findMany({
        select: {
          id: true,
          name: true,
          created_at: true,
          updated_at: true,
        },
      });

      return {
        message: 'Roles retrieved successfully',
        data: roles,
        count: roles.length,
      };
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw new InternalServerErrorException('Failed to retrieve roles');
    }
  }


  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    try {
      const role = await this.prisma.role.findUnique({ where: { id } });

      if (!role) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }

      // Prevent duplicate role names
      if (updateRoleDto.name && updateRoleDto.name !== role.name) {
        const nameExists = await this.prisma.role.findUnique({
          where: { name: updateRoleDto.name },
        });
        if (nameExists) {
          throw new ConflictException('Role name already exists');
        }
      }

      return this.prisma.role.update({
        where: { id },
        data: { ...updateRoleDto },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      console.error('Error updating role:', error);
      throw new InternalServerErrorException('Failed to update role');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const role = await this.prisma.role.findUnique({ where: { id } });

      if (!role) {
        throw new NotFoundException(`Role with ID ${id} not found`);
      }

      await this.prisma.role.delete({ where: { id } });

      return { message: `Role with ID ${id} deleted successfully` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error deleting role:', error);
      throw new InternalServerErrorException('Failed to delete role');
    }
  }
}
