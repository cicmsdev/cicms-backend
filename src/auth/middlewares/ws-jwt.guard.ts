// src/auth/ws-jwt.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

type JwtPayload = {
  sub: string;
  email: string;
  name?: string;
  role?: string; // "Admin" | "Claim Manager" | "Insurance Representative" | "Contractor" | "Evaluator"
};

function extractTokenFromSocket(client: Socket): string | null {
  // Prefer handshake.auth.token (Socket.IO standard), fallback to Authorization header or cookie
  const fromAuth = (client.handshake.auth as any)?.token;
  if (typeof fromAuth === 'string' && fromAuth.trim()) return fromAuth;

  const authHeader = client.handshake.headers?.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // OPTIONAL: cookie support (if you set one named "access_token")
  const cookie = client.handshake.headers?.cookie;
  if (typeof cookie === 'string') {
    const match = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('access_token='));
    if (match) return decodeURIComponent(match.split('=')[1]);
  }

  return null;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const token = extractTokenFromSocket(client);
    if (!token) throw new UnauthorizedException('Missing token');

    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      // Attach a normalized user to the socket for downstream use
      (client as any).user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role, // simple string role is enough (you’ll DB-check company when needed)
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
