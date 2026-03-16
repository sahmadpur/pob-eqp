import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentType } from '@pob-eqp/shared';
import { FILE_LIMITS } from '@pob-eqp/shared';
import { randomUUID } from 'crypto';

const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
]);

@Injectable()
export class DocumentService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly urlExpiry: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.s3 = new S3Client({
      region: this.config.get<string>('AWS_REGION', 'eu-central-1'),
      credentials: {
        accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
    this.bucket = this.config.get<string>('AWS_S3_BUCKET', 'pob-eqp-documents');
    this.urlExpiry = this.config.get<number>('AWS_S3_URL_EXPIRY', 900);
  }

  async generatePresignedUploadUrl(dto: {
    uploadedById: string;
    documentType: DocumentType;
    contentType: string;
    fileSize: number;
    orderId?: string;
    legalProfileId?: string;
  }) {
    if (!ALLOWED_CONTENT_TYPES.has(dto.contentType)) {
      throw new BadRequestException(
        `Content type ${dto.contentType} not allowed. Use PDF, JPEG, or PNG.`,
      );
    }

    if (dto.fileSize > FILE_LIMITS.MAX_SIZE_BYTES) {
      throw new BadRequestException(
        `File too large. Maximum size is ${FILE_LIMITS.MAX_SIZE_BYTES / (1024 * 1024)} MB.`,
      );
    }

    const ext = dto.contentType.split('/')[1].replace('jpeg', 'jpg');
    const s3Key = `documents/${dto.uploadedById}/${dto.documentType}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: dto.contentType,
      ContentLength: dto.fileSize,
      Metadata: {
        uploadedById: dto.uploadedById,
        documentType: dto.documentType,
      },
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: this.urlExpiry });
    return { uploadUrl, s3Key, expiresIn: this.urlExpiry };
  }

  async confirmUpload(dto: {
    uploadedById: string;
    s3Key: string;
    type: DocumentType;
    originalFileName: string;
    fileSize: number;
    mimeType: string;
    orderId?: string;
    legalProfileId?: string;
  }) {
    // Enforce 5-doc limit on order additional files
    if (dto.orderId) {
      const count = await this.prisma.document.count({ where: { orderId: dto.orderId } });
      if (count >= FILE_LIMITS.MAX_ADDITIONAL_DOCS) {
        throw new BadRequestException(
          `Maximum ${FILE_LIMITS.MAX_ADDITIONAL_DOCS} documents per order.`,
        );
      }
    }

    return this.prisma.document.create({
      data: {
        uploadedById: dto.uploadedById,
        s3Key: dto.s3Key,
        type: dto.type,
        originalFileName: dto.originalFileName,
        fileSizeBytes: dto.fileSize,
        mimeType: dto.mimeType,
        orderId: dto.orderId,
        legalProfileId: dto.legalProfileId,
      },
    });
  }

  async generatePresignedDownloadUrl(s3Key: string) {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: s3Key });
    return getSignedUrl(this.s3, command, { expiresIn: this.urlExpiry });
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
