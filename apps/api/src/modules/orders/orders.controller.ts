import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@pob-eqp/shared';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  async createOrder(
    @Body() dto: Parameters<OrdersService['createOrder']>[0],
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    return this.ordersService.createOrder({ ...dto, userId: req.user.id });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my orders' })
  async getMyOrders(@Request() req: { user: { id: string; role: string; accountStatus: string } }) {
    return this.ordersService.findByUser(req.user.id);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get order details by orderId' })
  async getOrder(@Param('orderId') orderId: string) {
    return this.ordersService.findByOrderId(orderId);
  }

  @Get('availability/:planId/:queueTypeId')
  @ApiOperation({ summary: 'Get daily slot availability' })
  async getAvailability(
    @Param('planId') planId: string,
    @Param('queueTypeId') queueTypeId: string,
    @Query('date') date: string,
  ) {
    return this.ordersService.getDailyAvailability(planId, queueTypeId, date);
  }

  @Patch(':orderId/status')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.FINANCE_OFFICER,
    UserRole.CONTROL_TOWER_OPERATOR,
    UserRole.GATE_OFFICER,
    UserRole.TERMINAL_OPERATOR,
  )
  @ApiOperation({ summary: 'Update order status (staff only)' })
  async updateStatus(
    @Param('orderId') orderId: string,
    @Body() dto: { status: string; note?: string },
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    const [, event] = await this.ordersService.updateStatus(
      orderId,
      dto.status as Parameters<OrdersService['updateStatus']>[1],
      req.user.id,
      dto.note,
    );
    return event;
  }
}
