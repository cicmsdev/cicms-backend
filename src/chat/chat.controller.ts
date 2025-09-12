import { Controller, Get, Param, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/middlewares/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CurrentUser } from 'src/auth/middlewares/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
    constructor(private readonly chat: ChatService) { }

    // Claim history (SSR/initial load)
    @Get('claims/:claimId/messages')
    async claimHistory(@Req() req: any, @Param('claimId') claimId: string, @Query('limit') limit?: string) {
        return this.chat.listClaimMessages(req.user, claimId, Number(limit) || 50);
    }

    // DM history
    @Get('dm/:otherUserId/messages')
    async dmHistory(@Req() req: any, @Param('otherUserId') otherUserId: string, @Query('limit') limit?: string) {
        return this.chat.listDmMessages(req.user, otherUserId, Number(limit) || 50);
    }

    // Unread for one conversation
    @Get('unread')
    async unread(@Req() req: any, @Query('key') conversationKey: string) {
        if (!conversationKey) throw new BadRequestException('key required');
        return { key: conversationKey, count: await this.chat.unreadCount(req.user.id, conversationKey) };
    }

    @Get('contacts')
    async listContacts(
        @CurrentUser() user: { sub: string },
        @Query('search') search?: string,
        @Query('limit') limitStr?: string,
    ) {
        const limit = Number.isFinite(Number(limitStr)) ? Number(limitStr) : 20;
        const contacts = await this.chat.listDmContacts(user.sub, { search, limit });
        // shape for the UI Peer type
        return contacts.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role, // 👈
        }));

    }


    @Get('recent')
    async recent(@Req() req: any, @Query('limit') limit?: string) {
        const n = Number(limit);
        const rows = await this.chat.listRecentConversations(req.user, Number.isFinite(n) ? n : 20);
        return { data: rows };
    }
}
