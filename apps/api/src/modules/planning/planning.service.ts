import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PlanStatus, DayStatus, BaseQueueType } from '@pob-eqp/shared';
import { QUEUE_DEFAULTS } from '@pob-eqp/shared';

@Injectable()
export class PlanningService {
  constructor(private readonly prisma: PrismaService) {}

  async createPlan(dto: {
    name: string;
    startDate: Date;
    endDate: Date;
    defaultDailyQuota?: number;
    createdById: string;
  }) {
    return this.prisma.plan.create({
      data: {
        name: dto.name,
        startDate: dto.startDate,
        endDate: dto.endDate,
        // QUEUE_DEFAULTS.DEFAULT_DAILY_QUOTA (not TOTAL_DAILY_QUOTA)
        defaultDailyQuota: dto.defaultDailyQuota ?? QUEUE_DEFAULTS.DEFAULT_DAILY_QUOTA,
        status: PlanStatus.DRAFT,
        createdById: dto.createdById,
        queueTypes: {
          create: [
            {
              name: BaseQueueType.PRIORITY,
              baseType: BaseQueueType.PRIORITY,
              // QUEUE_DEFAULTS.PRIORITY_PERCENT (not PRIORITY_SHARE)
              quotaSharePercent: QUEUE_DEFAULTS.PRIORITY_PERCENT,
              loadingSequence: 1,
            },
            {
              name: BaseQueueType.FAST_TRACK,
              baseType: BaseQueueType.FAST_TRACK,
              quotaSharePercent: QUEUE_DEFAULTS.FAST_TRACK_PERCENT,
              loadingSequence: 2,
            },
            {
              name: BaseQueueType.REGULAR,
              baseType: BaseQueueType.REGULAR,
              quotaSharePercent: QUEUE_DEFAULTS.REGULAR_PERCENT,
              loadingSequence: 3,
            },
          ],
        },
      },
      include: { queueTypes: true },
    });
  }

  async findActivePlan() {
    return this.prisma.plan.findFirst({
      where: { status: PlanStatus.ACTIVE },
      include: { queueTypes: true, days: { orderBy: { date: 'asc' } } },
    });
  }

  async findPlanById(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: { queueTypes: true, days: { orderBy: { date: 'asc' } } },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async activatePlan(id: string, activatedById: string) {
    const plan = await this.findPlanById(id);
    if (plan.status !== PlanStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT plans can be activated');
    }

    await this.prisma.plan.updateMany({
      where: { status: PlanStatus.ACTIVE },
      data: { status: PlanStatus.ARCHIVED },
    });

    // Schema Plan has activatedAt but no activatedById — log to PlanAudit instead
    const updated = await this.prisma.plan.update({
      where: { id },
      data: { status: PlanStatus.ACTIVE, activatedAt: new Date() },
    });

    await this.prisma.planAudit.create({
      data: {
        planId: id,
        actorId: activatedById,
        action: 'ACTIVATE',
        description: `Plan activated by ${activatedById}`,
      },
    });

    return updated;
  }

  async setDayStatus(planId: string, date: Date, status: DayStatus, updatedById: string) {
    // PlanDay schema has no updatedById — log to PlanAudit instead
    const existing = await this.prisma.planDay.findUnique({
      where: { planId_date: { planId, date } },
    });

    const day = existing
      ? await this.prisma.planDay.update({
          where: { planId_date: { planId, date } },
          data: { status },
        })
      : await this.prisma.planDay.create({
          data: { planId, date, status },
        });

    await this.prisma.planAudit.create({
      data: {
        planId,
        actorId: updatedById,
        action: 'EDIT_QUOTA',
        description: `Day ${date.toISOString().split('T')[0]} status set to ${status}`,
      },
    });

    return day;
  }
}
