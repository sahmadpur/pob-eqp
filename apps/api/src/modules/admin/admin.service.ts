import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AccountStatus, UserRole } from '@pob-eqp/shared';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(filter?: { role?: UserRole; accountStatus?: AccountStatus }) {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(filter?.role && { role: filter.role }),
        ...(filter?.accountStatus && { accountStatus: filter.accountStatus }),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        accountStatus: true,
        createdAt: true,
        lastLoginAt: true,
        individualProfile: { select: { firstName: true, lastName: true } },
        legalProfile: { select: { companyName: true, registrationStatus: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateAccountStatus(userId: string, status: AccountStatus, updatedById: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.auditLog.create({
      data: {
        action: 'UPDATE_ACCOUNT_STATUS',
        entity: 'User',
        entityId: userId,
        userId: updatedById,
        payload: { before: { accountStatus: user.accountStatus },
        after: { accountStatus: status } },
      },
    });

    return this.prisma.user.update({
      where: { id: userId },
      data: { accountStatus: status },
    });
  }

  async softDeleteUser(userId: string, deletedById: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.auditLog.create({
      data: {
        action: 'SOFT_DELETE_USER',
        entity: 'User',
        entityId: userId,
        userId: deletedById,
        payload: {
          before: { email: user.email, phone: user.phone, deletedAt: null },
          after: { email: `deleted-${userId}@deleted.pob.local`, deletedAt: new Date().toISOString() },
        },
      },
    });

    // Anonymize email + phone so the unique constraint is freed for re-registration
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted-${userId}@deleted.pob.local`,
        phone: `deleted-${userId}`,
      },
    });
  }

  async getSystemConfig() {
    const configs = await this.prisma.systemConfig.findMany();
    return Object.fromEntries(configs.map((c) => [c.key, c.value]));
  }

  async upsertSystemConfig(key: string, value: string, updatedById: string) {
    const existing = await this.prisma.systemConfig.findUnique({ where: { key } });

    if (existing) {
      await this.prisma.auditLog.create({
        data: {
          action: 'UPDATE_SYSTEM_CONFIG',
          entity: 'SystemConfig',
          entityId: key,
          userId: updatedById,
          payload: { before: { value: existing.value },
          after: { value } },
        },
      });
    }

    return this.prisma.systemConfig.upsert({
      where: { key },
      create: { key, value, updatedById },
      update: { value, updatedById },
    });
  }

  async getAuditLogs(filter?: { entity?: string; entityId?: string; userId?: string }) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(filter?.entity && { entity: filter.entity }),
        ...(filter?.entityId && { entityId: filter.entityId }),
        ...(filter?.userId && { userId: filter.userId }),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
