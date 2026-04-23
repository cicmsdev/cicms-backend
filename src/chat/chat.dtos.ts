import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class JoinClaimDto {
  @IsUUID() claimId!: string;
}

export class JoinDmDto {
  @IsUUID() otherUserId!: string;
}

export class SendMessageDto {
  // Either claimId for room OR otherUserId for DM (but not both)
  @IsOptional() @IsUUID() claimId?: string;
  @IsOptional() @IsUUID() otherUserId?: string;

  @IsString() @Length(1, 2000)
  content!: string;
}

export class MarkReadDto {
  @IsString() conversationKey!: string; // "claim:<uuid>" OR "dm:<u1>:<u2>"
}
