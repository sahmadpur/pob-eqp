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
    planId: string;
    planQueueTypeId: string;       // schema field (not queueTypeId)
    planDayId?: string;
    destination: string;
    driverFullName: string;        // schema field (not driverName)
    driverNationalId: string;
    driverPhone: string;
    driverLicense?: string;
    transportType: TransportType;
    vehiclePlateNumber?: string;
    vehicleMakeModel?: string;
    cargoType?: CargoType;
    cargoDescription?: string;
    cargoWeightTonnes?: number;
    paymentMethod: PaymentMethod;
    baseFeeAzn: number;
    totalAmountAzn: number;
  }) {
    const orderId = this.generateOrderId();

    return this.prisma.order.create({
      data: {
        orderId,
        userId: dto.userId,
        planId: dto.planId,
        planQueueTypeId: dto.planQueueTypeId,
        planDayId: dto.planDayId,
        status: OrderStatus.PENDING_PAYMENT,
        destination: dto.destination,
        driverFullName: dto.driverFullName,
        driverNationalId: dto.driverNationalId,
        driverPhone: dto.driverPhone,
        driverLicense: dto.driverLicense,
        transportType: dto.transportType,
        vehiclePlateNumber: dto.vehiclePlateNumber,
        vehicleMakeModel: dto.vehicleMakeModel,
        cargoType: dto.cargoType,
        cargoDescription: dto.cargoDescription,
        cargoWeightTonnes: dto.cargoWeightTonnes,
        paymentMethod: dto.paymentMethod,
        baseFeeAzn: dto.baseFeeAzn,
        totalAmountAzn: dto.totalAmountAzn,
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
