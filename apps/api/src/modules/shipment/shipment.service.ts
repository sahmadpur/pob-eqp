import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStatus, LoadingStatus } from '@pob-eqp/shared';
import { NO_SHOW } from '@pob-eqp/shared';
import { OrderNotificationsService } from '../orders/order-notifications.service';

@Injectable()
export class ShipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderNotifications: OrderNotificationsService,
  ) {}

  async recordGateCheckIn(dto: {
    orderId: string;
    method: string;
    checksResult: Record<string, boolean>;
    vehiclePlate?: string;
    operatorId: string;
  }) {
    const order = await this.prisma.order.findUnique({ where: { orderId: dto.orderId } });
    if (!order) throw new NotFoundException(`Order ${dto.orderId} not found`);
    if (order.status !== OrderStatus.VERIFIED) {
      throw new BadRequestException('Order must be VERIFIED before gate check-in');
    }

    const existing = await this.prisma.gateCheckIn.findUnique({ where: { orderId: order.id } });
    if (existing) throw new BadRequestException('Gate check-in already recorded');

    const gatePassNumber = `GP-${Date.now().toString(36).toUpperCase()}`;

    const [checkIn] = await this.prisma.$transaction([
      this.prisma.gateCheckIn.create({
        data: {
          orderId: order.id,
          method: dto.method,
          checksResult: dto.checksResult,
          gatePassNumber,
          operatorId: dto.operatorId,
        },
      }),
      this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.IN_SHIPMENT,
          noShowTimerStartedAt: new Date(Date.now() + NO_SHOW.DEFAULT_TIMER_MINUTES * 60 * 1000),
        },
      }),
      this.prisma.orderEvent.create({
        data: {
          orderId: order.id,
          event: 'GATE_CHECK_IN',
          actor: 'Gate',
          actorId: dto.operatorId,
          note: `Gate check-in via ${dto.method}. Pass: ${gatePassNumber}`,
        },
      }),
    ]);

    return { checkIn, gatePassNumber };
  }

  async recordGateClarification(dto: {
    orderId: string;
    operatorId: string;
    requestNote: string;
  }) {
    const order = await this.prisma.order.findUnique({
      where: { orderId: dto.orderId },
      include: { user: { select: { email: true } } },
    });
    if (!order) throw new NotFoundException(`Order ${dto.orderId} not found`);
    if (order.status !== OrderStatus.VERIFIED) {
      throw new BadRequestException('Order must be VERIFIED for gate to send to clarification');
    }

    const existingCount = await this.prisma.orderClarificationRound.count({
      where: { orderId: order.id },
    });
    if (existingCount >= 2) {
      throw new BadRequestException('Maximum 2 clarification rounds already reached for this order');
    }

    const roundNumber = existingCount + 1;

    const result = await this.prisma.$transaction([
      this.prisma.orderClarificationRound.create({
        data: {
          orderId: order.id,
          roundNumber,
          requestNote: dto.requestNote,
          requestedById: dto.operatorId,
        },
      }),
      this.prisma.order.update({
        where: { orderId: dto.orderId },
        data: { status: OrderStatus.AWAITING_CLARIFICATION },
      }),
      this.prisma.orderEvent.create({
        data: {
          orderId: order.id,
          actor: 'Gate',
          actorId: dto.operatorId,
          event: 'GATE_CLARIFICATION_REQUESTED',
          note: dto.requestNote,
        },
      }),
    ]);

    if (order.user?.email) {
      await this.orderNotifications.sendClarificationRequest(
        order.user.email,
        order.orderId,
        dto.requestNote,
        roundNumber,
      );
    }

    return result;
  }

  async updateLoadingStatus(dto: {
    orderId: string;
    loadingStatus: LoadingStatus;
    operatorId: string;
    note?: string;
  }) {
    const order = await this.prisma.order.findUnique({ where: { orderId: dto.orderId } });
    if (!order) throw new NotFoundException(`Order ${dto.orderId} not found`);

    const data: { loadingStatus: LoadingStatus; loadedAt?: Date } = {
      loadingStatus: dto.loadingStatus,
    };

    if (dto.loadingStatus === LoadingStatus.LOADED) data.loadedAt = new Date();

    return this.prisma.$transaction([
      this.prisma.order.update({ where: { orderId: dto.orderId }, data }),
      this.prisma.orderEvent.create({
        data: {
          orderId: order.id,
          event: `LOADING_${dto.loadingStatus}`,
          actor: 'Terminal',
          actorId: dto.operatorId,
          note: `Loading status: ${dto.loadingStatus}${dto.note ? ` — ${dto.note}` : ''}`,
        },
      }),
    ]);
  }

  async completeShipment(orderId: string, operatorId: string) {
    const order = await this.prisma.order.findUnique({ where: { orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    return this.prisma.$transaction([
      this.prisma.order.update({
        where: { orderId },
        data: { status: OrderStatus.COMPLETED, completedAt: new Date() },
      }),
      this.prisma.orderEvent.create({
        data: {
          orderId: order.id,
          event: 'SHIPMENT_COMPLETED',
          actor: 'Terminal',
          actorId: operatorId,
          note: 'Shipment completed',
        },
      }),
    ]);
  }

  async recordNoShow(orderId: string, systemActorId: string) {
    const order = await this.prisma.order.findUnique({ where: { orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    // Read no-show fine amount from SystemConfig (default 50 AZN per BRD)
    const fineConfig = await this.prisma.systemConfig.findUnique({
      where: { key: 'NO_SHOW_FINE_AZN' },
    });
    const fineAmountAzn = fineConfig ? parseFloat(fineConfig.value) : 50;

    return this.prisma.$transaction([
      this.prisma.order.update({
        where: { orderId },
        data: { status: OrderStatus.NO_SHOW, noShowDetectedAt: new Date() },
      }),
      this.prisma.fine.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          type: 'NO_SHOW' as const,
          amountAzn: fineAmountAzn,
          note: 'Automatic no-show fine — truck did not arrive within 30 minutes',
          issuedById: systemActorId,
        },
      }),
      this.prisma.orderEvent.create({
        data: {
          orderId: order.id,
          event: 'NO_SHOW',
          actor: 'Platform',
          actorId: systemActorId,
          note: 'No-show timer expired',
        },
      }),
    ]);
  }
}
