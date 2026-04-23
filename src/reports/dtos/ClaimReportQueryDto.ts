import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { ClaimStatus, ClaimType } from '@prisma/client';

export class ClaimReportQueryDto {
  @IsOptional()
  @IsEnum(ClaimStatus)
  status?: ClaimStatus;

  @IsOptional()
  @IsEnum(ClaimType)
  claimType?: ClaimType;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
