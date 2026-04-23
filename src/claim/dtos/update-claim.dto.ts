// update-claim.dto.ts
import { IsOptional, IsString, IsUUID, MaxLength, IsEnum } from 'class-validator';
import { ClaimType } from '@prisma/client';

export class UpdateClaimDto {
  @IsOptional()
  @IsString()
  @MaxLength(25)
  claimTitle?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsEnum(ClaimType, { message: 'Invalid claim type' })
  claimType?: ClaimType;
}
