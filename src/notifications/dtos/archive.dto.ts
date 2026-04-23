import { IsArray, ArrayNotEmpty, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { CUID_REGEX } from './mark-read.dto';

export class ArchiveDto {
  @Transform(({ value, obj }) => {
    const raw = obj?.ids ?? obj?.id ?? value;
    const arr = Array.isArray(raw) ? raw : [raw];
    return arr.filter(Boolean);
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(CUID_REGEX, { each: true })
  ids!: string[];
}