import { IsUUID } from "class-validator";

export class UnreadByClaimQueryDto {
  @IsUUID()
  claimId!: string;
}