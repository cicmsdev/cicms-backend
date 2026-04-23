import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Res,
  NotFoundException,
  UsePipes,
  ValidationPipe,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dtos/create-document.dtos';
import { UpdateDocumentDto } from './dtos/update-document.dtos';
import { Request, Response } from 'express';           // <-- add Request
import { JwtAuthGuard } from '../auth/middlewares/jwt-auth.guard';
import { RolesGuard } from 'src/auth/middlewares/roles.guard';
import { Roles } from 'src/auth/middlewares/roles.decorator';

                  
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  // Allowed MIME types: pdf, doc, docx, png, jpg/jpeg
  private static readonly ALLOWED_MIME_REGEX =
    /(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|image\/png|image\/jpeg)/;

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard) 
  @Roles('Contractor', 'Evaluator', 'Insurance Representative')                    
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async createDocument(
    @Body() dto: CreateDocumentDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 25 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: DocumentController.ALLOWED_MIME_REGEX }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const userId = (req as any).user?.sub;
    if (!userId) throw new BadRequestException('Invalid auth');
    return this.documentService.createDocument(dto, file, userId);
  }

  @Get()
  async getAllDocuments(@Query('claimId') claimId?: string) {
    if (claimId) {
      return this.documentService.findDocumentsByClaimId(claimId);
    }
    return this.documentService.findAllDocuments();
  }

  @Get(':documentId')
  async getDocument(@Param('documentId') documentId: string) {
    return this.documentService.findDocumentById(documentId);
  }

  @Patch(':documentId')                                  // <-- add this
  @Roles('Contractor', 'Evaluator', 'Insurance Representative')                      // <-- restrict updates
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async updateDocument(
    @Param('documentId') documentId: string,
    @Body() dto: UpdateDocumentDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 25 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: DocumentController.ALLOWED_MIME_REGEX }),
        ],
      }),
    )
    file?: Express.Multer.File,
  ) {
    return this.documentService.updateDocument(documentId, dto, file);
  }

  @Delete(':documentId')
  @Roles('Evaluator')                                    // <-- delete likely stricter
  async deleteDocument(@Param('documentId') documentId: string) {
    return this.documentService.deleteDocument(documentId);
  }

  @Get(':documentId/download')
  async downloadDocument(@Param('documentId') documentId: string, @Res() res: Response) {
    try {
      const { fileStream, filename, contentType, size } =
        await this.documentService.getDocumentFile(documentId);

      res.set({
        'Content-Type': contentType,
        'Content-Length': size.toString(),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'X-Content-Type-Options': 'nosniff',
      });

      fileStream.on('error', (err) => {
        console.error('Stream error:', err);
        if (!res.headersSent) res.status(500).send('Error streaming file');
      });

      fileStream.pipe(res);
    } catch (error) {
      console.error('Download error:', error);
      if (!res.headersSent) {
        if (error instanceof NotFoundException) {
          res.status(404).send('File not found');
        } else {
          res.status(500).send('Download failed');
        }
      }
    }
  }
}
