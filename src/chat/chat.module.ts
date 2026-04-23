// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { AuthModule } from 'src/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module'; 
import { ChatController } from './chat.controller';

@Module({
  imports: [AuthModule, DatabaseModule], 
  providers: [ChatGateway, ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
