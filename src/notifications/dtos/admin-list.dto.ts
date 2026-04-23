// src/notifications/dtos/admin-list.dto.ts
import { Transform, Type } from 'class-transformer';
import { IsBooleanString, IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class AdminListNotificationsDto {
  @IsOptional() @Type(() => Number) @IsInt()
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt()
  limit?: number = 20;

  @IsOptional() @IsBooleanString()
  unreadOnly?: string;

  @IsOptional() @IsBooleanString()
  includeArchived?: string;

  @IsOptional() @IsString()
  userId?: string;          // filter: recipient

  @IsOptional() @IsString()
  actorId?: string;

  @IsOptional() @IsString()
  claimId?: string;

  @IsOptional() @IsString()
  messageId?: string;

  @IsOptional() @IsString()
  q?: string;               // free text (title/body/claim title/user/actor)

  @IsOptional() @IsString()
  dateFrom?: string;        // ISO date

  @IsOptional() @IsString()
  dateTo?: string;          // ISO date

  @IsOptional()
  @Transform(({ value }) =>
    String(value ?? '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)
  )
  types?: NotificationType[];

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'desc';
}
