import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateDocumentDto } from './dtos/create-document.dtos';
import { UpdateDocumentDto } from './dtos/update-document.dtos';
import * as fs from 'fs';
import * as path from 'path';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { lookup as lookupMime } from 'mime-types';

@Injectable()
export class DocumentService {
  constructor(private prisma: DatabaseService) { }

  private readonly uploadRoot = path.join(process.cwd(), 'uploads');

  private ensureUploadDirectoryExists(claimId: string) {
    const dir = path.join(this.uploadRoot, 'documents', claimId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  private sanitizeName(name: string) {
    // basic sanitize to avoid path traversal and weird chars
    return name.replace(/[^\w.\-() ]+/g, '_');
  }

  private async saveFileToDisk(claimId: string, file: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('File buffer missing');
    const dir = this.ensureUploadDirectoryExists(claimId);


    const safeOriginal = this.sanitizeName(file.originalname || 'unnamed');
    const filename = `${safeOriginal}`;
    const absPath = path.join(dir, filename);

    await fs.promises.writeFile(absPath, file.buffer);

    // store a relative DB path like: documents/<claimId>/<filename>
    const relPath = path.join('documents', claimId, filename);
    return { absPath, relPath, filename };
  }

  private async deleteFileFromDisk(relPath: string) {
    const absPath = path.join(this.uploadRoot, relPath);
    if (fs.existsSync(absPath)) {
      await fs.promises.unlink(absPath);
    }
  }

  /** CREATE */
  async createDocument(
    dto: CreateDocumentDto,
    file: Express.Multer.File,
    uploaderIdFromAuth: string, // now required
  ) {
    const claim = await this.prisma.claim.findUnique({ where: { claimId: dto.claimId } });
    if (!claim) throw new NotFoundException('Claim not found');

    const { relPath } = await this.saveFileToDisk(dto.claimId, file);

    const document = await this.prisma.document.create({
      data: {
        claimId: dto.claimId,
        documentType: dto.documentType,
        filePath: relPath,
        uploaderId: uploaderIdFromAuth, // <- only from auth
      },
    });

    return { message: 'Document created successfully', data: document };
  }

  /** LIST ALL */
  async findAllDocuments() {
    return this.prisma.document.findMany({
      include: {
        claim: true,
        uploader: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** LIST BY CLAIM */
  async findDocumentsByClaimId(claimId: string) {
    return this.prisma.document.findMany({
      where: { claimId },
      include: {
        claim: true,
        uploader: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** GET ONE */
  async findDocumentById(documentId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { documentId },
      include: {
        claim: true,
        uploader: true,
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  /** UPDATE (optionally replace file) */
  async updateDocument(
    documentId: string,
    dto: UpdateDocumentDto,
    file?: Express.Multer.File,
  ) {
    const existing = await this.prisma.document.findUnique({ where: { documentId } });
    if (!existing) throw new NotFoundException('Document not found');

    const updateData: Partial<{
      documentType: any;
      filePath: string;
    }> = {};

    if (dto.documentType) updateData.documentType = dto.documentType;

    if (file) {
      // replace physical file
      if (existing.filePath) await this.deleteFileFromDisk(existing.filePath);
      const { relPath } = await this.saveFileToDisk(existing.claimId, file);
      updateData.filePath = relPath;
    } else if (dto.filePath) {
      // In most cases you shouldn’t let clients rewrite filePath directly;
      // keep this only if your workflows need it.
      updateData.filePath = dto.filePath;
    }

    const updated = await this.prisma.document.update({
      where: { documentId },
      data: updateData,
    });

    return { message: 'Document updated successfully', data: updated };
  }

  /** DELETE */
  async deleteDocument(documentId: string) {
    const doc = await this.prisma.document.findUnique({ where: { documentId } });
    if (!doc) throw new NotFoundException('Document not found');

    if (doc.filePath) await this.deleteFileFromDisk(doc.filePath);

    await this.prisma.document.delete({ where: { documentId } });

    return { message: 'Document deleted successfully' };
  }

  /** DOWNLOAD/STREAM FILE */
  async getDocumentFile(documentId: string) {
    const doc = await this.prisma.document.findUnique({ where: { documentId } });
    if (!doc) throw new NotFoundException('Document not found');

    const absPath = path.join(this.uploadRoot, doc.filePath);
    try {
      await stat(absPath);
    } catch {
      throw new NotFoundException('File not found on server');
    }

    // detect content type by extension; fallback to octet-stream
    const ext = path.extname(absPath);
    const contentType = lookupMime(ext) || 'application/octet-stream';

    const originalFilename =
      doc.filePath.split('/').pop() ||
      doc.filePath.split('\\').pop() ||
      'download';

    const fileStream = createReadStream(absPath);
    const stats = await stat(absPath);

    return {
      fileStream,
      filename: originalFilename,
      contentType,
      size: stats.size,
    };
  }
}
