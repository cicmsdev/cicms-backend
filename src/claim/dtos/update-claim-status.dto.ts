import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum InsuranceAllowedStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum EvaluatorAllowedStatus {
  IN_EVALUATION = 'IN_EVALUATION',
  RESOLVED = 'RESOLVED',
  RESOLVED_IN_COURT = 'RESOLVED_IN_COURT',
}

/** Used only by Insurance Representatives */
export class UpdateInsuranceClaimStatusDto {
  @IsEnum(InsuranceAllowedStatus, {
    message: 'Status must be APPROVED or REJECTED',
  })
  status: InsuranceAllowedStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/** Used only by Evaluators */
export class UpdateEvaluatorClaimStatusDto {
  @IsEnum(EvaluatorAllowedStatus, {
    message: 'Status must be IN_EVALUATION, RESOLVED or RESOLVED_IN_COURT',
  })
  status: EvaluatorAllowedStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
