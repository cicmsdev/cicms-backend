import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DatabaseModule } from '../database/database.module';
import { RoleModule } from 'src/role/role.module';

@Module({
  imports: [DatabaseModule, RoleModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
