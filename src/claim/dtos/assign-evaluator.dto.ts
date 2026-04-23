import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AssignEvaluatorDto {
  @IsUUID()
  evaluatorId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
