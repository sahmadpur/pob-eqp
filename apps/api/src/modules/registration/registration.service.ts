import {
  Injectable, ConflictException, NotFoundException,
  BadRequestException, ForbiddenException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole, AccountStatus } from '@pob-eqp/shared';
import * as bcrypt from 'bcrypt';
import { AUTH_CONSTANTS } from '@pob-eqp/shared';
import { RegistrationNotificationsService } from './registration-notifications.service';

const MAX_REVIEW_CYCLES = 2;

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: RegistrationNotificationsService,
  ) {}

  /** Generate a 6-digit OTP, store hashed, and log plaintext in dev */
  private async createOtp(identifier: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + AUTH_CONSTANTS.OTP_EXPIRY_MINUTES * 60 * 1000);
    await this.prisma.otpToken.create({
      data: { identifier, code: codeHash, purpose: 'email_verification', expiresAt },
    });
    this.logger.log(`[DEV ONLY] OTP for ${identifier}: ${code}`);
    return code;
  }

  async registerIndividual(dto: {
    email?: string;
    phone?: string;
    password: string;
    firstName: string;
    lastName: string;
    fathersName?: string;
    dateOfBirth: string;
    nationalIdOrPassport: string;
    preferredLanguage?: string;
  }) {
    // Schema: email is required and unique — generate placeholder if only phone provided
    const resolvedEmail = dto.email ?? `phone-reg-${Date.now()}@placeholder.pob.local`;
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({ where: { email: dto.email, deletedAt: null } });
      if (existing) throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, AUTH_CONSTANTS.BCRYPT_COST);

    const user = await this.prisma.user.create({
      data: {
        email: resolvedEmail,
        phone: dto.phone ?? `+99400${Date.now().toString().slice(-7)}`, // fallback if no phone
        passwordHash,
        role: UserRole.CUSTOMER_INDIVIDUAL,
        accountStatus: AccountStatus.PENDING_EMAIL, // schema value (not PENDING_VERIFICATION)
        locale: dto.preferredLanguage?.toLowerCase() ?? 'en',
        individualProfile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            fathersName: dto.fathersName,
            dateOfBirth: new Date(dto.dateOfBirth),
            nationalIdOrPassport: dto.nationalIdOrPassport.toUpperCase(),
          },
        },
      },
      include: { individualProfile: true },
    });

    // Generate OTP for email/phone verification
    const otpIdentifier = dto.email ?? dto.phone ?? resolvedEmail;
    await this.createOtp(otpIdentifier);

    if (dto.email) {
      void this.notifications.sendIndividualWelcome(dto.email, dto.firstName);
    }

    return { ...user, otpIdentifier };
  }

  async registerLegal(dto: {
    email?: string;
    phone?: string;
    password: string;
    companyName: string;
    taxRegistrationId: string;
    contactPersonName: string;
    contactPersonPhone?: string;
    preferredLanguage?: string;
  }) {
    const resolvedEmail = dto.email ?? `legal-reg-${Date.now()}@placeholder.pob.local`;
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({ where: { email: dto.email, deletedAt: null } });
      if (existing) throw new ConflictException('User with this email already exists');
    }

    const taxExists = await this.prisma.legalEntityProfile.findUnique({
      where: { taxRegistrationId: dto.taxRegistrationId },
    });
    if (taxExists) throw new ConflictException('Tax registration ID already registered');

    const passwordHash = await bcrypt.hash(dto.password, AUTH_CONSTANTS.BCRYPT_COST);

    const user = await this.prisma.user.create({
      data: {
        email: resolvedEmail,
        phone: dto.phone ?? `+99400${Date.now().toString().slice(-7)}`,
        passwordHash,
        role: UserRole.CUSTOMER_LEGAL,
        accountStatus: AccountStatus.PENDING_EMAIL,
        locale: dto.preferredLanguage?.toLowerCase() ?? 'en',
        legalProfile: {
          create: {
            companyName: dto.companyName,
            taxRegistrationId: dto.taxRegistrationId,
            contactPersonName: dto.contactPersonName,
            contactPersonPosition: 'Contact Person',
            legalAddress: 'Pending',
          },
        },
      },
      include: { legalProfile: true },
    });

    const otpIdentifier = dto.email ?? dto.phone ?? resolvedEmail;
    await this.createOtp(otpIdentifier);

    return { ...user, otpIdentifier };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        individualProfile: true,
        legalProfile: {
          include: {
            documents: { orderBy: { createdAt: 'desc' } },
            registrationReviews: { orderBy: { createdAt: 'desc' } }, // schema relation name
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async submitLegalForReview(userId: string) {
    const profile = await this.prisma.legalEntityProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Legal profile not found');

    // Schema RegistrationStatus: SUBMITTED | DOCUMENTS_REQUESTED | AWAITING_SIGNATURE | APPROVED | DECLINED
    const reviewCount = await this.prisma.registrationReview.count({
      where: { legalProfileId: profile.id },
    });
    if (reviewCount >= MAX_REVIEW_CYCLES) {
      throw new ForbiddenException(
        `Maximum ${MAX_REVIEW_CYCLES} review cycles reached. Contact support.`,
      );
    }

    const updated = await this.prisma.legalEntityProfile.update({
      where: { userId },
      data: { registrationStatus: 'SUBMITTED' }, // re-submit resets to SUBMITTED
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) {
      void this.notifications.sendLegalSubmittedToApplicant(user.email, updated.companyName);
    }

    return updated;
  }

  // ── Finance Officer ────────────────────────────────────────────────────────

  async getPendingLegalRegistrations() {
    return this.prisma.user.findMany({
      where: {
        role: UserRole.CUSTOMER_LEGAL,
        legalProfile: { registrationStatus: 'SUBMITTED' },
      },
      select: {
        id: true,
        email: true,
        phone: true,
        createdAt: true,
        legalProfile: {
          select: {
            id: true,
            companyName: true,
            taxRegistrationId: true,
            contactPersonName: true,
            registrationStatus: true,
            submittedAt: true,
            documents: { select: { id: true, type: true, originalFileName: true, s3Key: true } },
            registrationReviews: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getLegalRegistrationDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        legalProfile: {
          include: {
            documents: { orderBy: { createdAt: 'desc' } },
            registrationReviews: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });
    if (!user?.legalProfile) throw new NotFoundException('Legal entity registration not found');
    return user;
  }

  async reviewLegalRegistration(
    userId: string,
    action: 'APPROVE' | 'REJECT',
    reviewerId: string,
    reason?: string,
  ) {
    const profile = await this.prisma.legalEntityProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Legal profile not found');
    if (profile.registrationStatus !== 'SUBMITTED') {
      throw new BadRequestException('Profile is not in SUBMITTED status');
    }
    if (action === 'REJECT' && !reason) {
      throw new BadRequestException('Rejection reason is required');
    }

    // Schema RegistrationStatus: APPROVED | DECLINED (not REJECTED)
    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'DECLINED';
    const newAccountStatus =
      action === 'APPROVE' ? AccountStatus.ACTIVE : AccountStatus.DEACTIVATED;

    await this.prisma.$transaction([
      this.prisma.legalEntityProfile.update({
        where: { userId },
        data: { registrationStatus: newStatus, reviewedAt: new Date(), reviewedById: reviewerId },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { accountStatus: newAccountStatus },
      }),
      this.prisma.registrationReview.create({
        data: {
          legalProfileId: profile.id,
          reviewerId,                    // schema field (not reviewedById)
          action: action === 'APPROVE' ? 'APPROVE' : 'DECLINE',
          declineReason: action === 'REJECT' ? reason : undefined,
          cycleNumber: 1,
        },
      }),
    ]);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) {
      void this.notifications.sendRegistrationDecision(
        user.email,
        profile.companyName,
        action === 'APPROVE',
        reason,
      );
    }
  }

  async activateIndividualAccount(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { accountStatus: AccountStatus.ACTIVE },
    });
  }
}
