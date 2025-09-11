import { IsUUID, IsEnum, IsString, IsOptional } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class CreateDocumentDto {
  @IsEnum(DocumentType, { message: 'documentType must be a valid DocumentType' })
  documentType: DocumentType;

  @IsUUID()
  claimId: string;

}