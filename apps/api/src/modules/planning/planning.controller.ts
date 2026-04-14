import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlanningService } from './planning.service';
import { WeatherService } from './weather.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '@pob-eqp/shared';

@ApiTags('planning')
@Controller('planning')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class PlanningController {
  constructor(
    private readonly planningService: PlanningService,
    private readonly weatherService: WeatherService,
  ) {}

  @Post('plans')
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Create a new operational plan' })
  async createPlan(
    @Body() dto: {
      name: string;
      startDate: string;
      endDate: string;
      defaultDailyQuota?: number;
      queueTypes?: Array<{
        name: string;
        baseType: string | null;
        quotaSharePercent: number;
        loadingSequence: number;
      }>;
    },
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    return this.planningService.createPlan({
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      createdById: req.user.id,
    });
  }

  @Get('check-date')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.CUSTOMER_INDIVIDUAL,
    UserRole.CUSTOMER_LEGAL,
    UserRole.FINANCE_OFFICER,
    UserRole.CONTROL_TOWER_OPERATOR,
  )
  @ApiOperation({ summary: 'Check if an active plan covers a given date' })
  async checkDate(@Query('date') date: string) {
    return this.planningService.checkDateCovered(date);
  }

  // Must be before plans/:id to avoid route shadowing
  @Get('weather-preview')
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Preview weather risk for a date range' })
  async getWeatherPreview(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.weatherService.getWeatherForRange(new Date(startDate), new Date(endDate));
  }

  @Get('plans')
  @Roles(UserRole.ADMINISTRATOR, UserRole.CONTROL_TOWER_OPERATOR, UserRole.FINANCE_OFFICER)
  @ApiOperation({ summary: 'List all plans' })
  async getAllPlans() {
    return this.planningService.findAllPlans();
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

  @Patch('plans/:id')
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Update a plan' })
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: {
      name?: string;
      startDate?: string;
      endDate?: string;
      defaultDailyQuota?: number;
      queueTypes?: Array<{ name: string; baseType: string | null; quotaSharePercent: number; loadingSequence: number }>;
    },
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    return this.planningService.updatePlan(
      id,
      {
        ...dto,
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
      },
      req.user.id,
    );
  }

  @Delete('plans/:id')
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Delete a DRAFT plan' })
  async deletePlan(@Param('id') id: string) {
    await this.planningService.deletePlan(id);
    return { deleted: true };
  }

  @Patch('plans/:id/activate')
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Activate a draft plan' })
  async activatePlan(@Param('id') id: string, @Request() req: { user: { id: string; role: string; accountStatus: string } }) {
    return this.planningService.activatePlan(id, req.user.id);
  }
}
