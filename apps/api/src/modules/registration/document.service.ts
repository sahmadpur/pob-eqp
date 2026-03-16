import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentType, FILE_LIMITS } from '@pob-eqp/shared';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
]);

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private readonly uploadsDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.uploadsDir = this.config.get<string>('UPLOADS_DIR', '/app/uploads');
    fs.mkdirSync(this.uploadsDir, { recursive: true });
    this.logger.log(`Local file storage at: ${this.uploadsDir}`);
  }

  async saveUploadedFile(dto: {
    uploadedById: string;
    documentType: DocumentType;
    contentType: string;
    fileSize: number;
    originalFileName: string;
    fileBuffer: Buffer;
    orderId?: string;
    legalProfileId?: string;
  }) {
    if (!ALLOWED_CONTENT_TYPES.has(dto.contentType)) {
      throw new BadRequestException(
        `Content type "${dto.contentType}" not allowed. Use PDF, JPEG, or PNG.`,
      );
    }

    if (dto.fileSize > FILE_LIMITS.MAX_SIZE_BYTES) {
      throw new BadRequestException(
        `File too large. Maximum size is ${FILE_LIMITS.MAX_SIZE_BYTES / (1024 * 1024)} MB.`,
      );
    }

    // Enforce 5-doc limit per order
    if (dto.orderId) {
      const count = await this.prisma.document.count({ where: { orderId: dto.orderId } });
      if (count >= FILE_LIMITS.MAX_ADDITIONAL_DOCS) {
        throw new BadRequestException(
          `Maximum ${FILE_LIMITS.MAX_ADDITIONAL_DOCS} documents per order.`,
        );
      }
    }

    const ext = dto.contentType.split('/')[1].replace('jpeg', 'jpg');
    const fileKey = `documents/${dto.uploadedById}/${dto.documentType}/${randomUUID()}.${ext}`;
    const fullPath = path.join(this.uploadsDir, fileKey);

    // Ensure subdirectory exists and write file
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, dto.fileBuffer);

    this.logger.log(`[LOCAL] Saved file: ${fileKey} (${dto.fileSize} bytes)`);

    // s3Key field stores our local fileKey path for DB compatibility
    return this.prisma.document.create({
      data: {
        uploadedById: dto.uploadedById,
        s3Key: fileKey,
        type: dto.documentType,
        originalFileName: dto.originalFileName,
        fileSizeBytes: dto.fileSize,
        mimeType: dto.contentType,
        orderId: dto.orderId ?? null,
        legalProfileId: dto.legalProfileId ?? null,
      },
    });
  }

  async getLocalFilePath(fileKey: string): Promise<string> {
    // Guard against path traversal
    const resolved = path.resolve(path.join(this.uploadsDir, fileKey));
    const base = path.resolve(this.uploadsDir);
    if (!resolved.startsWith(base + path.sep) && resolved !== base) {
      throw new BadRequestException('Invalid file path');
    }
    if (!fs.existsSync(resolved)) {
      throw new NotFoundException('File not found');
    }
    return resolved;
  }

  async getDocumentsByUser(uploadedById: string) {
    return this.prisma.document.findMany({
      where: { uploadedById },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDocumentsByLegalProfile(legalProfileId: string) {
    return this.prisma.document.findMany({
      where: { legalProfileId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
