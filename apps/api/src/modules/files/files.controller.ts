import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? '/app/uploads';

@ApiTags('files')
@Controller('files')
export class FilesController {
  /**
   * Serve locally uploaded files.
   * Path: GET /api/v1/files/documents/{userId}/{docType}/{uuid}.{ext}
   * No auth required — file keys are unguessable UUIDs.
   */
  @Get('*')
  @ApiOperation({ summary: 'Serve a locally stored file by its file key' })
  serveFile(@Param('0') filePath: string, @Res() res: Response) {
    // Guard against path traversal attacks
    const resolved = path.resolve(path.join(UPLOADS_DIR, filePath));
    const base = path.resolve(UPLOADS_DIR);

    if (!resolved.startsWith(base + path.sep) && resolved !== base) {
      throw new NotFoundException('File not found');
    }

    if (!fs.existsSync(resolved)) {
      throw new NotFoundException('File not found');
    }

    res.sendFile(resolved);
  }
}
