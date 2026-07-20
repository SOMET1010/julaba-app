import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Recolte, RecolteQualite, RecolteStatut } from './entities/recolte.entity';
import { UpdateRecolteDto } from './dto/update-recolte.dto';

const QUALITE_MAP: Record<string, RecolteQualite> = {
  standard: RecolteQualite.STANDARD,
  premium: RecolteQualite.PREMIUM,
  bio: RecolteQualite.BIO,
};

@UseGuards(JwtAuthGuard)
@Controller('recoltes')
export class RecoltesController {
  constructor(@InjectRepository(Recolte) private repo: Repository<Recolte>) {}

  @Get()
  async findAll(@Request() req: any) {
    // Isolation: un producteur ne voit que ses propres recoltes.
    const recoltes = await this.repo.find({
      where: { userId: req.user.id },
      order: { createdAt: 'DESC' },
    });
    return { recoltes };
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    // Isolation: une recolte n'est lisible que par son proprietaire.
    return this.repo.findOne({ where: { id, userId: req.user.id } });
  }

  @Post()
  async create(@Body() body: any, @Request() req: any) {
    const rawDate = body.date_recolte || body.dateRecolte;
    const recolte = this.repo.create({
      userId: req.user.id,
      cycleId: body.cycle_id || null,
      produit: body.produit || 'Inconnu',
      quantite: Number(body.quantite) || 0,
      unite: body.unite || 'kg',
      qualite: QUALITE_MAP[body.qualite] ?? RecolteQualite.STANDARD,
      dateRecolte: rawDate || new Date().toISOString().split('T')[0],
      statut: RecolteStatut.DECLAREE,
      prixUnitaire: Number(body.prix_unitaire) || 0,
      parcelle: body.parcelle || null,
      notes: body.notes || null,
    });
    return this.repo.save(recolte);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRecolteDto, @Request() req: any) {
    // Payload explicite mappe depuis le DTO valide (snake_case -> proprietes
    // entite). Aucun userId/id/stocks/cycleId ecrivable depuis le client.
    const payload: Partial<Recolte> = {};
    if (dto.produit !== undefined) payload.produit = dto.produit;
    if (dto.quantite !== undefined) payload.quantite = Number(dto.quantite);
    if (dto.unite !== undefined) payload.unite = dto.unite;
    if (dto.qualite !== undefined) payload.qualite = QUALITE_MAP[dto.qualite] ?? RecolteQualite.STANDARD;
    if (dto.date_recolte !== undefined) payload.dateRecolte = dto.date_recolte as any;
    if (dto.prix_unitaire !== undefined) payload.prixUnitaire = Number(dto.prix_unitaire);
    if (dto.parcelle !== undefined) payload.parcelle = dto.parcelle;
    if (dto.notes !== undefined) payload.notes = dto.notes;
    if (dto.photo_url !== undefined) payload.photoUrl = dto.photo_url;
    if (dto.statut !== undefined) payload.statut = dto.statut;

    // Isolation: le criteria inclut userId, donc rien n'est modifie si la
    // recolte n'appartient pas au user.
    await this.repo.update({ id, userId: req.user.id }, payload);
    const recolte = await this.repo.findOne({ where: { id, userId: req.user.id } });
    return { recolte };
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    // Isolation: suppression uniquement si la recolte appartient au user.
    return this.repo.delete({ id, userId: req.user.id });
  }
}
