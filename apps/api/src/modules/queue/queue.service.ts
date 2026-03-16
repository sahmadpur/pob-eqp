import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStatus, DayStatus } from '@pob-eqp/shared';

@Injectable()
export class QueueService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('queue-management') private readonly queueBull: Queue,
  ) {}

  /**
   * FIFO queue for a given plan day + queue type.
   * Sorted by paymentConfirmedAt (server-generated, immutable).
   */
  async getQueueForDay(planDayId: string, planQueueTypeId: string) {
    return this.prisma.order.findMany({
      where: {
        planDayId,                   // schema field (not slotDate)
        planQueueTypeId,             // schema field (not queueTypeId)
        status: {
          in: [OrderStatus.VERIFIED, OrderStatus.IN_SHIPMENT, OrderStatus.AWAITING_VERIFICATION],
        },
      },
      orderBy: { paymentConfirmedAt: 'asc' },
      include: {
        user: { select: { id: true, email: true, phone: true } },
        planQueueType: true,         // schema relation name
      },
    });
  }

  /**
   * Preview: which orders would be migrated if a day is marked non-working.
   */
  async previewNonWorkingDayCascade(planId: string, planDayId: string) {
    const affectedOrders = await this.prisma.order.findMany({
      where: {
        planId,
        planDayId,
        status: {
          in: [OrderStatus.PENDING_PAYMENT, OrderStatus.AWAITING_VERIFICATION, OrderStatus.VERIFIED],
        },
      },
      orderBy: { paymentConfirmedAt: 'asc' },
      include: { planQueueType: true },
    });

    const targetDay = await this.findNextWorkingDay(planId, planDayId);

    return {
      affectedOrdersCount: affectedOrders.length,
      targetPlanDayId: targetDay?.id ?? null,
      targetDate: targetDay?.date ?? null,
      orders: affectedOrders.map((o) => ({
        orderId: o.orderId,
        queueType: o.planQueueType?.name ?? 'Unknown',
        driverFullName: o.driverFullName,   // schema: driverFullName
      })),
    };
  }

  async executeNonWorkingDayCascade(planId: string, planDayId: string, confirmedById: string) {
    const preview = await this.previewNonWorkingDayCascade(planId, planDayId);
    if (!preview.targetPlanDayId) {
      throw new NotFoundException('No available working day found for cascade');
    }

    const orderIds = await this.prisma.order.findMany({
      where: {
        planId,
        planDayId,
        status: {
          in: [OrderStatus.PENDING_PAYMENT, OrderStatus.AWAITING_VERIFICATION, OrderStatus.VERIFIED],
        },
      },
      select: { id: true, orderId: true },
    });

    await this.prisma.$transaction(
      orderIds.map((o) =>
        this.prisma.order.update({
          where: { id: o.id },
          data: { planDayId: preview.targetPlanDayId! },
        }),
      ),
    );

    await this.prisma.$transaction(
      orderIds.map((o) =>
        this.prisma.orderEvent.create({
          data: {
            orderId: o.id,
            actor: 'Platform',
            actorId: confirmedById,
            event: 'SLOT_MIGRATED',           // schema: event string field
            note: `Migrated to plan day ${preview.targetPlanDayId} (${preview.targetDate?.toISOString().split('T')[0]})`,
          },
        }),
      ),
    );

    return { migratedCount: orderIds.length, toDate: preview.targetDate };
  }

  private async findNextWorkingDay(planId: string, fromPlanDayId: string) {
    const fromDay = await this.prisma.planDay.findUnique({ where: { id: fromPlanDayId } });
    if (!fromDay) return null;

    const candidate = new Date(fromDay.date);
    candidate.setDate(candidate.getDate() + 1);

    for (let i = 0; i < 60; i++) {
      const dayRecord = await this.prisma.planDay.findUnique({
        where: { planId_date: { planId, date: candidate } },
      });
      if (!dayRecord || dayRecord.status === DayStatus.WORKING) {
        return dayRecord ?? null;
      }
      candidate.setDate(candidate.getDate() + 1);
    }

    return null;
  }
}
