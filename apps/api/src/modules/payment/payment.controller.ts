import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@pob-eqp/shared';

@ApiTags('payment')
@Controller('payment')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

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

  @Post(':paymentId/confirm')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FINANCE_OFFICER, UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Confirm payment (Finance Officer or Admin)' })
  async confirm(
    @Param('paymentId') paymentId: string,
    @Request() req: { user: { sub: string } },
  ) {
    return this.paymentService.confirmPayment(paymentId);
  }

  @Post(':paymentId/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FINANCE_OFFICER, UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Reject payment (Finance Officer or Admin)' })
  async reject(
    @Param('paymentId') paymentId: string,
    @Body() dto: { reason: string },
    @Request() req: { user: { sub: string } },
  ) {
    return this.paymentService.rejectPayment(paymentId, dto.reason);
  }
}
