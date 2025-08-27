import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateRoleDto } from './dtos/create-role.dtos';
import { RoleService } from './role.service';

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
}