import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { Recolte, RecolteQualite, RecolteStatut } from "../producteur/recoltes/entities/recolte.entity";

@UseGuards(JwtAuthGuard)
@Controller("recoltes")
export class RecoltesRestController {
  constructor(@InjectRepository(Recolte) private repo: Repository<Recolte>) {}

  @Get()
  async findAll(@CurrentUser() user: User, @Query("page") page = 1, @Query("limit") limit = 20) {
    const [recoltes, total] = await this.repo.findAndCount({
      where: { userId: user.id },
      order: { createdAt: "DESC" },
      take: Math.min(Number(limit), 100),
      skip: (Number(page) - 1) * Math.min(Number(limit), 100),
    });
    return { recoltes, total };
  }

  @Post()
  async create(@Body() body: any, @CurrentUser() user: User) {
    const rawDate = body.date_recolte || body.dateRecolte;
    const parsedDate = rawDate ? new Date(rawDate) : new Date();
    const dateRecolte = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    const qualiteMap: Record<string, RecolteQualite> = {
      standard: RecolteQualite.STANDARD,
      premium: RecolteQualite.PREMIUM,
      bio: RecolteQualite.BIO,
    };

    const quantite = Number(body.quantite) || 0;
    const pu = Number(body.prix_unitaire);
    const recolte = this.repo.create({
      userId: user.id,
      cycleId: body.cycle_id || null,
      produit: body.produit || "Inconnu",
      quantite,
      unite: body.unite || "kg",
      qualite: qualiteMap[body.qualite] ?? RecolteQualite.STANDARD,
      dateRecolte: dateRecolte,
      statut: RecolteStatut.DECLAREE,
      prixUnitaire: Number.isFinite(pu) ? pu : 0,
      parcelle: body.parcelle || null,
      notes: body.notes || null,
      photoUrl: body.photo_url || null,
      stockDisponible: quantite,
      stockVendu: 0,
    });
    const saved = await this.repo.save(recolte);
    return { recolte: saved, ...saved };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: any, @CurrentUser() user: User) {
    const qualiteMap: Record<string, RecolteQualite> = {
      standard: RecolteQualite.STANDARD,
      premium: RecolteQualite.PREMIUM,
      bio: RecolteQualite.BIO,
    };
    const updateData: any = {};
    if (body.statut) updateData.statut = body.statut;
    if (body.quantite !== undefined) updateData.quantite = Number(body.quantite);
    if (body.prix_unitaire !== undefined) updateData.prixUnitaire = Number(body.prix_unitaire);
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.qualite) updateData.qualite = qualiteMap[body.qualite] ?? body.qualite;
    await this.repo.update({ id, userId: user.id }, updateData);
    const updated = await this.repo.findOne({ where: { id, userId: user.id } });
    return { recolte: updated };
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser() user: User) {
    await this.repo.delete({ id, userId: user.id });
    return { success: true };
  }
}
