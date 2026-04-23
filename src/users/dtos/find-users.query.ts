// src/users/dtos/find-users.query.ts
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { UserStatus } from '@prisma/client';

export class FindUsersQuery {
  @IsOptional() @IsString() q?: string;

  @IsOptional() @IsUUID() roleId?: string;

  @IsOptional() @IsEnum(UserStatus)
  status?: UserStatus;                         // ✅ enum, not string

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')  // -> boolean
  defaultPw?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize = 10;

  @IsOptional() @IsString() sort?: string;
}
