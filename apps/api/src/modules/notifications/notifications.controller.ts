import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { NotificationChannel, NotificationCategory } from '@pob-eqp/shared';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get unread notifications' })
  async getUnread(@Request() req: { user: { id: string; role: string; accountStatus: string } }) {
    return this.notificationsService.getUnread(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(@Param('id') id: string, @Request() req: { user: { id: string; role: string; accountStatus: string } }) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@Request() req: { user: { id: string; role: string; accountStatus: string } }) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Post('preferences')
  @ApiOperation({ summary: 'Update notification preference' })
  async updatePreference(
    @Body() dto: { channel: NotificationChannel; category: NotificationCategory; enabled: boolean },
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    return this.notificationsService.updatePreference({ userId: req.user.id, ...dto });
  }
}
