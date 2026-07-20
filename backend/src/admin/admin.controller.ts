import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Roles('ADMIN')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() { return this.adminService.getStats(); }

  @Get('activity')
  getActivity(@Query('limit') limit = 50) { return this.adminService.getRecentActivity(Number(limit)); }

  @Get('health')
  getHealth() { return this.adminService.getSystemHealth(); }

  @Get('timeline')
  getTimeline() { return this.adminService.getTransactionsTimeline(); }
}
