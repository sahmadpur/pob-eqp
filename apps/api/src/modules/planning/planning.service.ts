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
    queueTypes?: Array<{
      name: string;
      baseType: string | null;
      quotaSharePercent: number;
      loadingSequence: number;
    }>;
  }) {
    // Reject if any non-ARCHIVED plan's date range overlaps
    const overlapping = await this.prisma.plan.findFirst({
      where: {
        status: { in: [PlanStatus.DRAFT, PlanStatus.ACTIVE] },
        startDate: { lte: dto.endDate },
        endDate: { gte: dto.startDate },
      },
    });
    if (overlapping) {
      const s = overlapping.startDate.toISOString().split('T')[0];
      const e = overlapping.endDate.toISOString().split('T')[0];
      throw new BadRequestException(
        `Date range overlaps with existing plan "${overlapping.name}" (${s} – ${e})`,
      );
    }

    const queueTypesToCreate = dto.queueTypes ?? [
      { name: BaseQueueType.PRIORITY,   baseType: BaseQueueType.PRIORITY,   quotaSharePercent: QUEUE_DEFAULTS.PRIORITY_PERCENT,   loadingSequence: 1 },
      { name: BaseQueueType.FAST_TRACK, baseType: BaseQueueType.FAST_TRACK, quotaSharePercent: QUEUE_DEFAULTS.FAST_TRACK_PERCENT, loadingSequence: 2 },
      { name: BaseQueueType.REGULAR,    baseType: BaseQueueType.REGULAR,    quotaSharePercent: QUEUE_DEFAULTS.REGULAR_PERCENT,    loadingSequence: 3 },
    ];

    return this.prisma.plan.create({
      data: {
        name: dto.name,
        startDate: dto.startDate,
        endDate: dto.endDate,
        defaultDailyQuota: dto.defaultDailyQuota ?? QUEUE_DEFAULTS.DEFAULT_DAILY_QUOTA,
        status: PlanStatus.DRAFT,
        createdById: dto.createdById,
        queueTypes: {
          create: queueTypesToCreate.map((qt) => ({
            name: qt.name,
            baseType: (qt.baseType as BaseQueueType) ?? null,
            quotaSharePercent: qt.quotaSharePercent,
            loadingSequence: qt.loadingSequence,
          })),
        },
      },
      include: { queueTypes: true },
    });
  }

  async findAllPlans() {
    return this.prisma.plan.findMany({
      orderBy: { createdAt: 'desc' },
      include: { queueTypes: { orderBy: { loadingSequence: 'asc' } } },
    });
  }

  async checkDateCovered(dateStr: string) {
    const date = new Date(dateStr);
    const plan = await this.prisma.plan.findFirst({
      where: {
        status: PlanStatus.ACTIVE,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      select: { id: true, name: true, startDate: true, endDate: true },
    });
    return { covered: !!plan, plan: plan ?? null };
  }

  async findActivePlan() {
    return this.prisma.plan.findFirst({
      where: { status: PlanStatus.ACTIVE },
      include: { queueTypes: { orderBy: { loadingSequence: 'asc' } }, days: { orderBy: { date: 'asc' } } },
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

    // Only archive ACTIVE plans whose date range overlaps with this plan
    // Plans with non-overlapping dates remain ACTIVE
    await this.prisma.plan.updateMany({
      where: {
        status: PlanStatus.ACTIVE,
        startDate: { lte: plan.endDate },
        endDate: { gte: plan.startDate },
      },
      data: { status: PlanStatus.ARCHIVED, archivedAt: new Date() },
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

  async updatePlan(
    id: string,
    dto: {
      name?: string;
      startDate?: Date;
      endDate?: Date;
      defaultDailyQuota?: number;
      queueTypes?: Array<{ name: string; baseType: string | null; quotaSharePercent: number; loadingSequence: number }>;
    },
    updatedById: string,
  ) {
    const plan = await this.findPlanById(id);
    if (plan.status === PlanStatus.ARCHIVED) {
      throw new BadRequestException('Archived plans cannot be edited');
    }

    // Date overlap check (exclude the plan being updated)
    if (dto.startDate || dto.endDate) {
      const start = dto.startDate ?? plan.startDate;
      const end = dto.endDate ?? plan.endDate;
      const overlapping = await this.prisma.plan.findFirst({
        where: {
          id: { not: id },
          status: { in: [PlanStatus.DRAFT, PlanStatus.ACTIVE] },
          startDate: { lte: end },
          endDate: { gte: start },
        },
      });
      if (overlapping) {
        const s = overlapping.startDate.toISOString().split('T')[0];
        const e = overlapping.endDate.toISOString().split('T')[0];
        throw new BadRequestException(
          `Date range overlaps with existing plan "${overlapping.name}" (${s} – ${e})`,
        );
      }
    }

    await this.prisma.plan.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate }),
        ...(dto.defaultDailyQuota !== undefined && { defaultDailyQuota: dto.defaultDailyQuota }),
      },
    });

    if (dto.queueTypes) {
      await this.prisma.planQueueType.deleteMany({ where: { planId: id } });
      await this.prisma.planQueueType.createMany({
        data: dto.queueTypes.map((qt) => ({
          planId: id,
          name: qt.name,
          baseType: (qt.baseType as BaseQueueType) ?? null,
          quotaSharePercent: qt.quotaSharePercent,
          loadingSequence: qt.loadingSequence,
        })),
      });
    }

    await this.prisma.planAudit.create({
      data: { planId: id, actorId: updatedById, action: 'EDIT_QUOTA', description: 'Plan updated' },
    });

    return this.findPlanById(id);
  }

  async deletePlan(id: string) {
    const plan = await this.findPlanById(id);
    if (plan.status !== PlanStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT plans can be deleted');
    }
    await this.prisma.plan.delete({ where: { id } });
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
