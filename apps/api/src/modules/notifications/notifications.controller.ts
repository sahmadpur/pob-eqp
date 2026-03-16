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
  async getUnread(@Request() req: { user: { sub: string } }) {
    return this.notificationsService.getUnread(req.user.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    return this.notificationsService.markAsRead(id, req.user.sub);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@Request() req: { user: { sub: string } }) {
    return this.notificationsService.markAllAsRead(req.user.sub);
  }

  @Post('preferences')
  @ApiOperation({ summary: 'Update notification preference' })
  async updatePreference(
    @Body() dto: { channel: NotificationChannel; category: NotificationCategory; enabled: boolean },
    @Request() req: { user: { sub: string } },
  ) {
    return this.notificationsService.updatePreference({ userId: req.user.sub, ...dto });
  }
}
