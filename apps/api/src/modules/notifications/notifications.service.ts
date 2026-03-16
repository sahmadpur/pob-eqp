import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationChannel, NotificationCategory } from '@pob-eqp/shared';

interface SendNotificationDto {
  userId: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  actionUrl?: string;
}

// Maps channel+category to the corresponding boolean field on NotificationPreference
function prefField(channel: NotificationChannel, category: NotificationCategory): string | null {
  const ch = channel.toLowerCase() as 'push' | 'email' | 'sms' | 'in_app';
  const cat = category.toLowerCase() as 'orders' | 'payments' | 'shipment' | 'system' | 'registration';
  if (ch === 'in_app') return null; // always deliver in-app
  const catMap: Record<string, string> = {
    orders: 'Orders',
    payments: 'Payments',
    registration: 'Orders', // map registration to orders bucket
    shipment: 'Shipment',
    system: 'System',
  };
  const chMap: Record<string, string> = { push: 'push', email: 'email', sms: 'sms' };
  const mappedCat = catMap[cat];
  const mappedCh = chMap[ch];
  if (!mappedCat || !mappedCh) return null;
  return `${mappedCh}${mappedCat}`; // e.g. 'pushOrders', 'emailPayments'
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly notifQueue: Queue,
  ) {}

  async send(dto: SendNotificationDto) {
    // Check user preferences (only for non-IN_APP channels)
    const field = prefField(dto.channel, dto.category);
    if (field) {
      const pref = await this.prisma.notificationPreference.findUnique({
        where: { userId: dto.userId },
      });
      if (pref && !(pref as unknown as Record<string, boolean>)[field]) {
        this.logger.debug(`Skipped — ${dto.userId} disabled ${dto.channel}/${dto.category}`);
        return;
      }
    }

    // Store in DB (Notification has no metadata field in schema)
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        body: dto.body,
        channel: dto.channel,
        category: dto.category,
        actionUrl: dto.actionUrl,
      },
    });

    // Queue for delivery
    await this.notifQueue.add(
      'deliver',
      { notificationId: notification.id, ...dto },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    return notification;
  }

  async sendBulk(notifications: SendNotificationDto[]) {
    return Promise.all(notifications.map((n) => this.send(n)));
  }

  async getUnread(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Update a single channel+category preference toggle.
   * Schema uses flat boolean columns (pushOrders, emailPayments, etc.)
   */
  async updatePreference(dto: {
    userId: string;
    channel: NotificationChannel;
    category: NotificationCategory;
    enabled: boolean;
  }) {
    const field = prefField(dto.channel, dto.category);
    if (!field) return; // IN_APP always enabled

    return this.prisma.notificationPreference.upsert({
      where: { userId: dto.userId },
      create: { userId: dto.userId, [field]: dto.enabled },
      update: { [field]: dto.enabled },
    });
  }

  async getPreferences(userId: string) {
    return this.prisma.notificationPreference.findUnique({ where: { userId } });
  }
}
