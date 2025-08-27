import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { RoleModule } from './role/role.module';
import { AuthModule } from './auth/auth.module';
import { PasswordModule } from './password/password.module';

@Module({
  imports: [DatabaseModule, UsersModule, RoleModule, AuthModule, PasswordModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
