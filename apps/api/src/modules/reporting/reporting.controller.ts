import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@pob-eqp/shared';

@ApiTags('reporting')
@Controller('reporting')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('daily')
  @Roles(UserRole.ADMINISTRATOR, UserRole.FINANCE_OFFICER, UserRole.CONTROL_TOWER_OPERATOR)
  @ApiOperation({ summary: 'Get daily operational snapshot' })
  async getDailySnapshot(@Query('date') date: string) {
    return this.reportingService.getDailySnapshot(new Date(date));
  }

  @Get('queue-utilization')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CONTROL_TOWER_OPERATOR)
  @ApiOperation({ summary: 'Get queue utilization by plan and date range' })
  async getQueueUtilization(
    @Query('planId') planId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportingService.getQueueUtilization(planId, new Date(startDate), new Date(endDate));
  }
}
