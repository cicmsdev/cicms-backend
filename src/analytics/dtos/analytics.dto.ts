import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';
import { ClaimStatus, ClaimType } from '@prisma/client';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  granularity?: 'day' | 'week' | 'month' = 'day';

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  evaluatorId?: string;

  /* ✅ MUST BE INSIDE THE CLASS */
  @IsOptional()
  @IsIn([
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'IN_EVALUATION',
    'RESOLVED',
    'RESOLVED_IN_COURT',
    'PAYED',
  ])
  status?: ClaimStatus;

  @IsOptional()
  @IsIn([
    'MATERIAL_DAMAGE',
    'EQUIPMENT_DAMAGE',
    'WORKSITE_ACCIDENT',
    'STRUCTURAL_FAILURE',
    'FIRE',
    'NATURAL_DISASTER',
    'ACCIDENT',
  ])
  claimType?: ClaimType;
}

/* ===== Analytics result types (these are fine) ===== */

export type StatusCount = { status: string; count: number };
export type TrendPoint = { period: string; count: number };
export type CompanyCount = { companyId: string; name: string; count: number };
export type EvaluatorWork = {
  evaluatorId: string | null;
  name: string;
  open: number;
  inEvaluation: number;
};

export type AnalyticsOverview = {
  totals: Record<string, number> & { all: number };
  submissionsTrend: TrendPoint[];
  byCompany: CompanyCount[];
  evaluatorWorkload: EvaluatorWork[];
};
