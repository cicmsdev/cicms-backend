// dtos/mark-read.dto.ts
import { IsArray, ArrayNotEmpty, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

// CUID v1 is 25 chars, usually starting with 'c'
export const CUID_REGEX = /^c[0-9a-z]{24}$/i;

export class MarkReadDto {
  @Transform(({ value, obj }) => {
    const raw = obj?.ids ?? value;
    const arr = Array.isArray(raw) ? raw : [raw];
    return arr.filter(Boolean);
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(CUID_REGEX, { each: true })
  ids!: string[];
}