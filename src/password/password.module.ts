import { Module } from '@nestjs/common';
import { PasswordService } from './password.service';
import { PasswordController } from './password.controller';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { RoleModule } from 'src/role/role.module';

@Module({
  imports: [
    RoleModule,
    ConfigModule,
    AuthModule,
    DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET, // environment variable
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [PasswordController],
  providers: [PasswordService],
})
export class PasswordModule {}
