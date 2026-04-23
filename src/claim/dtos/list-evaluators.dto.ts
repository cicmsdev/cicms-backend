import { IsInt, IsOptional, IsString, Min } from 'class-validator';
// If you want to filter assigned counts by claim status later, you can add it here.

export class ListEvaluatorsDto {
  @IsOptional() @IsString()
  search?: string;                // name/email/phone search  

    @IsOptional() @IsString()
  companyId?: string;  

  @IsOptional()
  onlyActive?: boolean = true;    // only ACTIVE users (default)

  @IsOptional() @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @IsInt() @Min(1)
  pageSize?: number = 50;
}
