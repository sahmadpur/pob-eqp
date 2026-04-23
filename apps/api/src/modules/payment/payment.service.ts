import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaymentMethod, PaymentStatus, OrderStatus } from '@pob-eqp/shared';
import { FINANCE_CONSTANTS } from '@pob-eqp/shared';
import { CibpayService } from './cibpay/cibpay.service';
import { CibpayConfigService } from './cibpay/cibpay.config';
import { mapCibpayStatus, isTerminalCibpayStatus } from './cibpay/cibpay.status-map';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cibpay: CibpayService,
    private readonly cibpayConfig: CibpayConfigService,
  ) {}

  private generateCashReference(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async initiate(dto: {
    orderId: string;
    method: PaymentMethod;
    amountAzn: number;
    idempotencyKey: string;
    locale?: string;
  }): Promise<{ id: string; paymentUrl?: string | null; status: PaymentStatus; method: PaymentMethod }> {
    const existing = await this.prisma.payment.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      return {
        id: existing.id,
        paymentUrl: existing.cibpayPaymentUrl,
        status: existing.status,
        method: existing.method,
      };
    }

    const order = await this.prisma.order.findUnique({
      where: { orderId: dto.orderId },
      include: { user: true },
    });
    if (!order) throw new NotFoundException(`Order ${dto.orderId} not found`);
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Order is not in PENDING_PAYMENT status');
    }

    let cashReferenceCode: string | undefined;
    let cashReferenceExpiry: Date | undefined;

    if (dto.method === PaymentMethod.CASH) {
      cashReferenceCode = this.generateCashReference();
      cashReferenceExpiry = new Date(
        Date.now() + FINANCE_CONSTANTS.CASH_REFERENCE_EXPIRY_HOURS * 60 * 60 * 1000,
      );
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        method: dto.method,
        amountAzn: dto.amountAzn,
        status: PaymentStatus.PENDING,
        idempotencyKey: dto.idempotencyKey,
        cashReferenceCode,
        cashReferenceExpiry,
      },
    });

    if (dto.method !== PaymentMethod.CARD) {
      return { id: payment.id, status: payment.status, method: payment.method };
    }

    const cfg = this.cibpayConfig.getConfig();
    const locale = (dto.locale || 'en').slice(0, 2);
    const returnUrl = `${cfg.returnBaseUrl}/${locale}/customer/orders/${order.orderId}/payment-return`;

    try {
      const digits = (s: string | null | undefined): string => (s ?? '').replace(/\D/g, '');
      const userPhone = digits(order.user.phone);
      // Split into country code + subscriber (AZ numbers start with 994)
      const phoneCC = userPhone.startsWith('994') ? '994' : userPhone.slice(0, 3) || '994';
      const phoneSub = userPhone.startsWith('994') ? userPhone.slice(3) : userPhone.slice(3) || userPhone;
      const driverPhone = digits(order.driverPhone);
      const driverCC = driverPhone.startsWith('994') ? '994' : driverPhone.slice(0, 3) || '994';
      const driverSub = driverPhone.startsWith('994') ? driverPhone.slice(3) : driverPhone.slice(3) || driverPhone;

      const { order: cibpayOrder, paymentUrl } = await this.cibpay.createOrder(
        payment.id,
        {
          amount: Number(dto.amountAzn),
          currency: cfg.defaultCurrency,
          merchant_order_id: order.orderId,
          options: {
            auto_charge: true,
            expiration_timeout: '20m',
            force3d: cfg.force3d,
            language: locale,
            return_url: returnUrl,
            country: 'AZE',
            terminal: cfg.terminal,
          },
          custom_fields: {
            home_phone_country_code: phoneCC,
            home_phone_subscriber: phoneSub || userPhone || '0000000',
            mobile_phone_country_code: driverCC,
            mobile_phone_subscriber: driverSub || driverPhone || '0000000',
            work_phone_country_code: phoneCC,
            work_phone_subscriber: phoneSub || userPhone || '0000000',
          },
          client: {
            email: order.user.email,
            phone: userPhone,
            city: 'Baku',
            country: 'AZE',
            address: 'Port of Baku, Alat',
            zip: '1000',
          },
        },
        dto.idempotencyKey,
      );

      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          cibpayOrderId: cibpayOrder.id,
          cibpayPaymentUrl: paymentUrl,
          cibpayStatus: cibpayOrder.status,
          cibpayLastSyncedAt: new Date(),
          gatewayTransactionId: cibpayOrder.id,
        },
      });

      return {
        id: updated.id,
        paymentUrl: updated.cibpayPaymentUrl,
        status: updated.status,
        method: updated.method,
      };
    } catch (err) {
      const e = err as {
        message?: string;
        response?: { data?: { failure_type?: string; failure_message?: string } };
      };
      const reason =
        e.response?.data?.failure_message ||
        e.response?.data?.failure_type ||
        e.message ||
        'CIBPAY create order failed';
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failedAt: new Date(),
          failureReason: reason,
        },
      });
      throw err;
    }
  }

  async syncCibpayStatus(paymentId: string): Promise<{ status: PaymentStatus; cibpayStatus: string | null }> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.method !== PaymentMethod.CARD) {
      throw new BadRequestException('Only CARD payments sync from CIBPAY');
    }
    if (!payment.cibpayOrderId) {
      throw new BadRequestException('Payment has no associated CIBPAY order');
    }

    const cibpayOrder = await this.cibpay.getOrder(payment.id, payment.cibpayOrderId, [
      'operations',
      'card',
      'secure3d',
    ]);
    const mapped = mapCibpayStatus(cibpayOrder.status);
    const now = new Date();

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        cibpayStatus: cibpayOrder.status,
        cibpayLastSyncedAt: now,
        cardLast4: this.extractLast4(cibpayOrder.pan),
        cardBrand: cibpayOrder.card?.type,
      },
    });

    if (
      payment.status === PaymentStatus.CONFIRMED ||
      payment.status === PaymentStatus.REFUNDED ||
      payment.status === PaymentStatus.FAILED
    ) {
      return { status: payment.status, cibpayStatus: cibpayOrder.status };
    }

    if (mapped === PaymentStatus.CONFIRMED && isTerminalCibpayStatus(cibpayOrder.status)) {
      await this.confirmPayment(payment.id);
      return { status: PaymentStatus.CONFIRMED, cibpayStatus: cibpayOrder.status };
    }

    if (mapped === PaymentStatus.FAILED && isTerminalCibpayStatus(cibpayOrder.status)) {
      const lastOp = (cibpayOrder.operations ?? []).slice(-1)[0] as
        | { iso_message?: string; iso_response_code?: string }
        | undefined;
      const secure3d = cibpayOrder.secure3d as { scenario?: string; reason?: string } | undefined;
      const secureReason =
        secure3d?.scenario === 'error'
          ? '3D Secure failed (OTP not confirmed or 3DS error)'
          : undefined;
      const reason =
        (cibpayOrder.failure_message as string) ||
        (lastOp?.iso_message
          ? `${lastOp.iso_message}${lastOp.iso_response_code ? ` (iso ${lastOp.iso_response_code})` : ''}`
          : null) ||
        secureReason ||
        `CIBPAY status: ${cibpayOrder.status}`;
      // Atomic CAS — only the first concurrent caller flips PENDING→FAILED and emits the event.
      const flipped = await this.prisma.payment.updateMany({
        where: { id: payment.id, status: PaymentStatus.PENDING },
        data: {
          status: PaymentStatus.FAILED,
          failedAt: now,
          failureReason: reason,
        },
      });
      if (flipped.count > 0) {
        await this.prisma.orderEvent.create({
          data: {
            orderId: payment.orderId,
            actor: 'Platform',
            event: 'PAYMENT_FAILED',
            note: `CIBPAY status: ${cibpayOrder.status}`,
          },
        });
      }
      return { status: PaymentStatus.FAILED, cibpayStatus: cibpayOrder.status };
    }

    return { status: payment.status, cibpayStatus: cibpayOrder.status };
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

    return this.prisma.$transaction(async (tx) => {
      // Atomic CAS — only one concurrent caller flips the row and emits the event.
      const flipped = await tx.payment.updateMany({
        where: { id: paymentId, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.CONFIRMED, confirmedAt: now },
      });
      if (flipped.count === 0) return null;

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.VERIFIED,
          paymentStatus: PaymentStatus.CONFIRMED,
          paymentConfirmedAt: now,
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId: payment.orderId,
          actor: isManual ? 'Finance' : 'Platform',
          actorId: actorUserId,
          event: 'PAYMENT_CONFIRMED',
          note: isManual ? 'Payment manually confirmed' : 'Payment confirmed',
        },
      });
      return tx.payment.findUnique({ where: { id: paymentId } });
    });
  }

  async rejectPayment(paymentId: string, reason: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.FAILED, failureReason: reason, failedAt: new Date() },
    });
  }

  async refundPayment(paymentId: string, actorUserId: string, amount?: number, reason?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.CONFIRMED) {
      throw new BadRequestException('Only CONFIRMED payments can be refunded');
    }
    if (payment.method !== PaymentMethod.CARD) {
      throw new BadRequestException('Refund via CIBPAY is only supported for CARD payments');
    }
    if (!payment.cibpayOrderId) {
      throw new BadRequestException('Payment has no CIBPAY order id');
    }

    const refundAmt = amount ?? Number(payment.amountAzn);
    if (refundAmt <= 0 || refundAmt > Number(payment.amountAzn)) {
      throw new BadRequestException('Refund amount must be > 0 and <= original amount');
    }

    const cibpayOrder = await this.cibpay.refund(payment.id, payment.cibpayOrderId, refundAmt.toFixed(2));
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REFUNDED,
          cibpayStatus: cibpayOrder.status,
          cibpayLastSyncedAt: now,
          refundInitiatedAt: now,
          refundedAt: now,
          refundAmount: refundAmt,
          refundReference: cibpayOrder.id,
          failureReason: reason || null,
        },
      }),
      this.prisma.orderEvent.create({
        data: {
          orderId: payment.orderId,
          actor: 'Finance',
          actorId: actorUserId,
          event: 'PAYMENT_REFUNDED',
          note: reason ? `Refund ${refundAmt} AZN — ${reason}` : `Refund ${refundAmt} AZN`,
        },
      }),
    ]);

    return this.prisma.payment.findUnique({ where: { id: payment.id } });
  }

  async cancelPayment(paymentId: string, actorUserId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.method !== PaymentMethod.CARD) {
      throw new BadRequestException('Cancel via CIBPAY is only supported for CARD payments');
    }
    if (!payment.cibpayOrderId) {
      throw new BadRequestException('Payment has no CIBPAY order id');
    }
    if (payment.status === PaymentStatus.REFUNDED || payment.status === PaymentStatus.FAILED) {
      throw new BadRequestException(`Payment is already ${payment.status}`);
    }

    const cibpayOrder = await this.cibpay.cancel(payment.id, payment.cibpayOrderId);
    const now = new Date();
    const newStatus =
      cibpayOrder.status === 'refunded'
        ? PaymentStatus.REFUNDED
        : cibpayOrder.status === 'reversed'
          ? PaymentStatus.FAILED
          : mapCibpayStatus(cibpayOrder.status);

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          cibpayStatus: cibpayOrder.status,
          cibpayLastSyncedAt: now,
          cancelledAt: now,
          cancelledReason: reason,
          refundedAt: newStatus === PaymentStatus.REFUNDED ? now : payment.refundedAt,
          refundAmount: newStatus === PaymentStatus.REFUNDED ? Number(payment.amountAzn) : payment.refundAmount,
          refundReference: newStatus === PaymentStatus.REFUNDED ? cibpayOrder.id : payment.refundReference,
        },
      }),
      this.prisma.orderEvent.create({
        data: {
          orderId: payment.orderId,
          actor: 'Finance',
          actorId: actorUserId,
          event: 'PAYMENT_CANCELLED',
          note: reason ? `Cancelled — ${reason} (cibpay: ${cibpayOrder.status})` : `Cancelled (cibpay: ${cibpayOrder.status})`,
        },
      }),
    ]);

    return this.prisma.payment.findUnique({ where: { id: payment.id } });
  }

  async findByOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    return this.prisma.payment.findFirst({
      where: { orderId: order.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  private extractLast4(pan?: string): string | undefined {
    if (!pan) return undefined;
    const clean = pan.replace(/\D/g, '');
    return clean.length >= 4 ? clean.slice(-4) : undefined;
  }
}
