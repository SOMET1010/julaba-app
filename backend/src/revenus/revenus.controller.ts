import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Recolte } from '../producteur/recoltes/entities/recolte.entity';

@UseGuards(JwtAuthGuard)
@Controller('revenus')
export class RevenusController {
  constructor(@InjectRepository(Recolte) private readonly recolteRepo: Repository<Recolte>) {}

  @Get()
  async findAll(@Request() req: any) {
    const recoltes = await this.recolteRepo.find({ where: { userId: req.user.id }, order: { createdAt: 'DESC' } });
    const total = recoltes.reduce((sum, r) => sum + (Number(r.prixUnitaire) * Number(r.quantite)), 0);
    return { revenus: recoltes.map(r => ({
      id: r.id, produit: r.produit, quantite: r.quantite, prixUnitaire: r.prixUnitaire,
      montant: Number(r.prixUnitaire) * Number(r.quantite), date: r.createdAt, statut: r.statut,
    })), total };
  }
}
