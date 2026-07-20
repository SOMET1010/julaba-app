import { BadRequestException, Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RaccourciVocal } from './raccourci-vocal.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const MAX_RACCOURCIS = 5;

@Controller('raccourcis')
@UseGuards(JwtAuthGuard)
export class RaccourcisController {
  constructor(
    @InjectRepository(RaccourciVocal)
    private repo: Repository<RaccourciVocal>,
  ) {}

  @Get()
  async getAll(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.repo.find({ where: { userId, actif: true }, order: { createdAt: 'ASC' } });
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const userId = req.user?.sub || req.user?.id;
    const count = await this.repo.count({ where: { userId, actif: true } });
    if (count >= MAX_RACCOURCIS) {
      throw new BadRequestException(`Maximum ${MAX_RACCOURCIS} raccourcis atteint`);
    }
    const raccourci = this.repo.create({
      userId,
      nom: body.nom,
      declencheur: body.declencheur?.toLowerCase().trim(),
      type: body.type,
      action: body.action,
      actif: true,
    });
    return this.repo.save(raccourci);
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const userId = req.user?.sub || req.user?.id;
    const raccourci = await this.repo.findOne({ where: { id, userId } });
    if (!raccourci) throw new NotFoundException('Raccourci introuvable');
    if (body.nom !== undefined) raccourci.nom = body.nom;
    if (body.declencheur !== undefined) raccourci.declencheur = body.declencheur?.toLowerCase().trim();
    if (body.type !== undefined) raccourci.type = body.type;
    if (body.action !== undefined) raccourci.action = body.action;
    if (body.actif !== undefined) raccourci.actif = body.actif;
    return this.repo.save(raccourci);
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub || req.user?.id;
    const raccourci = await this.repo.findOne({ where: { id, userId } });
    if (!raccourci) throw new NotFoundException('Raccourci introuvable');
    raccourci.actif = false;
    await this.repo.save(raccourci);
    return { ok: true };
  }

  @Get('match/:texte')
  async match(@Req() req: any, @Param('texte') texte: string) {
    const userId = req.user?.sub || req.user?.id;
    const raccourcis = await this.repo.find({ where: { userId, actif: true } });
    const texteLower = decodeURIComponent(texte).toLowerCase();
    const found = raccourcis.find(r =>
      texteLower.includes(r.declencheur.toLowerCase()) ||
      r.declencheur.toLowerCase().includes(texteLower)
    );
    return found ? { found: true, raccourci: found } : { found: false };
  }
}
