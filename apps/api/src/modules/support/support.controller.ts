import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole, SupportTicketStatus, SupportTicketCategory } from '@pob-eqp/shared';

@ApiTags('support')
@Controller('support')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Create a support ticket' })
  async createTicket(
    @Body() dto: {
      category: SupportTicketCategory;
      subject: string;
      description: string;
      orderId?: string;
      isHardwareFailure?: boolean;
    },
    @Request() req: { user: { sub: string } },
  ) {
    return this.supportService.createTicket({ ...dto, userId: req.user.sub });
  }

  @Get('tickets/me')
  @ApiOperation({ summary: 'Get my support tickets' })
  async getMyTickets(@Request() req: { user: { sub: string } }) {
    return this.supportService.getTicketsByUser(req.user.sub);
  }

  @Get('tickets')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR)
  @ApiOperation({ summary: 'Get all support tickets (admin)' })
  async getAllTickets(@Query('status') status?: SupportTicketStatus) {
    return this.supportService.getAllTickets(status ? { status } : undefined);
  }

  @Post('tickets/:id/reply')
  @ApiOperation({ summary: 'Reply to a support ticket' })
  async reply(
    @Param('id') id: string,
    @Body() dto: { body: string },
    @Request() req: { user: { sub: string; role: UserRole } },
  ) {
    return this.supportService.replyToTicket({
      ticketId: id,
      senderId: req.user.sub,
      senderRole: req.user.role,
      body: dto.body,
    });
  }

  @Patch('tickets/:id/close')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR)
  @ApiOperation({ summary: 'Close a support ticket (admin)' })
  async close(@Param('id') id: string) {
    return this.supportService.closeTicket(id);
  }
}
