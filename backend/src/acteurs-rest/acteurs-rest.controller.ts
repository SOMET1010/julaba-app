import { paginate, parsePagination, buildMeta } from '../common/paginate';
import { Controller, Get, Patch, Body, Param, UseGuards, Query, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin_general')
@Controller('acteurs')
export class ActeursRestController {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  @Get()
  async findAll(@Query() query: any) {
    const { page, limit, search, order } = parsePagination(query);
    const skip = (page - 1) * limit;
    const qb = this.repo.createQueryBuilder('a');
    if (search) {
      qb.where("CONCAT(a.firstName, ' ', a.lastName) ILIKE :s OR a.phone ILIKE :s", { s: `%${search}%` });
    }
    qb.orderBy('a.createdAt', order).skip(skip).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, meta: buildMeta(page, limit, total) };
  }

  @Get(':id')
  @Roles('super_admin', 'admin_general', 'identificateur')
  findOne(@Param('id') id: string) {
    return this.repo.findOne({ where: { id } });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() currentUser: User) {
    const PROTECTED_FIELDS = ['role', 'status', 'validated', 'passwordHash', 'pinCodeHash', 'pinCodeEncryptedIdentificateur', 'mustChangePassword'];
    const sanitized: any = {};
    for (const key of Object.keys(body)) {
      if (!PROTECTED_FIELDS.includes(key)) sanitized[key] = body[key];
    }
    if (body.role !== undefined || body.status !== undefined || body.validated !== undefined) {
      if (currentUser.role !== 'super_admin' as any) {
        throw new ForbiddenException('Modification de rôle réservée au super_admin');
      }
      if (body.role !== undefined) sanitized.role = body.role;
      if (body.status !== undefined) sanitized.status = body.status;
      if (body.validated !== undefined) sanitized.validated = body.validated;
    }
    if (Object.keys(sanitized).length === 0) return { success: true };
    return this.repo.update(id, sanitized);
  }
}
