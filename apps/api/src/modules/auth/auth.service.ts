import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { AUTH_CONSTANTS, UserRole, AccountStatus } from '@pob-eqp/shared';
import type { User } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Validates credentials for Passport LocalStrategy */
  async validateUser(identifier: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { phone: identifier },
        ],
        deletedAt: null,
      },
    });

    if (!user) return null;

    // Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        `Account locked. Try again after ${user.lockedUntil.toISOString()}`,
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      await this.incrementFailedAttempts(user.id);
      return null;
    }

    // Block login based on account status BEFORE issuing tokens
    if (user.accountStatus === AccountStatus.PENDING_EMAIL) {
      throw new ForbiddenException('Please verify your email address before logging in.');
    }
    if (user.accountStatus === AccountStatus.PENDING_REVIEW) {
      throw new ForbiddenException('Your account is pending Finance Officer review. You will be notified once approved.');
    }
    if (user.accountStatus === AccountStatus.DEACTIVATED) {
      throw new ForbiddenException('Your account has been deactivated. Please contact support.');
    }

    // Reset failed attempts on success
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    return user;
  }

  async login(user: User, rememberMe = false, ipAddress?: string) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshExpiry = rememberMe
      ? this.config.get('jwt.rememberMeExpiry', '30d')
      : this.config.get('jwt.refreshExpiry', '7d');

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('jwt.refreshSecret'),
      expiresIn: refreshExpiry,
    });

    // Persist refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        ipAddress,
        expiresAt,
      },
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ipAddress },
    });

    return {
      accessToken,
      refreshToken,
      user: this.toUserSummary(user),
    };
  }

  async refreshTokens(refreshToken: string) {
    const session = await this.prisma.userSession.findFirst({
      where: { refreshToken, revokedAt: null },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const newAccessToken = this.jwtService.sign({
      sub: session.user.id,
      email: session.user.email,
      role: session.user.role,
      accountStatus: session.user.accountStatus,
    });

    return { accessToken: newAccessToken };
  }

  async logout(userId: string, refreshToken: string) {
    await this.prisma.userSession.updateMany({
      where: { userId, refreshToken },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string) {
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async sendPasswordResetOtp(identifier: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier.toLowerCase() }, { phone: identifier }],
        deletedAt: null,
      },
    });

    // Always return success to prevent user enumeration
    if (!user) return;

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + AUTH_CONSTANTS.OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.otpToken.create({
      data: {
        identifier,
        code: codeHash,
        purpose: 'password_reset',
        expiresAt,
      },
    });

    // In production: send via Twilio (SMS) or Nodemailer (email)
    // For scaffold: log the code
    this.logger.log(`[DEV ONLY] OTP for ${identifier}: ${code}`);
  }

  async verifyOtp(
    identifier: string,
    code: string,
    purpose: string,
  ): Promise<{ valid: boolean; user?: User }> {
    const otpRecord = await this.prisma.otpToken.findFirst({
      where: {
        identifier,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) return { valid: false };

    const isValid = await bcrypt.compare(code, otpRecord.code);
    if (!isValid) return { valid: false };

    await this.prisma.otpToken.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });

    // For email_verification, activate the account and return the user so the
    // controller can issue JWT tokens immediately (no second login step needed).
    // Legal entities go to PENDING_REVIEW — they must await Finance approval before login.
    if (purpose === 'email_verification') {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: identifier }, { phone: identifier }],
          deletedAt: null,
        },
      });
      if (user) {
        // Legal customers require Finance review before being fully active
        const newStatus =
          user.role === UserRole.CUSTOMER_LEGAL
            ? AccountStatus.PENDING_REVIEW
            : AccountStatus.ACTIVE;
        await this.prisma.user.update({
          where: { id: user.id },
          data: { accountStatus: newStatus },
        });
        return { valid: true, user: { ...user, accountStatus: newStatus } as User };
      }
    }

    return { valid: true };
  }

  async resetPassword(identifier: string, newPassword: string): Promise<void> {
    const hash = await bcrypt.hash(newPassword, AUTH_CONSTANTS.BCRYPT_COST);
    await this.prisma.user.updateMany({
      where: {
        OR: [{ email: identifier.toLowerCase() }, { phone: identifier }],
        deletedAt: null,
      },
      data: { passwordHash: hash, failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  private async incrementFailedAttempts(userId: string): Promise<void> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
    });

    if (user.failedLoginAttempts >= AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
      const lockedUntil = new Date(
        Date.now() + AUTH_CONSTANTS.LOCKOUT_DURATION_MINUTES * 60 * 1000,
      );
      await this.prisma.user.update({
        where: { id: userId },
        data: { lockedUntil },
      });
    }
  }

  toUserSummary(user: User) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      accountStatus: user.accountStatus,
      displayName: user.displayName || user.email,
      profilePhotoUrl: user.profilePhotoS3Key || null,
      locale: user.locale,
    };
  }
}
