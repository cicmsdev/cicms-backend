import { IsOptional, IsEnum, IsUUID, IsInt, Min, IsISO8601, IsString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ClaimStatus } from '@prisma/client';

export class QueryClaimsDto {
  @IsOptional()
  @IsEnum(ClaimStatus, { each: true })
  @Transform(({ value }) => {
    // repeated query params => array already
    if (Array.isArray(value)) return value;
    // single value or comma-separated list
    if (value == null || value === '') return [];
    const parts = String(value).split(',').map(v => v.trim()).filter(Boolean);
    return parts;
  })
  status?: ClaimStatus[]; // <- now an array

  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsUUID() submittedById?: string;
  @IsOptional() @IsUUID() evaluatorId?: string;

  @IsOptional() @IsISO8601() submittedFrom?: string;
  @IsOptional() @IsISO8601() submittedTo?: string;

  @IsOptional() @IsString() search?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize: number = 10;
}
