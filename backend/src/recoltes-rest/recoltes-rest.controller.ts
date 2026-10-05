import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { Recolte, RecolteQualite, RecolteStatut } from "../producteur/recoltes/entities/recolte.entity";
import { normaliseSaisieBrute, valideSaisieBrute } from "../database/contrainte-saisie-recolte";

/** `undefined`/`null`/illisible -> null. Jamais 0 par defaut : un zero
 *  inventé serait une valeur, pas une absence. */
function lireNombre(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

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

    // SAISIE BRUTE — normalisee a la precision du schema PUIS validee. L'ordre
    // compte : valider une valeur qu'on n'ecrira pas telle quelle laisserait
    // PostgreSQL refuser ce que l'API vient d'accepter (0,0004 devient 0,000
    // et cesse d'etre strictement positif). On valide donc ce qu'on ecrit.
    const saisie = normaliseSaisieBrute({
      quantite,
      quantiteSaisie: lireNombre(body.quantite_saisie),
      uniteSaisie: typeof body.unite_saisie === 'string' ? body.unite_saisie : null,
      facteurSaisie: lireNombre(body.facteur_saisie),
    });
    const refus = valideSaisieBrute(saisie);
    if (refus) throw new BadRequestException(refus);

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
      // Les COMPOSANTES METIER de la saisie d'origine, conservees SEPAREMENT
      // de la quantite canonique (`quantite`, en kilos), avec une PRECISION
      // BORNEE PAR LE SCHEMA — numeric(12,3) et numeric(12,4). Ce n'est donc
      // pas « la saisie telle quelle » : une valeur plus fine serait arrondie,
      // et c'est pourquoi on l'arrondit AVANT de juger. Le serveur ne recalcule
      // rien ; absente (ancien client) -> null, jamais une valeur inventee.
      ...saisie,
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

    // CHANGER `quantite` PEUT CASSER LA COHERENCE DU TRIPLET DEJA ENREGISTRE.
    // La contrainte `NOT VALID` s'applique aux UPDATE : sans ce controle,
    // PostgreSQL renverrait un 23514 que personne sur le terrain ne comprend.
    // Mesure : aucun ecran n'appelle cette route aujourd'hui — on la protege
    // quand meme, parce qu'elle est ouverte.
    if (updateData.quantite !== undefined) {
      const avant = await this.repo.findOne({ where: { id, userId: user.id } });
      if (avant) {
        const refus = valideSaisieBrute({
          quantite: updateData.quantite,
          quantiteSaisie: avant.quantiteSaisie == null ? null : Number(avant.quantiteSaisie),
          uniteSaisie: avant.uniteSaisie ?? null,
          facteurSaisie: avant.facteurSaisie == null ? null : Number(avant.facteurSaisie),
        });
        if (refus) {
          throw new BadRequestException(
            `${refus} Modifier le poids d'une recolte qui porte sa saisie d'origine `
            + `exige de redeclarer cette saisie.`,
          );
        }
      }
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
