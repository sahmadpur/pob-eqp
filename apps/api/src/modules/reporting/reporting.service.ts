import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStatus, FineStatus } from '@pob-eqp/shared';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDailySnapshot(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const [
      totalOrders,
      completedOrders,
      cancelledOrders,
      noShows,
      revenue,
      fines,
    ] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: start, lte: end } } }),
      this.prisma.order.count({ where: { status: OrderStatus.COMPLETED, updatedAt: { gte: start, lte: end } } }),
      this.prisma.order.count({ where: { status: OrderStatus.CANCELLED, updatedAt: { gte: start, lte: end } } }),
      this.prisma.order.count({ where: { status: OrderStatus.NO_SHOW, updatedAt: { gte: start, lte: end } } }),
      this.prisma.payment.aggregate({
        where: { status: 'CONFIRMED', confirmedAt: { gte: start, lte: end } },
        _sum: { amountAzn: true },
      }),
      this.prisma.fine.aggregate({
        where: { status: FineStatus.PAID, issuedAt: { gte: start, lte: end } },
        _sum: { amountAzn: true },
      }),
    ]);

    return {
      date: start.toISOString().split('T')[0],
      totalOrders,
      completedOrders,
      cancelledOrders,
      noShows,
      totalRevenue: revenue._sum.amountAzn ?? 0,
      totalFines: fines._sum?.amountAzn ?? 0,
    };
  }

  async getQueueUtilization(planId: string, _startDate?: Date, _endDate?: Date) {
    const orders = await this.prisma.order.groupBy({
      by: ['planDayId', 'planQueueTypeId'],
      where: {
        planId,
        status: { notIn: [OrderStatus.CANCELLED] },
      },
      _count: { id: true },
    });

    return orders;
  }

  /** Materialise daily snapshot at midnight */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async materializeDailySnapshot() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    try {
      const snapshot = await this.getDailySnapshot(yesterday);
      const dateStr = snapshot.date;

      await this.prisma.dailyReportSnapshot.upsert({
        where: { date: new Date(dateStr) },
        create: {
          date: new Date(dateStr),
          totalOrders: snapshot.totalOrders,
          completedOrders: snapshot.completedOrders,
          cancelledOrders: snapshot.cancelledOrders,
          noShowOrders: snapshot.noShows,
          totalRevenueAzn: snapshot.totalRevenue,
        },
        update: {
          totalOrders: snapshot.totalOrders,
          completedOrders: snapshot.completedOrders,
          cancelledOrders: snapshot.cancelledOrders,
          noShowOrders: snapshot.noShows,
          totalRevenueAzn: snapshot.totalRevenue,
        },
      });

      this.logger.log(`Daily snapshot materialised for ${dateStr}`);
    } catch (err) {
      this.logger.error('Failed to materialise daily snapshot', err);
    }
  }
}
