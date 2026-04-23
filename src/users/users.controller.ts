// users.controller.ts
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/CreateUserDtos';
import { CreateContractorDto } from './dtos/create-contractor.dto';
import { JwtAuthGuard } from 'src/auth/middlewares/jwt-auth.guard';
import { RolesGuard } from 'src/auth/middlewares/roles.guard';
import { Roles } from 'src/auth/middlewares/roles.decorator';
import { FindUsersQuery } from './dtos/find-users.query';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Claim Manager")
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Post('create-contractor')
  createContractor(@Body() dto: CreateContractorDto) {
    return this.usersService.CreateuserContractor(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Claim Manager')
  findAll(@Query() query: FindUsersQuery) {
    return this.usersService.findUsers(query);
  }
}


