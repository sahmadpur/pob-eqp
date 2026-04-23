import { Controller, Get, Post, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@pob-eqp/shared';

@ApiTags('queue')
@Controller('queue')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get(':planId/:queueTypeId')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.CONTROL_TOWER_OPERATOR,
    UserRole.GATE_CONTROLLER,
    UserRole.TERMINAL_OPERATOR,
  )
  @ApiOperation({ summary: 'Get queue for a specific day and queue type' })
  async getQueue(
    @Param('planId') planId: string,
    @Param('queueTypeId') queueTypeId: string,
    @Query('date') date: string,
  ) {
    return this.queueService.getQueueForDay(planId, queueTypeId);
  }

  @Post('cascade/preview')
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Preview non-working day cascade migration' })
  async previewCascade(@Body() dto: { planId: string; date: string }) {
    return this.queueService.previewNonWorkingDayCascade(dto.planId, dto.date);
  }

  @Post('cascade/execute')
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Execute non-working day cascade migration' })
  async executeCascade(
    @Body() dto: { planId: string; date: string },
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    return this.queueService.executeNonWorkingDayCascade(
      dto.planId,
      dto.date,
      req.user.id,
    );
  }
}
