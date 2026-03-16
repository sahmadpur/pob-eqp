import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStatus, TransportType, CargoType, PaymentMethod } from '@pob-eqp/shared';
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
        planQueueType: true,          // schema relation name
        timeline: { orderBy: { createdAt: 'asc' } }, // schema relation name
        documents: true,
        payments: true,
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
