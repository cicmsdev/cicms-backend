import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { RoleModule } from './role/role.module';
import { AuthModule } from './auth/auth.module';
import { PasswordModule } from './password/password.module';
import { InsuranceModule } from './insurance/insurance.module';

@Module({
  imports: [DatabaseModule, UsersModule, RoleModule, AuthModule, PasswordModule, InsuranceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
