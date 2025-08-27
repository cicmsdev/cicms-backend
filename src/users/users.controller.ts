import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/CreateUserDtos';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('create')
  create(@Body() createUserDto: CreateUserDto)  {
    return this.usersService.createUser(createUserDto);
  }
}
