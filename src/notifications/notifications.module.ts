// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsGateway } from './notifications.gateway';
import { WsJwtGuard } from '../ws-jwt.guard';
import { DatabaseModule } from 'src/database/database.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { RoleModule } from 'src/role/role.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: { algorithm: 'HS256' }, // match your HTTP tokens
    }),
    DatabaseModule,
    RoleModule
  ],
  providers: [NotificationsGateway, NotificationsService, WsJwtGuard],
  exports: [NotificationsService],
  controllers: [NotificationsController], 
})
export class NotificationsModule {}
