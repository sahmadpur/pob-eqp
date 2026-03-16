import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ParkingService } from './parking.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@pob-eqp/shared';

@ApiTags('parking')
@Controller('parking')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  @Get('zones')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.CONTROL_TOWER_OPERATOR,
    UserRole.PARKING_CHECKER,
    UserRole.GATE_OFFICER,
  )
  @ApiOperation({ summary: 'Get all parking zones with slots' })
  async getZones() {
    return this.parkingService.getParkingZones();
  }

  @Get('occupancy')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.CONTROL_TOWER_OPERATOR,
    UserRole.PARKING_CHECKER,
  )
  @ApiOperation({ summary: 'Get parking occupancy summary' })
  async getOccupancy() {
    return this.parkingService.getParkingOccupancy();
  }

  @Post('assign')
  @Roles(UserRole.GATE_OFFICER, UserRole.PARKING_CHECKER, UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Assign a parking slot to an order' })
  async assignSlot(
    @Body() dto: { orderId: string; cargoType: string },
    @Request() req: { user: { sub: string } },
  ) {
    return this.parkingService.assignParkingSlot(
      dto.orderId,
      dto.cargoType as Parameters<ParkingService['assignParkingSlot']>[1],
      req.user.sub,
    );
  }
}
