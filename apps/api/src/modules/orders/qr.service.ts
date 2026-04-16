import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class QrService {
  private readonly uploadsDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadsDir = this.config.get<string>('UPLOADS_DIR', '/app/uploads');
  }

  async generateAndSave(orderId: string): Promise<string> {
    const dir = path.join(this.uploadsDir, 'qrcodes');
    fs.mkdirSync(dir, { recursive: true });

    const fileKey = `qrcodes/${orderId}.png`;
    const fullPath = path.join(this.uploadsDir, fileKey);

    await QRCode.toFile(fullPath, orderId, {
      type: 'png',
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    return fileKey;
  }

  getFullPath(fileKey: string): string {
    return path.join(this.uploadsDir, fileKey);
  }

  fileExists(fileKey: string): boolean {
    return fs.existsSync(this.getFullPath(fileKey));
  }
}
