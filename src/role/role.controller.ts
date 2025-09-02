import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateRoleDto } from './dtos/create-role.dtos';
import { RoleService } from './role.service';
import { UpdateRoleDto } from './dtos/update-role.dto';

@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post('create')
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }
  @Get('all')
  findAll() {
    return this.roleService.findAll();
  }

   @Patch(':id')
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.update(id, updateRoleDto);
  }

  // Delete role by ID
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roleService.remove(id);
  }
  
}