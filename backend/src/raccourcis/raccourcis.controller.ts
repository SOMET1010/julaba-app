import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Raccourci } from './raccourci.entity';

@UseGuards(JwtAuthGuard)
@Controller('raccourcis')
export class RaccourcisController {
  constructor(@InjectRepository(Raccourci) private repo: Repository<Raccourci>) {}

  @Get()
  async findAll(@Request() req: any) {
    const raccourcis = await this.repo.find({
      where: { userId: req.user.id },
      order: { createdAt: 'ASC' },
    });
    return raccourcis;
  }

  @Post()
  async create(@Body() body: any, @Request() req: any) {
    const count = await this.repo.count({ where: { userId: req.user.id } });
    if (count >= 5) throw new HttpException('Maximum 5 raccourcis atteint', HttpStatus.BAD_REQUEST);
    const raccourci = this.repo.create({
      userId: req.user.id,
      nom: body.nom,
      declencheur: body.declencheur?.toLowerCase().trim(),
      type: body.type || 'vente',
      action: body.action || {},
      actif: true,
    });
    return this.repo.save(raccourci);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const raccourci = await this.repo.findOne({ where: { id, userId: req.user.id } });
    if (!raccourci) throw new HttpException('Raccourci introuvable', HttpStatus.NOT_FOUND);
    await this.repo.delete(id);
    return { success: true };
  }

  @Get('match/:texte')
  async match(@Param('texte') texte: string, @Request() req: any) {
    const raccourcis = await this.repo.find({ where: { userId: req.user.id, actif: true } });
    const lower = texte.toLowerCase();
    const found = raccourcis.find(r => lower.includes(r.declencheur.toLowerCase()));
    return found || null;
  }
}
