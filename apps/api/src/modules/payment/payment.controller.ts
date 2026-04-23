import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CibpayService } from './cibpay/cibpay.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@pob-eqp/shared';

@ApiTags('payment')
@Controller('payment')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly cibpayService: CibpayService,
  ) {}

  // ── Specific sub-paths first (route ordering matters) ──

  @Get('cibpay/ping')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR, UserRole.FINANCE_OFFICER)
  @ApiOperation({ summary: 'Ping the CIBPAY gateway (admin diagnostic)' })
  async ping() {
    return this.cibpayService.ping();
  }

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate payment for an order' })
  async initiate(@Body() dto: Parameters<PaymentService['initiate']>[0]) {
    return this.paymentService.initiate(dto);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payment details for an order' })
  async getByOrder(@Param('orderId') orderId: string) {
    return this.paymentService.findByOrder(orderId);
  }

  @Post(':paymentId/sync')
  @ApiOperation({ summary: 'Sync payment status from CIBPAY (after return_url)' })
  async sync(@Param('paymentId') paymentId: string) {
    return this.paymentService.syncCibpayStatus(paymentId);
  }

  @Post(':paymentId/refund')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FINANCE_OFFICER, UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Refund payment via CIBPAY (Finance Officer or Admin)' })
  async refund(
    @Param('paymentId') paymentId: string,
    @Body() dto: { amount?: number; reason?: string },
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    return this.paymentService.refundPayment(paymentId, req.user.id, dto.amount, dto.reason);
  }

  @Post(':paymentId/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FINANCE_OFFICER, UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Cancel payment via CIBPAY (Finance Officer or Admin)' })
  async cancel(
    @Param('paymentId') paymentId: string,
    @Body() dto: { reason?: string },
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    return this.paymentService.cancelPayment(paymentId, req.user.id, dto.reason);
  }

  @Post(':paymentId/confirm')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FINANCE_OFFICER, UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Confirm payment (Finance Officer or Admin)' })
  async confirm(
    @Param('paymentId') paymentId: string,
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    return this.paymentService.confirmPayment(paymentId, req.user.id);
  }

  @Post(':paymentId/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FINANCE_OFFICER, UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Reject payment (Finance Officer or Admin)' })
  async reject(
    @Param('paymentId') paymentId: string,
    @Body() dto: { reason: string },
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    return this.paymentService.rejectPayment(paymentId, dto.reason);
  }
}
