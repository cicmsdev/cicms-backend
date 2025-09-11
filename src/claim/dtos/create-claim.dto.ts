import { IsUUID, IsString, MaxLength, IsEmail, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateClaimDto {
  @IsUUID()
  companyId: string;

  @IsString()
  @MaxLength(25)
  @Transform(({ value }) => value?.trim())
  claimTitle: string;
}
