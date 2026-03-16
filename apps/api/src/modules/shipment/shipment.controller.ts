import { Controller, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShipmentService } from './shipment.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@pob-eqp/shared';

@ApiTags('shipment')
@Controller('shipment')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Post('gate-checkin')
  @Roles(UserRole.GATE_OFFICER, UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Record gate check-in for an order' })
  async gateCheckIn(
    @Body() dto: { orderId: string; method: string; checksResult: Record<string, boolean>; vehiclePlate?: string },
    @Request() req: { user: { sub: string } },
  ) {
    return this.shipmentService.recordGateCheckIn({ ...dto, operatorId: req.user.sub });
  }

  @Patch(':orderId/loading-status')
  @Roles(UserRole.TERMINAL_OPERATOR, UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Update loading status for an order' })
  async updateLoading(
    @Param('orderId') orderId: string,
    @Body() dto: { loadingStatus: string; note?: string },
    @Request() req: { user: { sub: string } },
  ) {
    return this.shipmentService.updateLoadingStatus({
      orderId,
      loadingStatus: dto.loadingStatus as Parameters<ShipmentService['updateLoadingStatus']>[0]['loadingStatus'],
      operatorId: req.user.sub,
      note: dto.note,
    });
  }

  @Post(':orderId/complete')
  @Roles(UserRole.TERMINAL_OPERATOR, UserRole.BORDER_OFFICER, UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Complete shipment for an order' })
  async complete(
    @Param('orderId') orderId: string,
    @Request() req: { user: { sub: string } },
  ) {
    return this.shipmentService.completeShipment(orderId, req.user.sub);
  }
}
