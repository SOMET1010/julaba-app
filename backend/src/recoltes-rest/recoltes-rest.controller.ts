import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { Recolte, RecolteQualite, RecolteStatut } from "../producteur/recoltes/entities/recolte.entity";

/**
 * Body de POST /recoltes — valeurs brutes issues du JSON client.
 *
 * Les champs sont permissifs (`string | number` selon le formulaire) car le
 * frontend envoie tantôt des chaînes, tantôt des nombres. La coercition et la
 * validation sont faites explicitement dans le corps du contrôleur.
 */
interface CreateRecolteBody {
  date_recolte?: string;
  dateRecolte?: string;
  cycle_id?: string;
  produit?: string;
  unite?: string;
  qualite?: string;
  quantite?: string | number;
  prix_unitaire?: string | number;
  parcelle?: string;
  notes?: string;
  photo_url?: string;
}

/**
 * Body de PATCH /recoltes/:id — tous les champs sont optionnels.
 */
interface UpdateRecolteBody {
  statut?: string;
  quantite?: string | number;
  prix_unitaire?: string | number;
  notes?: string;
  qualite?: string;
}

// Tables de traduction qualité : clé string envoyée par le client → enum métier.
const QUALITE_MAP: Readonly<Record<string, RecolteQualite>> = {
  standard: RecolteQualite.STANDARD,
  premium: RecolteQualite.PREMIUM,
  bio: RecolteQualite.BIO,
};

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

  // Fusion INIT-011 : route ajoutée depuis producteur/recoltes/recoltes.controller.ts
  // (supprimé). L'implementation d'origine renvoyait l'entite nue ; on wrappe
  // dans { recolte } pour rester coherent avec les autres reponses de ce
  // controleur canonique.
  @Get(":id")
  async findOne(@Param("id") id: string, @CurrentUser() user: User) {
    const recolte = await this.repo.findOne({ where: { id, userId: user.id } });
    return { recolte };
  }

  @Post()
  async create(@Body() body: CreateRecolteBody, @CurrentUser() user: User) {
    const rawDate = body.date_recolte || body.dateRecolte;
    const parsedDate = rawDate ? new Date(rawDate) : new Date();
    const dateRecolte = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    const quantite = Number(body.quantite) || 0;
    const pu = Number(body.prix_unitaire);
    const recolte = this.repo.create({
      userId: user.id,
      cycleId: body.cycle_id || null,
      produit: body.produit || "Inconnu",
      quantite,
      unite: body.unite || "kg",
      qualite: QUALITE_MAP[body.qualite ?? ""] ?? RecolteQualite.STANDARD,
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
  async update(@Param("id") id: string, @Body() body: UpdateRecolteBody, @CurrentUser() user: User) {
    const updateData: Partial<Recolte> = {};
    if (body.statut) {
      // Cast contrôlé : la DB valide l'enum en colonne (`type: 'enum'`).
      updateData.statut = body.statut as RecolteStatut;
    }
    if (body.quantite !== undefined) updateData.quantite = Number(body.quantite);
    if (body.prix_unitaire !== undefined) updateData.prixUnitaire = Number(body.prix_unitaire);
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.qualite) {
      // `QUALITE_MAP[body.qualite]` peut être `undefined` si la clé n'est pas
      // reconnue ; on retombe sur la valeur brute (cast contrôlé, la DB valide).
      updateData.qualite = QUALITE_MAP[body.qualite] ?? (body.qualite as RecolteQualite);
    }
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
