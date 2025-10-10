import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';


export class AnalyticsQueryDto {
@IsOptional() @IsISO8601()
from?: string; // ISO date string (inclusive)


@IsOptional() @IsISO8601()
to?: string; // ISO date string (inclusive)


@IsOptional() @IsIn(['day', 'week', 'month'])
granularity?: 'day' | 'week' | 'month' = 'day';


@IsOptional() @IsString()
companyId?: string;


@IsOptional() @IsString()
evaluatorId?: string;
}


export type StatusCount = { status: string; count: number };
export type TrendPoint = { period: string; count: number };
export type CompanyCount = { companyId: string; name: string; count: number };
export type EvaluatorWork = { evaluatorId: string | null; name: string; open: number; inEvaluation: number };


export type AnalyticsOverview = {
totals: Record<string, number> & { all: number };
submissionsTrend: TrendPoint[];
byCompany: CompanyCount[];
evaluatorWorkload: EvaluatorWork[];
};