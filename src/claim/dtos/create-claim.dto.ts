
import { IsUUID, IsString, MaxLength, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ClaimType } from '@prisma/client';

export class CreateClaimDto {
  @IsUUID()
  companyId: string;

  @IsString()
  @MaxLength(25)
  @Transform(({ value }) => value?.trim())
  claimTitle: string;

  @IsEnum(ClaimType, { message: 'Invalid claim type' })
  claimType: ClaimType; 
}
