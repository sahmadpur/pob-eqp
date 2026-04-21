import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@pob-eqp/shared';
import { FINANCE_CONSTANTS } from '@pob-eqp/shared';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  private generateCashReference(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async initiate(dto: {
    orderId: string;
    method: PaymentMethod;
    amountAzn: number;  // schema field name
    idempotencyKey: string;
  }) {
    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) return existing;

    const order = await this.prisma.order.findUnique({ where: { orderId: dto.orderId } });
    if (!order) throw new NotFoundException(`Order ${dto.orderId} not found`);
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Order is not in PENDING_PAYMENT status');
    }

    let cashReferenceCode: string | undefined;
    let cashReferenceExpiry: Date | undefined;

    if (dto.method === PaymentMethod.CASH) {
      cashReferenceCode = this.generateCashReference();
      // FINANCE_CONSTANTS.CASH_REFERENCE_EXPIRY_HOURS (not _MS)
      cashReferenceExpiry = new Date(
        Date.now() + FINANCE_CONSTANTS.CASH_REFERENCE_EXPIRY_HOURS * 60 * 60 * 1000,
      );
    }

    return this.prisma.payment.create({
      data: {
        orderId: order.id,
        method: dto.method,
        amountAzn: dto.amountAzn,   // schema: amountAzn (not amount)
        status: PaymentStatus.PENDING,
        idempotencyKey: dto.idempotencyKey,
        cashReferenceCode,
        cashReferenceExpiry,         // schema: cashReferenceExpiry (not cashReferenceExpiresAt)
      },
    });
  }

  async confirmPayment(paymentId: string, actorUserId?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment is not in PENDING status');
    }

    const now = new Date();
    const isManual = Boolean(actorUserId);

    return this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.CONFIRMED, confirmedAt: now },
      }),
      this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.VERIFIED,
          paymentConfirmedAt: now, // immutable FIFO sort key
        },
      }),
      this.prisma.orderEvent.create({
        data: {
          orderId: payment.orderId,
          actor: isManual ? 'Finance' : 'Platform',
          actorId: actorUserId,
          event: 'PAYMENT_CONFIRMED',
          note: isManual ? 'Payment manually confirmed' : 'Payment confirmed',
        },
      }),
    ]);
  }

  async rejectPayment(paymentId: string, reason: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.FAILED, failureReason: reason, failedAt: new Date() },
    });
  }

  async findByOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    return this.prisma.payment.findFirst({ where: { orderId: order.id } });
  }
}
