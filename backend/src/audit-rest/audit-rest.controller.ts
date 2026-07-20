import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AuditLog } from './audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Roles('ADMIN')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditRestController {
  constructor(@InjectRepository(AuditLog) private repo: Repository<AuditLog>) {}
  @Get('me')
  @Roles()
  @UseGuards(JwtAuthGuard)
  async findMine(@CurrentUser() user: User, @Query('limit') limit = 10) {
    const take = Math.min(Number(limit) || 10, 50);
    const logs = await this.repo.find({
      where: { user_id: user.id },
      order: { created_at: 'DESC' },
      take,
    });
    return { logs, total: logs.length };
  }

  @Get() async findAll(@Query('page') page = 1, @Query('limit') limit = 50) { const take = Math.min(Number(limit) || 50, 200); const skip = (Number(page) - 1) * take; const [logs, total] = await this.repo.findAndCount({ order: { created_at: 'DESC' }, take, skip }); return { logs, meta: { total, page: Number(page), limit: take, pages: Math.ceil(total / take) } }; }
  @Post() create(@Body() body: CreateAuditLogDto, @CurrentUser() user: User) { return this.repo.save(this.repo.create({ ...body, user_id: user.id })); }
}