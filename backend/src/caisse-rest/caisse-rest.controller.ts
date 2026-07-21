import { BadRequestException, Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Optional, Logger } from '@nestjs/common';
import { EventsGateway } from '../events/events.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CaisseTransaction } from './caisse-transaction.entity';
import { AlertesService } from '../notifications/alertes.service';

@UseGuards(JwtAuthGuard)
@Controller('caisse')
export class CaisseRestController {
  private readonly logger = new Logger(CaisseRestController.name);

  constructor(
    @InjectRepository(CaisseTransaction) private repo: Repository<CaisseTransaction>,
    private dataSource: DataSource,
    @Optional() private alertesService?: AlertesService,
    @Optional() private eventsGateway?: EventsGateway,
  ) {}

  @Get('transactions')
  findAll(@CurrentUser() user: User) {
    return this.repo.find({ where: { user_id: user.id }, order: { created_at: 'DESC' } });
  }

  @Post('transactions')
  create(@Body() body: any, @CurrentUser() user: User) {
    const montant = parseFloat(body.montant) || 0;
    if (montant <= 0) throw new BadRequestException('montant invalide');
    const TYPES_AUTORISES = ['vente', 'depense', 'remboursement', 'ajustement'];
    if (!body.type || !TYPES_AUTORISES.includes(body.type)) {
      throw new BadRequestException(`type invalide - valeurs acceptées : ${TYPES_AUTORISES.join(', ')}`);
    }
    return this.repo.save(this.repo.create({
      user_id: user.id,
      marchand_id: user.id,
      type: body.type,
      montant,
      description: body.description || '',
      session_id: body.session_id || '',
      produit: body.produit || '',
      quantite: parseFloat(body.quantite) || 1,
      mode_paiement: body.mode_paiement || 'especes',
      source: body.source || 'kassa',
      category: body.category || '',
      prix_achat: parseFloat(body.prix_achat) || 0,
      prix_vente: parseFloat(body.prix_vente) || 0,
      marge: parseFloat(body.marge) || 0,
      benefice: parseFloat(body.benefice) || 0,
      details: body.details || null,
    }));
  }

  @Get('session/:date')
  async getSession(@Param('date') date: string, @CurrentUser() user: User) {
    const session = await this.dataSource.query(
      'SELECT * FROM caisse_sessions WHERE marchand_id = $1 AND date = $2 LIMIT 1',
      [user.id, date]
    );
    return { session: session[0] || null };
  }

  @Post('session/ouvrir')
  async ouvrirSession(@Body() body: any, @CurrentUser() user: User) {
    const today = new Date().toISOString().split('T')[0];
    const existing = await this.dataSource.query(
      'SELECT * FROM caisse_sessions WHERE marchand_id = $1 AND date = $2 LIMIT 1',
      [user.id, today]
    );
    if (existing[0]) return { session: existing[0] };
    const result = await this.dataSource.query(
      'INSERT INTO caisse_sessions (marchand_id, date, fond_initial, ouvert, heure_ouverture, notes) VALUES ($1, $2, $3, true, NOW(), $4) RETURNING *',
      [user.id, today, body.fond_initial || 0, body.notes || '']
    );
    return { session: result[0] };
  }

  @Post('session/fermer')
  async fermerSession(@Body() body: any, @CurrentUser() user: User) {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.dataSource.query(
      'UPDATE caisse_sessions SET ouvert = false, heure_fermeture = NOW(), fond_final = $1, updated_at = NOW() WHERE marchand_id = $2 AND date = $3 RETURNING *',
      [body.fond_final || 0, user.id, today]
    );
    return { session: result[0] };
  }

  // Idempotence : si la clé a déjà été traitée (rejeu offline), renvoyer la
  // transaction existante SANS en créer une nouvelle. Garde-fou anti double-comptage.
  private async transactionExistante(idemKey: string | null, userId: string) {
    if (!idemKey) return null;
    return this.repo.findOne({ where: { idempotency_key: idemKey, user_id: userId } as any });
  }
  // Course : deux requêtes concurrentes avec la même clé -> la 2e viole l'unicité,
  // on renvoie alors la transaction déjà enregistrée au lieu de propager l'erreur.
  private estViolationUnicite(e: any): boolean {
    return e?.code === '23505' || /duplicate key|unique/i.test(e?.message || '');
  }

  // Journée toujours ouverte : si aucune journée n'est ouverte aujourd'hui, on
  // l'ouvre automatiquement (choix produit : la vendeuse n'est jamais bloquée,
  // l'argent reste toujours rattaché à une journée). Idempotent via l'index
  // unique (marchand_id, date).
  private async ensureSessionOuverte(marchandId: string) {
    const today = new Date().toISOString().split('T')[0];
    await this.dataSource.query(
      `INSERT INTO caisse_sessions (marchand_id, date, fond_initial, ouvert, heure_ouverture)
       VALUES ($1, $2, 0, true, NOW())
       ON CONFLICT (marchand_id, date) DO UPDATE SET ouvert = true, updated_at = NOW()`,
      [marchandId, today],
    ).catch((e: any) => this.logger?.warn(`[CAISSE] ensureSession: ${e.message}`));
  }

  // Décrémente le stock des produits vendus (match par nom, insensible à la
  // casse). Sans effet si le nom ne correspond à aucun produit (vente libre/voix).
  private async decrementerStock(marchandId: string, lignes: Array<{ nom: string; qte: number }>) {
    for (const l of lignes) {
      if (!l.nom || !(l.qte > 0)) continue;
      await this.dataSource.query(
        `UPDATE produits SET stock = GREATEST(0, COALESCE(stock,0) - $1), updated_at = NOW()
         WHERE marchand_id = $2::text AND lower(nom) = lower($3) AND actif = true`,
        [l.qte, marchandId, l.nom],
      ).catch((e: any) => this.logger?.warn(`[CAISSE] decrementStock: ${e.message}`));
    }
  }

  @Post('vente')
  async enregistrerVente(@Body() body: any, @CurrentUser() user: User) {
    // Idempotence (rejeu offline) : ne jamais compter deux fois la même vente.
    const idemKey = body.idempotency_key || null;
    const deja = await this.transactionExistante(idemKey, user.id);
    if (deja) return { transaction: deja };

    // Validation stricte — rejeter si montant manquant ou invalide
    const montantParsed = parseFloat(body.montant);
    if (!body.montant || isNaN(montantParsed) || montantParsed <= 0) {
      throw new BadRequestException('montant invalide ou manquant');
    }
    // Extraire nom produit depuis le tableau produits si présent
    const lignes = Array.isArray(body.produits) ? body.produits
      : (body.produits && typeof body.produits === 'object' ? [body.produits] : []);
    const nomProduit = body.produit || body.description ||
      (lignes.length > 0
        ? lignes.map((p: any) => p.nom || p.name || '').filter(Boolean).join(', ')
        : '');
    const qteTotale = body.quantite || lignes.reduce((s: number, p: any) => s + (Number(p.quantite) || 1), 0) || 1;

    // Validation montant
    const prixVente = parseFloat(body.montant) || 0;
    if (prixVente <= 0) throw new BadRequestException('Le montant doit être positif');
    const prixAchat = parseFloat(body.prix_achat) || 0;
    const marge = prixAchat > 0 ? prixVente - prixAchat : 0;

    // Journée toujours ouverte (vente jamais bloquée, argent rattaché au jour).
    await this.ensureSessionOuverte(user.id);

    let result;
    try {
      result = await this.repo.save(this.repo.create({
        user_id: user.id, marchand_id: user.id,
        session_id: body.session_id || '', montant: body.montant,
        type: 'vente', produit: nomProduit, source: body.source || 'kassa', details: body.details || null,
        quantite: qteTotale, mode_paiement: body.mode_paiement || 'especes',
        description: nomProduit,
        prix_vente: prixVente, prix_achat: prixAchat, marge, benefice: marge,
        category: body.category || '', idempotency_key: idemKey,
      } as any));
    } catch (e: any) {
      if (this.estViolationUnicite(e)) {
        const existante = await this.transactionExistante(idemKey, user.id);
        if (existante) return { transaction: existante };
      }
      throw e;
    }
    // Décrémenter le stock des produits vendus.
    const lignesVendues = lignes.length > 0
      ? lignes.map((p: any) => ({ nom: p.nom || p.name || '', qte: Number(p.quantite) || 1 }))
      : (nomProduit ? [{ nom: nomProduit, qte: Number(qteTotale) || 1 }] : []);
    await this.decrementerStock(user.id, lignesVendues);
    this.eventsGateway?.emitTransactionCreated({ ...result, type: 'vente', userId: user.id });
    // Vérifier stock après vente (event-driven)
    this.alertesService?.checkStockApreVente(user.id, nomProduit).catch((e: any) => this.logger?.warn(`[CAISSE] checkStock: ${e.message}`));
    return { transaction: result };
  }

  @Post('depense')
  async enregistrerDepense(@Body() body: any, @CurrentUser() user: User) {
    // Idempotence (rejeu offline) : ne jamais compter deux fois la même dépense.
    const idemKey = body.idempotency_key || null;
    const deja = await this.transactionExistante(idemKey, user.id);
    if (deja) return { transaction: deja };

    if (!body.montant || parseFloat(body.montant) <= 0) throw new BadRequestException('Le montant doit être positif');
    // Journée toujours ouverte (dépense rattachée au jour, comme la vente).
    await this.ensureSessionOuverte(user.id);
    let result;
    try {
      result = await this.repo.save(this.repo.create({
        user_id: user.id, marchand_id: user.id,
        session_id: body.session_id || '', montant: body.montant,
        type: 'depense', description: body.description || '', source: body.source || 'kassa',
        mode_paiement: body.mode_paiement || 'especes', idempotency_key: idemKey,
      } as any));
    } catch (e: any) {
      if (this.estViolationUnicite(e)) {
        const existante = await this.transactionExistante(idemKey, user.id);
        if (existante) return { transaction: existante };
      }
      throw e;
    }
    this.eventsGateway?.emitTransactionCreated({ ...result, type: 'depense', userId: user.id });
    return { transaction: result };
  }

  // ── PRODUITS ──────────────────────────────────────────────────────────────

  @Get('produits')
  async getProduits(@CurrentUser() user: User) {
    const produits = await this.dataSource.query(
      'SELECT * FROM produits WHERE marchand_id = $1::text AND actif = true ORDER BY nom ASC',
      [user.id]
    );
    return { produits };
  }

  @Post('produits')
  async createProduit(@Body() body: any, @CurrentUser() user: User) {
    const result = await this.dataSource.query(
      'INSERT INTO produits (marchand_id, nom, prix, prix_achat, categorie, stock, unite, image) VALUES ($1::text, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [user.id, body.nom, body.prix || 0, Number(body.prix_achat) || 0, body.categorie || 'Général', body.stock || 0, body.unite || 'unité', body.image || null]
    );
    return { produit: result[0] };
  }

  @Put('produits/:id')
  async updateProduit(@Param('id') id: string, @Body() body: any, @CurrentUser() user: User) {
    const result = await this.dataSource.query(
      'UPDATE produits SET nom=$1, prix=$2, prix_achat=$3, categorie=$4, stock=$5, unite=$6, updated_at=NOW() WHERE id=$7 AND marchand_id=$8::text RETURNING *',
      [body.nom, body.prix, Number(body.prix_achat) || 0, body.categorie, body.stock, body.unite, id, user.id]
    );
    return { produit: result[0] };
  }

  @Delete('produits/:id')
  async deleteProduit(@Param('id') id: string, @CurrentUser() user: User) {
    await this.dataSource.query(
      'UPDATE produits SET actif = false WHERE id = $1 AND marchand_id = $2::text',
      [id, user.id]
    );
    return { success: true };
  }
}



// ═══════════════════════════════════════════════════════════════════
// CATALOGUE PRODUITS GLOBAL — accessible sans filtre marchand
// ═══════════════════════════════════════════════════════════════════

const CATALOGUE = [
  { nom: 'Riz',           categorie: 'cereales',    unite: 'kg',     prixAchat: 400,  prixVente: 500,  mots_cles: ['riz', 'rice'] },
  { nom: 'Tomate',        categorie: 'legumes',     unite: 'kg',     prixAchat: 300,  prixVente: 400,  mots_cles: ['tomate', 'tomato'] },
  { nom: 'Aubergine',     categorie: 'legumes',     unite: 'kg',     prixAchat: 700,  prixVente: 800,  mots_cles: ['aubergine', 'eggplant'] },
  { nom: 'Piment',        categorie: 'legumes',     unite: 'tas',    prixAchat: 100,  prixVente: 150,  mots_cles: ['piment', 'pepper'] },
  { nom: 'Gombo',         categorie: 'legumes',     unite: 'tas',    prixAchat: 120,  prixVente: 150,  mots_cles: ['gombo', 'okra'] },
  { nom: 'Manioc',        categorie: 'tubercules',  unite: 'kg',     prixAchat: 150,  prixVente: 200,  mots_cles: ['manioc', 'cassava'] },
  { nom: 'Igname',        categorie: 'tubercules',  unite: 'kg',     prixAchat: 350,  prixVente: 400,  mots_cles: ['igname', 'yam'] },
  { nom: 'Maïs',          categorie: 'cereales',    unite: 'kg',     prixAchat: 200,  prixVente: 250,  mots_cles: ['mais', 'maïs', 'corn'] },
  { nom: 'Banane',        categorie: 'fruits',      unite: 'régime', prixAchat: 500,  prixVente: 700,  mots_cles: ['banane', 'banana'] },
  { nom: 'Plantain',      categorie: 'fruits',      unite: 'régime', prixAchat: 600,  prixVente: 800,  mots_cles: ['plantain', 'alloco'] },
  { nom: 'Oignon',        categorie: 'legumes',     unite: 'kg',     prixAchat: 300,  prixVente: 400,  mots_cles: ['oignon', 'onion'] },
  { nom: 'Avocat',        categorie: 'fruits',      unite: 'pièce',  prixAchat: 100,  prixVente: 150,  mots_cles: ['avocat', 'avocado'] },
  { nom: 'Huile de palme',categorie: 'condiments',  unite: 'L',      prixAchat: 1400, prixVente: 1500, mots_cles: ['huile', 'palm oil'] },
  { nom: 'Mangue',        categorie: 'fruits',      unite: 'kg',     prixAchat: 200,  prixVente: 300,  mots_cles: ['mangue', 'mango'] },
  { nom: 'Ananas',        categorie: 'fruits',      unite: 'pièce',  prixAchat: 300,  prixVente: 400,  mots_cles: ['ananas', 'pineapple'] },
  { nom: 'Arachide',      categorie: 'cereales',    unite: 'kg',     prixAchat: 600,  prixVente: 700,  mots_cles: ['arachide', 'peanut'] },
  { nom: 'Cacao',         categorie: 'agriculture', unite: 'kg',     prixAchat: 1100, prixVente: 1200, mots_cles: ['cacao', 'cocoa'] },
  { nom: 'Café robusta',  categorie: 'agriculture', unite: 'kg',     prixAchat: 800,  prixVente: 900,  mots_cles: ['cafe', 'café', 'robusta'] },
  { nom: 'Anacarde',      categorie: 'agriculture', unite: 'kg',     prixAchat: 600,  prixVente: 650,  mots_cles: ['anacarde', 'cajou', 'cashew'] },
  { nom: 'Attiéké',       categorie: 'transformation', unite: 'kg',  prixAchat: 400,  prixVente: 500,  mots_cles: ['attieke', 'attiéké'] },
  { nom: 'Gari',          categorie: 'transformation', unite: 'kg',  prixAchat: 350,  prixVente: 450,  mots_cles: ['gari'] },
];

import { Query } from '@nestjs/common';

@UseGuards(JwtAuthGuard)
@Controller('catalogue')
export class CatalogueController {

  @Get()
  findAll(
    @Query('categorie') categorie?: string,
    @Query('q') q?: string,
  ) {
    let result = CATALOGUE;
    if (categorie) result = result.filter(p => p.categorie === categorie);
    if (q) {
      const lq = q.toLowerCase();
      result = result.filter(p =>
        p.nom.toLowerCase().includes(lq) ||
        p.mots_cles.some(mc => mc.includes(lq))
      );
    }
    return { produits: result, total: result.length };
  }

  @Get('categories')
  getCategories() {
    const cats = [...new Set(CATALOGUE.map(p => p.categorie))].sort();
    return { categories: cats };
  }
}
