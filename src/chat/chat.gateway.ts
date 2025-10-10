// src/chat/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import {
  UseGuards,
  UsePipes,
  ValidationPipe,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { WsJwtGuard } from 'src/ws-jwt.guard';
import { ChatService } from 'src/chat/chat.service';
import { JoinClaimDto, JoinDmDto, SendMessageDto, MarkReadDto } from './chat.dtos';

// If you want to type the user attached by WsJwtGuard:
type SocketUser = { id: string; email?: string; name?: string; role?: string };

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: ['http://localhost:3000'], // your Next dev URL
    credentials: true,
  },
})
@UseGuards(WsJwtGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() io!: Server;

  private readonly log = new Logger(ChatGateway.name);

  constructor(private readonly chat: ChatService) { }

  // --- lifecycle -------------------------------------------------------------

  handleConnection(client: Socket) {
    const u = (client as any).user as SocketUser | undefined;
    this.log.log(`WS connected ${client.id} ${u?.email ?? ''}`);
    client.emit('connected', { ok: true });
  }

  handleDisconnect(client: Socket) {
    this.log.log(`WS disconnected ${client.id}`);
  }

  // --- join claim room -------------------------------------------------------

  @SubscribeMessage('joinClaim')
  async onJoinClaim(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinClaimDto,
  ) {
    const user = (client as any).user as SocketUser;
    const { room, conversationKey } = await this.chat.joinClaimRoom(user, dto.claimId);
    client.join(room);

    const messages = await this.chat.listClaimMessages(user, dto.claimId, 50);
    client.emit('recent', { conversationKey, messages });
  }

  // --- join direct message room ---------------------------------------------

  @SubscribeMessage('joinDm')
  async onJoinDm(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinDmDto,
  ) {
    const user = (client as any).user as SocketUser;
    const { room, conversationKey } = await this.chat.joinDmRoom(user, dto.otherUserId);
    client.join(room);

    const messages = await this.chat.listDmMessages(user, dto.otherUserId, 50);
    client.emit('recent', { conversationKey, messages });
  }

  // --- send message (either claim or DM) ------------------------------------

  @SubscribeMessage('sendMessage')
  async onSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const user = (client as any).user as SocketUser;

    const isClaim = !!dto.claimId;
    const isDm = !!dto.otherUserId;
    if (isClaim === isDm) {
      throw new BadRequestException('Provide exactly one of claimId or otherUserId');
    }

    if (isClaim) {
      const saved = await this.chat.sendToClaim(user, dto.claimId!, dto.content);
      const conversationKey = `claim:${dto.claimId}`;
      this.io.to(`claim:${dto.claimId}`).emit('newMessage', { conversationKey, message: saved });
    } else {
      const otherId = dto.otherUserId!;
      const saved = await this.chat.sendDm(user, otherId, dto.content);
      const dmKey = `dm:${[user.id, otherId].sort().join(':')}`;
      this.io.to(dmKey).emit('newMessage', { conversationKey: dmKey, message: saved });
    }
  }

  // --- mark conversation as read & return unread ----------------------------

  @SubscribeMessage('markRead')
  async onMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: MarkReadDto,
  ) {
    const user = (client as any).user as SocketUser;
    await this.chat.markRead(user.id, dto.conversationKey);
    const unread = await this.chat.unreadCount(user.id, dto.conversationKey);
    client.emit('readOk', { conversationKey: dto.conversationKey, unread });
  }

  // --- optional: typing indicator (broadcast to room except sender) ---------

  @SubscribeMessage('typing')
  async onTyping(@ConnectedSocket() client: Socket, @MessageBody() body: { conversationKey: string; isTyping: boolean }) {
    const user = (client as any).user;
    const { conversationKey, isTyping } = body ?? {};
    if (!conversationKey || typeof isTyping !== 'boolean') throw new BadRequestException('conversationKey and isTyping required');
    const room = conversationKey; // claim:<id> or dm:<a>:<b>
    client.to(room).emit('userTyping', {
      conversationKey,
      user: { id: user.id, name: user.name },
      isTyping,
    });
  }


  // --- optional: guardrail against unhandled errors -------------------------

  @SubscribeMessage('ping')
  ping(@ConnectedSocket() client: Socket) {
    client.emit('pong', { t: Date.now() });
  }
}
