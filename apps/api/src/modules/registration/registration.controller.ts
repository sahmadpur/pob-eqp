import {
  Controller, Post, Body, HttpCode, HttpStatus, Get,
  UseGuards, Request, Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RegistrationService } from './registration.service';
import { DocumentService } from './document.service';
import { RegisterIndividualDto } from './dto/register-individual.dto';
import { RegisterLegalDto } from './dto/register-legal.dto';
import { PresignedUrlRequestDto } from './dto/upload-document.dto';
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
  async submitForReview(@Request() req: { user: { sub: string } }) {
    await this.registrationService.submitLegalForReview(req.user.sub);
  }

  /** Get own registration profile */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user registration profile' })
  async getMyProfile(@Request() req: { user: { sub: string } }) {
    return this.registrationService.findById(req.user.sub);
  }

  // ── Document Upload ────────────────────────────────────────────────────

  /** P1-04 / P1-08: Generate presigned S3 upload URL */
  @Post('documents/presigned-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get S3 presigned URL for document upload' })
  async getPresignedUrl(
    @Body() dto: PresignedUrlRequestDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.documentService.generatePresignedUploadUrl({
      uploadedById: req.user.sub,
      documentType: dto.documentType,
      contentType: dto.contentType,
      fileSize: dto.fileSize,
    });
  }

  /** Confirm document uploaded to S3 and persist DB record */
  @Post('documents/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Confirm document upload and save DB record' })
  async confirmUpload(
    @Body() dto: {
      s3Key: string;
      type: DocumentType;
      originalFileName: string;
      fileSize: number;
      mimeType: string;
      legalProfileId?: string;
    },
    @Request() req: { user: { sub: string } },
  ) {
    return this.documentService.confirmUpload({ uploadedById: req.user.sub, ...dto });
  }

  /** Get download URL for a document */
  @Get('documents/:s3Key/download-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get presigned download URL for a document' })
  async getDownloadUrl(@Param('s3Key') s3Key: string) {
    const url = await this.documentService.generatePresignedDownloadUrl(
      decodeURIComponent(s3Key),
    );
    return { url };
  }

  /** Get my documents */
  @Get('documents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all documents for current user' })
  async getMyDocuments(@Request() req: { user: { sub: string } }) {
    return this.documentService.getDocumentsByUser(req.user.sub);
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
    @Request() req: { user: { sub: string } },
  ) {
    await this.registrationService.reviewLegalRegistration(
      userId,
      dto.action,
      req.user.sub,
      dto.reason,
    );
  }
}
