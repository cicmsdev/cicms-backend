import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentDto } from './create-document.dtos';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @IsOptional()
  @IsString()
  filePath?: string;
}