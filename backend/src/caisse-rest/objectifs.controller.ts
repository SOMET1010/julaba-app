import { BadRequestException, Controller, Get, Post, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObjectifJournalier } from './objectif-journalier.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('objectifs')
@UseGuards(JwtAuthGuard)
export class ObjectifsController {
  constructor(
    @InjectRepository(ObjectifJournalier)
    private repo: Repository<ObjectifJournalier>,
  ) {}

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  @Get('today')
  async getToday(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const date = this.today();
    let obj = await this.repo.findOne({ where: { userId, date } });
    if (!obj) return { objectif: 0, alerte50: false, alerte80: false, date };
    return { objectif: Number(obj.objectif), alerte50: obj.alerte50, alerte80: obj.alerte80, date };
  }

  @Post('today')
  async setToday(@Req() req: any, @Body() body: { objectif: number }) {
    const val = Number(body.objectif);
    if (isNaN(val) || val < 0) throw new BadRequestException('objectif invalide');
    body.objectif = val;
    const userId = req.user?.sub || req.user?.id;
    const date = this.today();
    let obj = await this.repo.findOne({ where: { userId, date } });
    if (!obj) {
      obj = this.repo.create({ userId, date, objectif: body.objectif, alerte50: false, alerte80: false });
    } else {
      obj.objectif = body.objectif;
      obj.alerte50 = false;
      obj.alerte80 = false;
    }
    await this.repo.save(obj);
    return { objectif: Number(obj.objectif), alerte50: false, alerte80: false, date };
  }

  @Patch('alerte')
  async updateAlerte(@Req() req: any, @Body() body: { alerte50?: boolean; alerte80?: boolean }) {
    const userId = req.user?.sub || req.user?.id;
    const date = this.today();
    let obj = await this.repo.findOne({ where: { userId, date } });
    if (!obj) return { ok: false };
    if (body.alerte50 !== undefined) obj.alerte50 = body.alerte50;
    if (body.alerte80 !== undefined) obj.alerte80 = body.alerte80;
    await this.repo.save(obj);
    return { ok: true };
  }
}
