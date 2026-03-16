import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from '../../guards/local-auth.guard';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** FR-AUTH-002, FR-AUTH-003, FR-AUTH-004 */
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 3600000, limit: 10 } }) // 10 per hour (BRD FR-AUTH-007)
  @ApiOperation({ summary: 'Login with email/phone + password' })
  @ApiBody({ type: LoginDto })
  async login(@Request() req: { user: Express.User; body: LoginDto }, @Ip() ip: string) {
    return this.authService.login(
      req.user as Parameters<AuthService['login']>[0],
      req.body.rememberMe,
      ip,
    );
  }

  /** Refresh access token */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  /** FR-AUTH-010 */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout — invalidates current session token' })
  async logout(
    @Request() req: { user: { sub: string } },
    @Body() dto: RefreshTokenDto,
  ) {
    await this.authService.logout(req.user.sub, dto.refreshToken);
  }

  /** FR-AUTH-008, FR-AUTH-009 */
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  @ApiOperation({ summary: 'Send password reset OTP to email or phone' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.sendPasswordResetOtp(dto.identifier);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP code (password_reset or email_verification)' })
  async verifyOtp(@Body() dto: VerifyOtpDto & { purpose?: string }, @Ip() ip: string) {
    const purpose = dto.purpose ?? 'email_verification';
    const result = await this.authService.verifyOtp(dto.identifier, dto.code, purpose);
    if (!result.valid) return { valid: false };

    // Auto-issue JWT tokens for email_verification so the user can upload
    // documents immediately without a separate login step
    if (result.user) {
      const tokens = await this.authService.login(result.user, false, ip);
      return { valid: true, ...tokens };
    }

    return { valid: true };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset password after OTP verification' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.identifier, dto.newPassword);
  }

  /** Current user info */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user' })
  async me(@Request() req: { user: ReturnType<AuthService['toUserSummary']> }) {
    return req.user;
  }
}
