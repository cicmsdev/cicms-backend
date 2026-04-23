// src/notifications/notifications.gateway.ts
import {
  WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect,
  SubscribeMessage, MessageBody, ConnectedSocket, WsResponse,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { WsJwtGuard } from 'src/ws-jwt.guard';

@WebSocketGateway({
  cors: { origin: ['http://localhost:3000'], credentials: true },
  namespace: '/ws/notifications', // optional namespace
})
@UseGuards(WsJwtGuard) // <-- protects connect + all handlers
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  async handleConnection(client: Socket) {
  const user = (client as any).user as { id?: string } | undefined;

  // The guard should prevent this, but be defensive:
  if (!user?.id) {
    // don't throw here — it can bring the process down during handshake
    client.emit('error', 'unauthorized');
    client.disconnect(true);
    return;
  }

  client.join(`user:${user.id}`);
}

  async handleDisconnect(_client: Socket) {
    // optional: presence cleanup
  }

  // Example echo/health handler (protected)
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data?: any): WsResponse<any> {
    const user = (client as any).user;
    return { event: 'pong', data: { ok: true, userId: user?.id, echo: data ?? null } };
  }

  // Helper for your service to push to users
  notifyUsers(userIds: string[], event: string, payload: any) {
    for (const uid of userIds) {
      this.server.to(`user:${uid}`).emit(event, payload);
    }
  }
}
