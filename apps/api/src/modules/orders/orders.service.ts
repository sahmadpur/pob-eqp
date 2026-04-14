import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStatus, TransportType, CargoType, PaymentMethod, UserRole } from '@pob-eqp/shared';
import { ORDER_CONSTANTS } from '@pob-eqp/shared';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private generateOrderId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${ORDER_CONSTANTS.ID_PREFIX}${timestamp}${random}`;
  }

  async createOrder(dto: {
    userId: string;
    userRole?: string;
    destination: string;
    queueType?: string;
    scheduledDate?: string;
    driverFullName: string;
    driverNationalId: string;
    driverPhone: string;
    driverLicense?: string;
    transportType: TransportType;
    vehiclePlateNumber?: string;
    vehicleMakeModel?: string;
    cargoType?: CargoType;
    cargoDescription?: string;
    cargoWeightTonnes?: number;
    isHazardous?: boolean;
    paymentMethod: PaymentMethod;
    // Optional — only provided when a planning slot is pre-selected
    planId?: string;
    planQueueTypeId?: string;
    planDayId?: string;
  }) {
    // Bank transfer only for legal entities
    if (dto.paymentMethod === PaymentMethod.BANK_TRANSFER && dto.userRole !== UserRole.CUSTOMER_LEGAL) {
      throw new BadRequestException('Bank transfer is only available for legal entity customers.');
    }

    // Validate that an ACTIVE plan covers the requested date
    if (dto.scheduledDate) {
      const date = new Date(dto.scheduledDate);
      const activePlan = await this.prisma.plan.findFirst({
        where: {
          status: 'ACTIVE',
          startDate: { lte: date },
          endDate: { gte: date },
        },
      });
      if (!activePlan) {
        throw new BadRequestException(
          'No operational plan exists for the selected date. Please choose a different date.',
        );
      }
    }

    const orderId = this.generateOrderId();

    // Fee calculation: 50 AZN base + 0.05 AZN/tonne + queue surcharge
    const baseFeeAzn = 50;
    const cargoFeeAzn = dto.cargoWeightTonnes ? +(dto.cargoWeightTonnes * 0.05).toFixed(2) : 0;
    const queueSurchargeAzn = dto.queueType === 'PRIORITY' ? 30 : dto.queueType === 'FAST_TRACK' ? 15 : 0;
    const totalAmountAzn = baseFeeAzn + cargoFeeAzn + queueSurchargeAzn;

    // Hazardous cargo → CARGO_DANGEROUS type
    const cargoType: CargoType | undefined = dto.isHazardous
      ? CargoType.HAZARDOUS
      : (dto.cargoType ?? undefined);

    return this.prisma.order.create({
      data: {
        orderId,
        userId: dto.userId,
        planId: dto.planId ?? null,
        planQueueTypeId: dto.planQueueTypeId ?? null,
        planDayId: dto.planDayId ?? null,
        status: OrderStatus.PENDING_PAYMENT,
        queueType: dto.queueType ?? null,
        destination: dto.destination,
        driverFullName: dto.driverFullName,
        driverNationalId: dto.driverNationalId,
        driverPhone: dto.driverPhone,
        driverLicense: dto.driverLicense ?? null,
        transportType: dto.transportType,
        vehiclePlateNumber: dto.vehiclePlateNumber ?? null,
        vehicleMakeModel: dto.vehicleMakeModel ?? null,
        cargoType: cargoType ?? null,
        cargoDescription: dto.cargoDescription ?? null,
        cargoWeightTonnes: dto.cargoWeightTonnes ?? null,
        paymentMethod: dto.paymentMethod,
        baseFeeAzn,
        queueSurchargeAzn,
        cargoFeeAzn,
        totalAmountAzn,
      },
    });
  }

  async findByOrderId(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderId },
      include: {
        user: { select: { id: true, email: true, phone: true } },
        planQueueType: true,
        timeline: { orderBy: { createdAt: 'asc' } },
        documents: true,
        payments: true,
        verification: true,
        clarificationRounds: { orderBy: { roundNumber: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    return order;
  }

  async findByUser(userId: string) {
    // No deletedAt on Order — just filter by userId
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { planQueueType: true, payments: true },
    });
  }

  async updateStatus(orderId: string, status: OrderStatus, actorId: string, note?: string) {
    const order = await this.prisma.order.findUnique({ where: { orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    return this.prisma.$transaction([
      this.prisma.order.update({ where: { orderId }, data: { status } }),
      this.prisma.orderEvent.create({
        data: {
          orderId: order.id,
          actor: 'Platform',
          actorId,
          event: status,   // schema uses `event` string field (not `status`)
          note,
        },
      }),
    ]);
  }

  async findAll(filters?: { status?: string; paymentMethod?: string }) {
    return this.prisma.order.findMany({
      where: {
        ...(filters?.status ? { status: filters.status as OrderStatus } : {}),
        ...(filters?.paymentMethod ? { paymentMethod: filters.paymentMethod as PaymentMethod } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, phone: true } },
        planQueueType: true,
        payments: true,
      },
    });
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.userId !== userId) throw new ForbiddenException('You do not own this order');
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Only orders awaiting payment can be cancelled');
    }

    return this.prisma.$transaction([
      this.prisma.order.update({
        where: { orderId },
        data: { status: OrderStatus.CANCELLED, cancelledAt: new Date(), cancelledReason: 'Cancelled by customer' },
      }),
      this.prisma.orderEvent.create({
        data: { orderId: order.id, actor: 'Customer', actorId: userId, event: 'CANCELLED', note: 'Cancelled by customer before payment' },
      }),
    ]);
  }

  async editOrder(
    orderId: string,
    userId: string,
    dto: {
      destination?: string;
      queueType?: string;
      scheduledDate?: string;
      driverFullName?: string;
      driverNationalId?: string;
      driverPhone?: string;
      driverLicense?: string;
      transportType?: TransportType;
      vehiclePlateNumber?: string;
      vehicleMakeModel?: string;
      cargoType?: CargoType;
      cargoDescription?: string;
      cargoWeightTonnes?: number;
      isHazardous?: boolean;
      paymentMethod?: PaymentMethod;
    },
  ) {
    const order = await this.prisma.order.findUnique({ where: { orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.userId !== userId) throw new ForbiddenException('You do not own this order');
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Only orders awaiting payment can be edited');
    }

    // Re-validate date coverage if date changed
    if (dto.scheduledDate) {
      const date = new Date(dto.scheduledDate);
      const activePlan = await this.prisma.plan.findFirst({
        where: { status: 'ACTIVE', startDate: { lte: date }, endDate: { gte: date } },
      });
      if (!activePlan) {
        throw new BadRequestException('No operational plan exists for the selected date. Please choose a different date.');
      }
    }

    // Recalculate fees with updated values
    const newQueueType = dto.queueType ?? order.queueType;
    const newCargoWeight = dto.cargoWeightTonnes ?? (order.cargoWeightTonnes ? Number(order.cargoWeightTonnes) : 0);
    const baseFeeAzn = 50;
    const cargoFeeAzn = newCargoWeight ? +(newCargoWeight * 0.05).toFixed(2) : 0;
    const queueSurchargeAzn = newQueueType === 'PRIORITY' ? 30 : newQueueType === 'FAST_TRACK' ? 15 : 0;
    const totalAmountAzn = baseFeeAzn + cargoFeeAzn + queueSurchargeAzn;

    const cargoType: CargoType | undefined | null = dto.isHazardous
      ? CargoType.HAZARDOUS
      : dto.cargoType !== undefined
        ? (dto.cargoType ?? null)
        : undefined;

    return this.prisma.order.update({
      where: { orderId },
      data: {
        ...(dto.destination !== undefined ? { destination: dto.destination } : {}),
        ...(dto.queueType !== undefined ? { queueType: dto.queueType } : {}),
        ...(dto.scheduledDate !== undefined ? { scheduledDate: new Date(dto.scheduledDate) } : {}),
        ...(dto.driverFullName !== undefined ? { driverFullName: dto.driverFullName } : {}),
        ...(dto.driverNationalId !== undefined ? { driverNationalId: dto.driverNationalId } : {}),
        ...(dto.driverPhone !== undefined ? { driverPhone: dto.driverPhone } : {}),
        ...(dto.driverLicense !== undefined ? { driverLicense: dto.driverLicense } : {}),
        ...(dto.transportType !== undefined ? { transportType: dto.transportType } : {}),
        ...(dto.vehiclePlateNumber !== undefined ? { vehiclePlateNumber: dto.vehiclePlateNumber } : {}),
        ...(dto.vehicleMakeModel !== undefined ? { vehicleMakeModel: dto.vehicleMakeModel } : {}),
        ...(cargoType !== undefined ? { cargoType } : {}),
        ...(dto.cargoDescription !== undefined ? { cargoDescription: dto.cargoDescription } : {}),
        ...(dto.cargoWeightTonnes !== undefined ? { cargoWeightTonnes: dto.cargoWeightTonnes } : {}),
        ...(dto.paymentMethod !== undefined ? { paymentMethod: dto.paymentMethod } : {}),
        baseFeeAzn,
        cargoFeeAzn,
        queueSurchargeAzn,
        totalAmountAzn,
      },
    });
  }

  async verifyOrder(
    orderId: string,
    actorId: string,
    dto: {
      checkDocumentsOk: boolean;
      checkDriverIdOk: boolean;
      checkVehicleOk: boolean;
      checkPaymentOk: boolean;
      upgradedToPriority?: boolean;
      internalNote?: string;
    },
  ) {
    const order = await this.prisma.order.findUnique({ where: { orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== OrderStatus.AWAITING_VERIFICATION) {
      throw new BadRequestException('Order is not in AWAITING_VERIFICATION status');
    }

    const now = new Date();

    return this.prisma.$transaction([
      this.prisma.orderVerification.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          verifierId: actorId,
          checkDocumentsOk: dto.checkDocumentsOk,
          checkDriverIdOk: dto.checkDriverIdOk,
          checkVehicleOk: dto.checkVehicleOk,
          checkPaymentOk: dto.checkPaymentOk,
          upgradedToPriority: dto.upgradedToPriority ?? false,
          internalNote: dto.internalNote ?? null,
          verifiedAt: now,
        },
        update: {
          verifierId: actorId,
          checkDocumentsOk: dto.checkDocumentsOk,
          checkDriverIdOk: dto.checkDriverIdOk,
          checkVehicleOk: dto.checkVehicleOk,
          checkPaymentOk: dto.checkPaymentOk,
          upgradedToPriority: dto.upgradedToPriority ?? false,
          internalNote: dto.internalNote ?? null,
          verifiedAt: now,
        },
      }),
      this.prisma.order.update({
        where: { orderId },
        data: { status: OrderStatus.VERIFIED },
      }),
      this.prisma.orderClarificationRound.updateMany({
        where: { orderId: order.id, closedAt: null },
        data: { closedAt: now },
      }),
      this.prisma.orderEvent.create({
        data: {
          orderId: order.id,
          actor: 'Finance',
          actorId,
          event: 'VERIFIED',
          note: dto.internalNote ?? null,
        },
      }),
    ]);
  }

  async requestClarification(
    orderId: string,
    actorId: string,
    requestNote: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== OrderStatus.AWAITING_VERIFICATION) {
      throw new BadRequestException('Order is not in AWAITING_VERIFICATION status');
    }

    const existingCount = await this.prisma.orderClarificationRound.count({
      where: { orderId: order.id },
    });
    if (existingCount >= 2) {
      throw new BadRequestException('Maximum 2 clarification rounds already reached for this order');
    }

    return this.prisma.$transaction([
      this.prisma.orderClarificationRound.create({
        data: {
          orderId: order.id,
          roundNumber: existingCount + 1,
          requestNote,
          requestedById: actorId,
        },
      }),
      this.prisma.order.update({
        where: { orderId },
        data: { status: OrderStatus.AWAITING_CLARIFICATION },
      }),
      this.prisma.orderEvent.create({
        data: {
          orderId: order.id,
          actor: 'Finance',
          actorId,
          event: 'CLARIFICATION_REQUESTED',
          note: requestNote,
        },
      }),
    ]);
  }

  async respondToClarification(
    orderId: string,
    userId: string,
    dto: { customerNote: string; customerDocIds?: string[] },
  ) {
    const order = await this.prisma.order.findUnique({ where: { orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.userId !== userId) throw new ForbiddenException('You do not own this order');
    if (order.status !== OrderStatus.AWAITING_CLARIFICATION) {
      throw new BadRequestException('Order is not in AWAITING_CLARIFICATION status');
    }

    const openRound = await this.prisma.orderClarificationRound.findFirst({
      where: { orderId: order.id, respondedAt: null },
    });
    if (!openRound) throw new NotFoundException('No open clarification round found for this order');

    const now = new Date();

    return this.prisma.$transaction([
      this.prisma.orderClarificationRound.update({
        where: { id: openRound.id },
        data: {
          customerNote: dto.customerNote,
          customerDocIds: dto.customerDocIds ?? [],
          respondedAt: now,
        },
      }),
      this.prisma.order.update({
        where: { orderId },
        data: { status: OrderStatus.AWAITING_VERIFICATION },
      }),
      this.prisma.orderEvent.create({
        data: {
          orderId: order.id,
          actor: 'Customer',
          actorId: userId,
          event: 'CLARIFICATION_RESPONDED',
          note: dto.customerNote,
        },
      }),
    ]);
  }

  async getDailyAvailability(planId: string, planQueueTypeId: string, planDayId: string) {
    const planDay = await this.prisma.planDay.findUnique({ where: { id: planDayId } });
    const queueType = await this.prisma.planQueueType.findUnique({
      where: { id: planQueueTypeId },
      include: { plan: true },
    });
    if (!queueType) throw new NotFoundException('Queue type not found');

    const totalQuota = planDay?.quotaOverride ?? queueType.plan.defaultDailyQuota;
    // quotaSharePercent is Decimal — convert to number for arithmetic
    const typeQuota = Math.floor((totalQuota * Number(queueType.quotaSharePercent)) / 100);

    const bookedCount = await this.prisma.order.count({
      where: {
        planQueueTypeId,
        planDayId,
        status: { notIn: [OrderStatus.CANCELLED] },
      },
    });

    return {
      totalQuota: typeQuota,
      booked: bookedCount,
      available: Math.max(0, typeQuota - bookedCount),
    };
  }
}
