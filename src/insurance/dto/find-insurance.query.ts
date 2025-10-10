// src/insurance/dtos/find-insurance.query.ts
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class FindInsuranceQuery {
  @IsOptional() @IsString()
  q?: string; 

  @IsOptional()
  @Transform(({ value }) =>
    value === true || value === 'true' ? true :
    value === false || value === 'false' ? false : undefined
  )
  active?: boolean; 

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pageSize: number = 10;

  @IsOptional() @IsString()
  sort?: string; 
}
