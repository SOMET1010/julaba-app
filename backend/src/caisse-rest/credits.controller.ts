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

    return { credit: result[0] };
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

    const nouvelAcompte = parseFloat(credit[0].acompte) + montant;
    const estSolde = nouvelAcompte >= parseFloat(credit[0].montant_total);

    await this.ds.query(
      `UPDATE credits SET
         acompte = $1,
         statut = CASE WHEN $2 THEN 'paye' ELSE statut END,
         paye_le = CASE WHEN $2 THEN now() ELSE paye_le END,
         updated_at = now()
       WHERE id=$3 AND marchand_id=$4`,
      [nouvelAcompte, estSolde, id, user.id]
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
