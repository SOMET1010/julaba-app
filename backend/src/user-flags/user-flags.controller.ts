import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserFlagsService } from './user-flags.service';
import { CreateUserFlagDto } from './dto/create-user-flag.dto';
import { ResolveUserFlagDto } from './dto/resolve-user-flag.dto';

@Controller('users/flags')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserFlagsController {
  constructor(private readonly service: UserFlagsService) {}

  @Post()
  @Roles('super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone')
  async create(@Body() dto: CreateUserFlagDto, @Request() req: any) {
    const ip = req.ip ?? req.headers['x-forwarded-for'];
    return this.service.create(dto, req.user.id, ip);
  }

  @Get()
  @Roles('super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain')
  async findAll(@Query('resolved') resolved: string, @Request() req: any) {
    const filters: { resolved?: boolean; zoneId?: string } = {};
    if (resolved === 'true') filters.resolved = true;
    else if (resolved === 'false') filters.resolved = false;

    if (req.user.role === 'gestionnaire_zone' && req.user.zoneId) {
      filters.zoneId = req.user.zoneId;
    }

    return this.service.findAll(filters);
  }

  @Patch(':id/resolve')
  @Roles('super_admin', 'admin_general', 'admin_national')
  async resolve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResolveUserFlagDto, @Request() req: any) {
    const ip = req.ip ?? req.headers['x-forwarded-for'];
    return this.service.resolve(id, dto, req.user.id, ip);
  }
}
