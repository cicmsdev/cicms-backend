// src/notifications/notifications.controller.ts
import { Body, Controller, Get, Header, Param, Patch, Query, Req, UnauthorizedException, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from 'src/auth/middlewares/current-user.decorator';

import { ListNotificationsQueryDto } from './dtos/list-notifications.dto';
import { MarkReadDto } from './dtos/mark-read.dto';
import { MarkAllReadDto } from './dtos/mark-all-read.dto';
import { ArchiveDto } from './dtos/archive.dto';
import { UnreadByClaimQueryDto } from './dtos/unread-by-claim.dto';
import { JwtAuthGuard } from 'src/auth/middlewares/jwt-auth.guard';
import { AdminListNotificationsDto } from './dtos/admin-list.dto';
import { RolesGuard } from 'src/auth/middlewares/roles.guard';
import { Roles } from 'src/auth/middlewares/roles.decorator';


@Controller('notifications')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class NotificationsController {
  constructor(private readonly service: NotificationsService) { }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: { sub: string; id?: string } | undefined) {
    if (!user) throw new UnauthorizedException('Missing user');
    const userId = user.sub ?? user.id!;
    const count = await this.service.getUnreadCount(userId);
    return { count };
  }

  @Patch('mark-read')
  async markRead(
    @CurrentUser() user: { sub: string; id?: string } | undefined,
    @Body() body: MarkReadDto,
  ) {
    if (!user) throw new UnauthorizedException('Missing user');
    const userId = user.sub ?? user.id!;
    const updated = await this.service.markManyAsRead(userId, body.ids);
    return { updated }; // { updated: string[] }
  }

  @Patch(':id/mark-read')
  async markOne(
    @CurrentUser() user: { sub: string; id?: string } | undefined,
    @Param('id') id: string,
  ) {
    if (!user) throw new UnauthorizedException('Missing user');
    const userId = user.sub ?? user.id!;
    const ok = await this.service.markOneAsRead(userId, id);
    return { updated: ok ? [id] : [] };
  }

  @Patch('mark-all-read')
  async markAll(@CurrentUser() user: { sub: string; id?: string } | undefined) {
    if (!user) throw new UnauthorizedException('Missing user');
    const userId = user.sub ?? user.id!;
    const count = await this.service.markAllAsRead(userId);
    return { updated: count }; // { updated: number }
  }

  @Patch('archive')
  async archiveMany(
    @CurrentUser() user: { sub: string; id?: string } | undefined,
    @Body() body: ArchiveDto,
  ) {
    if (!user) throw new UnauthorizedException('Missing user');
    const userId = user.sub ?? user.id!;
    const updated = await this.service.archiveMany(userId, body.ids);
    return { updated }; // { updated: string[] }
  }

  @Patch(':id/archive')
  async archiveOne(
    @CurrentUser() user: { sub: string; id?: string } | undefined,
    @Param('id') id: string,
  ) {
    if (!user) throw new UnauthorizedException('Missing user');
    const userId = user.sub ?? user.id!;
    const ok = await this.service.archiveOne(userId, id);
    return { updated: ok ? [id] : [] };
  }
  // @Get()
  // async listForClaim(
  //   @Param('claimId') claimId: string,
  //   @Req() req: any, // assume req.user.id from auth guard
  //   @Query('page') page?: string,
  //   @Query('limit') limit?: string,
  //   @Query('unreadOnly') unreadOnly?: string,
  // ) {
  //   const userId = req.user.id;
  //   return this.service.getClaimNotificationsForUser(claimId, userId, {
  //     page: page ? Number(page) : undefined,
  //     limit: limit ? Number(limit) : undefined,
  //     unreadOnly: unreadOnly === 'true',
  //     // addressedOnly default = true (safest)
  //   });
  // }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async listMine(
    @CurrentUser() user: { sub: string } | undefined,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('includeArchived') includeArchived?: string,
    @Query('claimId') claimId?: string,
    @Query('types') typesCsv?: string, // e.g. "CLAIM_STATUS_CHANGED,DOCUMENT_ADDED"
  ) {
    if (!user?.sub) throw new UnauthorizedException('Missing user');
    const types = typesCsv
      ? typesCsv.split(',').map(s => s.trim()).filter(Boolean) as any[]
      : undefined;

    return this.service.getNotificationsByUser(user.sub, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      unreadOnly: unreadOnly === 'true',
      includeArchived: includeArchived === 'true',
      claimId,
      types,
    });
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Claim Manager')
  async listAllAdmin(
    @CurrentUser() user: { sub: string } | undefined,
    @Query() query: AdminListNotificationsDto,
  ) {
    if (!user?.sub) throw new UnauthorizedException('Missing user');
    return this.service.getAllNotificationsAdmin(user.sub, query);
  }

}
