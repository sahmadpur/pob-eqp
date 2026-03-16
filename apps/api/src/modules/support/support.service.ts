import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SupportTicketStatus, SupportTicketCategory, UserRole } from '@pob-eqp/shared';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(dto: {
    userId: string;
    category: SupportTicketCategory;
    subject: string;
    description: string;
    orderId?: string;
    isHardwareFailure?: boolean;
  }) {
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;

    return this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId: dto.userId,           // schema field: userId (not createdById)
        category: dto.category,
        subject: dto.subject,
        description: dto.description,
        orderId: dto.orderId,
        isHardwareFailure: dto.isHardwareFailure ?? false,
        status: SupportTicketStatus.OPEN,
      },
    });
  }

  async replyToTicket(dto: {
    ticketId: string;
    senderId: string;
    senderRole: UserRole;
    body: string;
  }) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: dto.ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw new ForbiddenException('Ticket is closed');
    }

    return this.prisma.supportMessage.create({
      data: {
        ticketId: dto.ticketId,
        senderId: dto.senderId,
        senderRole: dto.senderRole,   // schema field: senderRole (required)
        body: dto.body,               // schema field: body (not message)
      },
    });
  }

  async closeTicket(ticketId: string) {
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: SupportTicketStatus.CLOSED, closedAt: new Date() },
    });
  }

  async getTicketsByUser(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },              // schema field: userId (not createdById)
      orderBy: { createdAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async getAllTickets(filter?: { status?: SupportTicketStatus }) {
    return this.prisma.supportTicket.findMany({
      where: filter?.status ? { status: filter.status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, phone: true, role: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
  }
}
