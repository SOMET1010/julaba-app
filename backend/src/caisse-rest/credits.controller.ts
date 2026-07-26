import { BadRequestException, Controller, Get, NotFoundException, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@UseGuards(JwtAuthGuard)
@Controller('caisse/credits')
export class CreditsController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  // Matérialise l'argent RÉELLEMENT encaissé sur un crédit (acompte à la vente
  // ou remboursement) comme un mouvement de caisse de type 'encaissement_credit'.
  // Ce type est volontairement IGNORÉ des agrégats « ventes » et « dépenses » :
  // il n'alimente QUE la caisse (Convention A : le total de la vente à crédit
  // compte comme volume, mais seul le cash reçu entre en caisse). Idempotent
  // quand une clé est fournie (rejeu offline / backfill) ; sans clé, chaque
  // appel crée un mouvement distinct (paiements partiels successifs).
  private async enregistrerEncaissementCredit(
    userId: string, montant: number, description: string, idempotencyKey: string | null,
  ): Promise<void> {
    if (!(montant > 0)) return;
    try {
      await this.ds.query(
        `INSERT INTO caisse_transactions
           (type, montant, description, user_id, marchand_id, source, mode_paiement, produit, idempotency_key)
         SELECT 'encaissement_credit', $1, $2, $3, $3, 'credit', 'especes', $2, $4
         WHERE $4::text IS NULL
            OR NOT EXISTS (SELECT 1 FROM caisse_transactions WHERE idempotency_key = $4)`,
        [montant, description, userId, idempotencyKey],
      );
    } catch (e: any) {
      // Course sur la clé d'idempotence : le mouvement existe déjà -> on ignore.
      if (e?.code !== '23505') throw e;
    }
  }

  // ── GET tous les crédits du marchand ──────────────────
  @Get()
  async findAll(@CurrentUser() user: User) {
    const rows = await this.ds.query(
      `SELECT * FROM credits_avec_statut
       WHERE marchand_id = $1
       ORDER BY echeance ASC`,
      [user.id]
    );
    const total_du = rows
      .filter((r: any) => r.statut !== 'paye')
      .reduce((s: number, r: any) => s + parseFloat(r.montant_restant || 0), 0);
    return { credits: rows, total_du };
  }

  // ── POST créer un crédit ───────────────────────────────
  @Post()
  async create(@Body() body: any, @CurrentUser() user: User) {
    const {
      client_nom, client_phone = '', montant_total,
      acompte = 0, echeance, articles = [], notes = '', transaction_id = null
    } = body;

    if (!client_nom?.trim()) throw new BadRequestException('client_nom requis');
    if (!montant_total || isNaN(parseFloat(montant_total))) throw new BadRequestException('montant_total invalide');
    if (!echeance) throw new BadRequestException('echeance requise');

    const acompteParsed = parseFloat(String(acompte));
    const montantParsed = parseFloat(montant_total);
    if (acompteParsed > montantParsed) throw new BadRequestException('L\'acompte ne peut pas dépasser le montant total');

    // Créer ou mettre à jour le client
    await this.ds.query(
      `INSERT INTO clients (marchand_id, nom, phone, nb_credits, montant_du, derniere_visite)
       VALUES ($1, $2, $3, 1, $4, now())
       ON CONFLICT (marchand_id, nom)
       DO UPDATE SET
         nb_credits = clients.nb_credits + 1,
         montant_du = clients.montant_du + $4,
         phone = COALESCE(NULLIF($3,''), clients.phone),
         derniere_visite = now(),
         updated_at = now()`,
      [user.id, client_nom.trim(), client_phone, parseFloat(montant_total) - parseFloat(acompte)]
    );

    // Créer le crédit
    const result = await this.ds.query(
      `INSERT INTO credits
         (marchand_id, client_nom, client_phone, montant_total, acompte, echeance, articles, notes, transaction_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        user.id, client_nom.trim(), client_phone,
        parseFloat(montant_total), parseFloat(acompte),
        echeance, JSON.stringify(articles), notes,
        transaction_id
      ]
    );

    const creditCree = result[0];
    // L'acompte reçu à la vente est de l'argent encaissé -> mouvement de caisse.
    await this.enregistrerEncaissementCredit(
      user.id,
      parseFloat(String(acompte)) || 0,
      `Acompte crédit — ${client_nom.trim()}`,
      `credit-acompte-${creditCree.id}`,
    );

    return { credit: creditCree };
  }

  // ── PATCH marquer payé ────────────────────────────────
  @Patch(':id/payer')
  async marquerPaye(@Param('id') id: string, @CurrentUser() user: User) {
    const credit = await this.ds.query(
      `SELECT * FROM credits_avec_statut WHERE id=$1 AND marchand_id=$2`,
      [id, user.id]
    );
    if (!credit[0]) throw new NotFoundException('Crédit introuvable');

    await this.ds.query(
      `UPDATE credits SET statut='paye', paye_le=now(), updated_at=now()
       WHERE id=$1 AND marchand_id=$2`,
      [id, user.id]
    );

    // Mettre à jour le montant dû du client
    await this.ds.query(
      `UPDATE clients SET
         montant_du = GREATEST(0, montant_du - $1),
         updated_at = now()
       WHERE marchand_id=$2 AND nom=$3`,
      [parseFloat(credit[0].montant_restant || 0), user.id, credit[0].client_nom]
    );

    // Le solde payé est de l'argent encaissé aujourd'hui -> mouvement de caisse.
    // Clé par crédit : un crédit ne se solde qu'une fois (idempotent).
    await this.enregistrerEncaissementCredit(
      user.id,
      parseFloat(credit[0].montant_restant || 0),
      `Solde crédit — ${credit[0].client_nom}`,
      `credit-solde-${id}`,
    );

    return { success: true };
  }

  // ── PATCH paiement partiel ────────────────────────────
  @Patch(':id/acompte')
  async ajouterAcompte(@Param('id') id: string, @Body() body: any, @CurrentUser() user: User) {
    const montant = parseFloat(body.montant);
    if (isNaN(montant) || montant <= 0) throw new BadRequestException('montant invalide');

    const credit = await this.ds.query(
      `SELECT * FROM credits WHERE id=$1 AND marchand_id=$2`,
      [id, user.id]
    );
    if (!credit[0]) throw new NotFoundException('Crédit introuvable');

    const montantRestant = parseFloat(credit[0].montant_total) - parseFloat(credit[0].acompte);
    if (montant > montantRestant) throw new BadRequestException(`Montant dépasse le restant dû (${montantRestant} FCFA)`);

    // Mise à jour ATOMIQUE et RELATIVE (acompte = acompte + montant) directement
    // en base : deux paiements partiels simultanés s'additionnent correctement.
    // Avant, on lisait l'acompte puis on réécrivait sa valeur absolue -> deux
    // paiements concurrents s'écrasaient et de l'argent encaissé disparaissait.
    const maj = await this.ds.query(
      `UPDATE credits SET
         acompte = COALESCE(acompte,0) + $1,
         statut = CASE WHEN COALESCE(acompte,0) + $1 >= montant_total THEN 'paye' ELSE statut END,
         paye_le = CASE WHEN COALESCE(acompte,0) + $1 >= montant_total THEN now() ELSE paye_le END,
         updated_at = now()
       WHERE id=$2 AND marchand_id=$3
       RETURNING (COALESCE(acompte,0) >= montant_total) AS solde`,
      [montant, id, user.id]
    );
    const estSolde = maj?.[0]?.solde === true;

    // Décrémenter aussi la dette agrégée du client (oubli historique : seul
    // marquerPaye le faisait -> la dette restait figée après un paiement partiel).
    await this.ds.query(
      `UPDATE clients SET montant_du = GREATEST(0, COALESCE(montant_du,0) - $1), updated_at = now()
       WHERE marchand_id = $2 AND nom = $3`,
      [montant, user.id, credit[0].client_nom],
    );

    // Paiement partiel = argent encaissé -> mouvement de caisse (clé nulle :
    // chaque versement est un événement distinct, non idempotent).
    await this.enregistrerEncaissementCredit(
      user.id, montant, `Paiement crédit — ${credit[0].client_nom}`, null,
    );

    return { success: true, solde: estSolde };
  }

  // ── GET clients récents ────────────────────────────────
  @Get('clients')
  async getClients(@CurrentUser() user: User) {
    const rows = await this.ds.query(
      `SELECT * FROM clients
       WHERE marchand_id = $1
       ORDER BY derniere_visite DESC
       LIMIT 10`,
      [user.id]
    );
    return { clients: rows };
  }

  // ── GET crédits d'un client spécifique ────────────────
  @Get('clients/:nom')
  async getClientCredits(@Param('nom') nom: string, @CurrentUser() user: User) {
    const client = await this.ds.query(
      `SELECT * FROM clients WHERE marchand_id=$1 AND nom ILIKE $2`,
      [user.id, `%${nom}%`]
    );
    const credits = await this.ds.query(
      `SELECT * FROM credits WHERE marchand_id=$1 AND client_nom ILIKE $2
       ORDER BY created_at DESC`,
      [user.id, `%${nom}%`]
    );
    return { client: client[0] || null, credits };
  }
}
