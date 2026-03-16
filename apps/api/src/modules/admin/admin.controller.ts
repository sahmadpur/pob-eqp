import { Controller, Get, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole, AccountStatus } from '@pob-eqp/shared';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR)
@ApiBearerAuth('access-token')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  async listUsers(
    @Query('role') role?: UserRole,
    @Query('accountStatus') accountStatus?: AccountStatus,
  ) {
    return this.adminService.listUsers({ role, accountStatus });
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Update user account status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: { accountStatus: AccountStatus },
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    return this.adminService.updateAccountStatus(id, dto.accountStatus, req.user.id);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Soft-delete a user (7-year data retention)' })
  async deleteUser(@Param('id') id: string, @Request() req: { user: { id: string; role: string; accountStatus: string } }) {
    return this.adminService.softDeleteUser(id, req.user.id);
  }

  @Get('config')
  @ApiOperation({ summary: 'Get all system configuration values' })
  async getConfig() {
    return this.adminService.getSystemConfig();
  }

  @Patch('config/:key')
  @ApiOperation({ summary: 'Update a system configuration value' })
  async updateConfig(
    @Param('key') key: string,
    @Body() dto: { value: string },
    @Request() req: { user: { id: string; role: string; accountStatus: string } },
  ) {
    return this.adminService.upsertSystemConfig(key, dto.value, req.user.id);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs' })
  async getAuditLogs(
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.adminService.getAuditLogs({ entity, entityId, userId });
  }
}
