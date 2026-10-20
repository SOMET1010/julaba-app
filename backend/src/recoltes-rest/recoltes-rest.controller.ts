import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, InjectDataSource } from "typeorm";
import { DataSource } from "typeorm";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { Recolte, RecolteQualite, RecolteStatut } from "../producteur/recoltes/entities/recolte.entity";

@UseGuards(JwtAuthGuard)
@Controller("recoltes")
export class RecoltesRestController {
  constructor(
    @InjectRepository(Recolte) private repo: Repository<Recolte>,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

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

  // Fusion INIT-011 : route ajoutée depuis producteur/recoltes/recoltes.controller.ts
  // (supprimé). L'implementation d'origine renvoyait l'entite nue ; on wrappe
  // dans { recolte } pour rester coherent avec les autres reponses de ce
  // controleur canonique.
  @Get(":id")
  async findOne(@Param("id") id: string, @CurrentUser() user: User) {
    const recolte = await this.repo.findOne({ where: { id, userId: user.id } });
    return { recolte };
  }

  // PROD-02 — les quantités COMMANDÉES deviennent visibles. Le journal
  // stock_reservations (une ligne par commande : active / convertie / liberee)
  // était écrit depuis B2 mais AUCUN endpoint ne le lisait — la barre
  // « Réservé » de l'écran récolte était branchée sur un champ jamais
  // alimenté (toujours 0), pendant que le marché seul voyait le décrément.
  // Fail-closed : la récolte doit appartenir à l'appelant.
  @Get(":id/reservations")
  async reservations(@Param("id") id: string, @CurrentUser() user: User) {
    const recolte = await this.repo.findOne({ where: { id, userId: user.id } });
    if (!recolte) throw new NotFoundException("Récolte introuvable");

    const lignes = await this.dataSource.query(
      `SELECT sr.id, sr.commande_id, sr.publication_id, sr.recolte_id, sr.quantite,
              sr.statut, sr.created_at,
              c.produit, c.statut AS commande_statut, c.acheteur_nom
         FROM stock_reservations sr
         LEFT JOIN publications p ON p.id::text = sr.publication_id::text
         LEFT JOIN commandes c ON c.id::text = sr.commande_id::text
        WHERE (p.recolte_id::text = $1 OR sr.recolte_id::text = $1)
        ORDER BY sr.created_at DESC`,
      [id],
    );
    const n = (v: unknown) => Number(v) || 0;
    const reserveActive = lignes
      .filter((l: any) => l.statut === 'active')
      .reduce((s: number, l: any) => s + n(l.quantite), 0);
    const reserveConvertie = lignes
      .filter((l: any) => l.statut === 'convertie')
      .reduce((s: number, l: any) => s + n(l.quantite), 0);
    return { data: lignes, meta: { reserveActive, reserveConvertie } };
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
