import { ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateRoleDto } from './dtos/create-role.dtos';
import { Role } from '@prisma/client';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: DatabaseService) {}

  async create(createRoleDto: CreateRoleDto) {
    // Check if role name already exists
    const existingRole = await this.prisma.role.findUnique({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new ConflictException('Role Name Already Exists! Try Again');
    }

    // Save new role in database
    return this.prisma.role.create({
      data: {
        ...createRoleDto,
      },
    });
  }
  //find role from database depend on its id
  async findById(id: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { id },
    });
  }

  //Find all roles from database
  async findAll() {
    return this.prisma.role.findMany();
  }

}
