import {
  Controller, Post, Body, HttpCode, HttpStatus, Get,
  UseGuards, Request, Param, UseInterceptors, UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RegistrationService } from './registration.service';
import { DocumentService } from './document.service';
import { RegisterIndividualDto } from './dto/register-individual.dto';
import { RegisterLegalDto } from './dto/register-legal.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole, DocumentType } from '@pob-eqp/shared';

@ApiTags('registration')
@Controller('registration')
export class RegistrationController {
  constructor(
    private readonly registrationService: RegistrationService,
    private readonly documentService: DocumentService,
  ) {}

  /** P1-02: Individual customer registration */
  @Post('individual')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  @ApiOperation({ summary: 'Register as individual customer' })
  async registerIndividual(@Body() dto: RegisterIndividualDto) {
    const user = await this.registrationService.registerIndividual(dto);
    return { id: user.id, email: user.email, phone: user.phone };
  }

  /** P1-07: Legal entity registration */
  @Post('legal')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  @ApiOperation({ summary: 'Register as legal entity customer' })
  async registerLegal(@Body() dto: RegisterLegalDto) {
    const user = await this.registrationService.registerLegal(dto);
    return { id: user.id, email: user.email, phone: user.phone };
  }

  /** P1-09: Submit legal entity profile for Finance review */
  @Post('legal/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Submit legal entity registration for Finance review' })
  async submitForReview(@Request() req: { user: { id: string; role: string; accountStatus: string } }) {
    await this.registrationService.submitLegalForReview(req.user.id);
  }

  /** Get own registration profile */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user registration profile' })
  async getMyProfile(@Request() req: { user: { id: string; role: string; accountStatus: string } }) {
    return this.registrationService.findById(req.user.id);
  }

  // ── Document Upload ────────────────────────────────────────────────────

  /**
   * P1-04 / P1-08: Upload document directly (multipart/form-data).
   * Replaces the old 3-step S3 presigned URL flow.
   */
  @Post('documents/upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: { type: 'string', enum: Object.values(DocumentType) },
        legalProfileId: { type: 'string' },
        orderId: { type: 'string' },
      },
      required: ['file', 'documentType'],
    },
  })
  @ApiOperation({ summary: 'Upload document (PDF/JPG/PNG) — stored locally' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { documentType: string; legalProfileId?: string; orderId?: string },
    @Request() req: { user: { id: string } },
  ) {
    if (!file) throw new BadRequestException('No file provided');

    // Auto-resolve legalProfileId from the authenticated user's legal profile
    // so documents are always linked even when the client omits it.
    let legalProfileId = body.legalProfileId;
    if (!legalProfileId && !body.orderId) {
      const resolved = await this.registrationService.findLegalProfileIdByUserId(req.user.id);
      if (resolved) legalProfileId = resolved;
    }

    const document = await this.documentService.saveUploadedFile({
      uploadedById: req.user.id,
      documentType: body.documentType as DocumentType,
      contentType: file.mimetype,
      fileSize: file.size,
      originalFileName: file.originalname,
      fileBuffer: file.buffer,
      legalProfileId,
      orderId: body.orderId,
    });

    return { fileKey: document.s3Key, document };
  }

  /** Get my documents */
  @Get('documents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all documents for current user' })
  async getMyDocuments(@Request() req: { user: { id: string; role: string; accountStatus: string } }) {
    return this.documentService.getDocumentsByUser(req.user.id);
  }

  // ── Admin endpoints ────────────────────────────────────────────────────

  /** Admin: Get all legal entity registrations (all statuses) */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all legal entity registrations (admin oversight)' })
  async getAllRegistrations() {
    return this.registrationService.getAllLegalRegistrations();
  }

  // ── Finance Officer endpoints ──────────────────────────────────────────

  /** P1-F01: Get all pending legal entity registrations */
  @Get('finance/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FINANCE_OFFICER, UserRole.ADMINISTRATOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get pending legal entity registrations for Finance review' })
  async getPendingRegistrations() {
    return this.registrationService.getPendingLegalRegistrations();
  }

  /** P1-F02: Get single legal entity registration for review */
  @Get('finance/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FINANCE_OFFICER, UserRole.ADMINISTRATOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get legal entity registration detail for Finance review' })
  async getRegistrationDetail(@Param('userId') userId: string) {
    return this.registrationService.getLegalRegistrationDetail(userId);
  }

  /** P1-F02: Approve or reject legal entity registration */
  @Post('finance/:userId/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FINANCE_OFFICER, UserRole.ADMINISTRATOR)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Approve or reject a legal entity registration' })
  async reviewRegistration(
    @Param('userId') userId: string,
    @Body() dto: { action: 'APPROVE' | 'REJECT'; reason?: string },
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    await this.registrationService.reviewLegalRegistration(
      userId,
      dto.action,
      req.user.id,
      dto.reason,
    );
  }
}
