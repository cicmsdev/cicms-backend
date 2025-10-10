
import { IsOptional, IsEnum, IsISO8601, IsUUID, IsIn } from 'class-validator';
import { ClaimStatus } from '@prisma/client';

export class QueryClaimsReportDto {
  @IsOptional() @IsISO8601()
  dateFrom?: string;

  @IsOptional() @IsISO8601()
  dateTo?: string;

  @IsOptional() @IsEnum(ClaimStatus)
  status?: ClaimStatus;

  @IsOptional() @IsUUID()
  companyId?: string;

  @IsOptional() @IsUUID()
  evaluatorId?: string;

  @IsOptional() @IsIn(['json', 'csv'])
  format?: 'json' | 'csv';
}
