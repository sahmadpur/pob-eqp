import { Controller, Post, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlanningService } from './planning.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@pob-eqp/shared';

@ApiTags('planning')
@Controller('planning')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Post('plans')
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Create a new operational plan' })
  async createPlan(
    @Body() dto: { name: string; startDate: string; endDate: string; defaultDailyQuota?: number },
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    return this.planningService.createPlan({
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      createdById: req.user.id,
    });
  }

  @Get('plans/active')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CONTROL_TOWER_OPERATOR, UserRole.FINANCE_OFFICER)
  @ApiOperation({ summary: 'Get the currently active operational plan' })
  async getActivePlan() {
    return this.planningService.findActivePlan();
  }

  @Get('plans/:id')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CONTROL_TOWER_OPERATOR, UserRole.FINANCE_OFFICER)
  @ApiOperation({ summary: 'Get plan by ID' })
  async getPlan(@Param('id') id: string) {
    return this.planningService.findPlanById(id);
  }

  @Patch('plans/:id/activate')
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Activate a draft plan' })
  async activatePlan(@Param('id') id: string, @Request() req: { user: { id: string; role: string; accountStatus: string } }) {
    return this.planningService.activatePlan(id, req.user.id);
  }
}
