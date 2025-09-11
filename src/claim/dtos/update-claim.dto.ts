import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateClaimDto {
  @IsOptional()
  @IsString()
  @MaxLength(25)
  claimTitle?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;
}
