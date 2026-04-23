import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListNotificationsQueryDto {
  @IsOptional()
  @Transform(({ value }) => String(value))
  cursor?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  unreadOnly?: boolean = false;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => (value === undefined ? 20 : parseInt(value, 10)))
  take?: number = 20;

  @IsOptional()
  @IsUUID()
  claimId?: string;
}