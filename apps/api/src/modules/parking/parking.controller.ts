import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ParkingService } from './parking.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole, ParkingSlotStatus } from '@pob-eqp/shared';
import { AssignSlotDto } from './dto/assign-slot.dto';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

@ApiTags('parking')
@Controller('parking')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  // Admin zone management — must come BEFORE generic `zones/:zoneId/...` routes
  // to avoid the dynamic param matching the literal `admin` segment.
  @Get('admin/zones')
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Admin: list zones with capacity, occupancy, and slot prefix' })
  async listZonesForAdmin() {
    return this.parkingService.listZonesForAdmin();
  }

  @Post('admin/zones')
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Admin: create a parking zone with N slots' })
  async createZone(@Body() dto: CreateZoneDto) {
    return this.parkingService.createZone(dto);
  }

  @Patch('admin/zones/:zoneId')
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Admin: update zone metadata and/or capacity (adds/removes slots)' })
  async updateZone(@Param('zoneId') zoneId: string, @Body() dto: UpdateZoneDto) {
    return this.parkingService.updateZone(zoneId, dto);
  }

  @Delete('admin/zones/:zoneId')
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Admin: delete a zone (only if no slots are in use)' })
  async deleteZone(@Param('zoneId') zoneId: string) {
    return this.parkingService.deleteZone(zoneId);
  }

  @Get('zones')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.CONTROL_TOWER_OPERATOR,
    UserRole.PARKING_CONTROLLER,
    UserRole.GATE_CONTROLLER,
  )
  @ApiOperation({ summary: 'Get all parking zones with slots' })
  async getZones() {
    return this.parkingService.getParkingZones();
  }

  @Get('occupancy')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.CONTROL_TOWER_OPERATOR,
    UserRole.PARKING_CONTROLLER,
  )
  @ApiOperation({ summary: 'Get parking occupancy summary' })
  async getOccupancy() {
    return this.parkingService.getParkingOccupancy();
  }

  @Get('zones/:zoneId/slots')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.CONTROL_TOWER_OPERATOR,
    UserRole.PARKING_CONTROLLER,
  )
  @ApiOperation({ summary: 'List slots for a zone, optionally filtered by status' })
  @ApiQuery({ name: 'status', required: false, enum: ParkingSlotStatus })
  async getSlotsForZone(
    @Param('zoneId') zoneId: string,
    @Query('status') status?: ParkingSlotStatus,
  ) {
    return this.parkingService.getSlotsForZone(zoneId, status);
  }

  @Post('assign')
  @Roles(UserRole.PARKING_CONTROLLER, UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Assign a parking slot to an order (manual zone + slot pick)' })
  async assignSlot(
    @Body() dto: AssignSlotDto,
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    return this.parkingService.assignParkingSlot(
      dto.orderId,
      dto.zoneId,
      dto.slotId,
      req.user.id,
    );
  }
}
