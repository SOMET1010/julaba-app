import { Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Cooperative } from './cooperative.entity';
import { CooperativeMembre } from './cooperative-membre.entity';
import { CreateCooperativeDto } from './dto/create-cooperative.dto';
import { UpdateCooperativeDto } from './dto/update-cooperative.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cooperatives')
export class CooperativesRestController {
  constructor(
    @InjectRepository(Cooperative) private readonly repo: Repository<Cooperative>,
    @InjectRepository(CooperativeMembre) private readonly membreRepo: Repository<CooperativeMembre>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  private async ensureCooperativeBesoinsTable(): Promise<void> {
    await this.repo.query(
      `CREATE TABLE IF NOT EXISTS cooperative_besoins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cooperative_id UUID NOT NULL,
        marchand_id UUID NOT NULL,
        produit VARCHAR(255),
        categorie VARCHAR(120),
        quantite NUMERIC,
        unite VARCHAR(50),
        prix_max NUMERIC NULL,
        priorite VARCHAR(30) DEFAULT 'normale',
        statut VARCHAR(50) DEFAULT 'en_attente',
        notes TEXT NULL,
        date_besoin TIMESTAMPTZ NULL,
        prix_achat NUMERIC NULL,
        prix_dispatch NUMERIC NULL,
        quantite_attribuee NUMERIC NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    );
  }

  private async resolveUserCooperative(userId: string): Promise<{ coop: any | null; role: 'president' | 'membre' | null }> {
    const coops = await this.repo.query(
      `SELECT * FROM cooperatives WHERE responsable_id = $1 LIMIT 1`,
      [userId],
    );
    const coopFromResponsible = coops[0] || null;
    if (coopFromResponsible) return { coop: coopFromResponsible, role: 'president' };

    const adhesion = await this.membreRepo.findOne({ where: { membre_id: userId } });
    if (!adhesion) return { coop: null, role: null };

    const coopFromAdhesion = await this.repo.findOne({ where: { id: adhesion.cooperative_id } });
    return { coop: coopFromAdhesion || null, role: coopFromAdhesion ? 'membre' : null };
  }

  @Get()
  async findAll(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) return { data: [], total: 0 };
    const coops = await this.repo.query(
      `SELECT * FROM cooperatives WHERE responsable_id = $1 LIMIT 1`,
      [userId],
    );
    const coop = coops[0] || null;
    if (!coop) return { data: [], total: 0 };
    return { data: [coop], total: 1 };
  }

  @Get('membres')
  async membres(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) return { membres: [], total: 0 };
    // 1. Cherche via responsable_id
    let coops = await this.repo.query(
      `SELECT * FROM cooperatives WHERE responsable_id = $1 LIMIT 1`,
      [userId],
    );
    let coop = coops[0] || null;

    // 2. Fallback : cherche via adhesion dans cooperative_membres
    if (!coop) {
      const adhesion = await this.membreRepo.findOne({ where: { membre_id: userId } });
      if (adhesion) {
        coop = await this.repo.findOne({ where: { id: adhesion.cooperative_id } });
      }
    }
    if (!coop) return { membres: [], total: 0 };
    const adhesions = await this.membreRepo.query(
      `SELECT * FROM cooperative_membres WHERE cooperative_id = $1`,
      [coop.id],
    );
    const ids = adhesions.map((a: any) => a.membre_id);
    if (!ids.length) return { membres: [], total: 0 };
    const membres = await this.userRepo.find({ where: { id: In(ids) } });
    const enriched = membres.map((m: any) => {
      const adhesion = adhesions.find((a: any) => a.membre_id === m.id);
      return { ...m, statut_membre: adhesion?.statut, role_membre: adhesion?.role };
    });
    return { membres: enriched, total: enriched.length };
  }

  @Post('membres')
  async addMembre(
    @Body() body: { marchand_id?: string; role_membre?: string; date_adhesion?: string },
    @CurrentUser() currentUser: User,
  ) {
    const userId = currentUser?.id;
    if (!userId) throw new ForbiddenException('Non authentifié');
    const { coop, role } = await this.resolveUserCooperative(userId);
    if (!coop || role !== 'president') {
      throw new ForbiddenException('Seul le responsable de la coopérative peut ajouter un membre');
    }
    const marchandId = String(body?.marchand_id || '').trim();
    if (!marchandId) throw new NotFoundException('marchand_id requis');
    const marchand = await this.userRepo.findOne({ where: { id: marchandId, role: UserRole.MARCHAND } });
    if (!marchand) throw new NotFoundException('Marchand introuvable');
    const existing = await this.membreRepo.findOne({
      where: { cooperative_id: coop.id, membre_id: marchandId },
    });
    if (existing) {
      return { success: false, message: 'Ce marchand est déjà membre de la coopérative' };
    }
    const membre = await this.membreRepo.save(
      this.membreRepo.create({
        cooperative_id: coop.id,
        membre_id: marchandId,
        statut: 'actif',
        actif: true,
        role: String(body?.role_membre || 'membre'),
        date_adhesion: (body?.date_adhesion || new Date().toISOString()).slice(0, 10),
      }),
    );
    return { success: true, membre };
  }

  @Get('tresorerie')
  async tresorerie(@CurrentUser() currentUser: User) {
    const userId = currentUser?.id;
    if (!userId) return { solde: 0, entrees: 0, sorties: 0, transactions: [] };
    const { coop } = await this.resolveUserCooperative(userId);
    if (!coop) return { solde: 0, entrees: 0, sorties: 0, transactions: [] };
    const rows = await this.repo.query(
      `SELECT id, type, categorie, montant, description, membre_id, statut, created_at
       FROM cooperative_transactions
       WHERE cooperative_id = $1
       ORDER BY created_at DESC`,
      [coop.id],
    );
    let entrees = 0;
    let sorties = 0;
    for (const r of rows) {
      if (r.statut !== 'validee') continue;
      const m = Number(r.montant) || 0;
      if (r.type === 'sortie') sorties += m;
      else if (r.type === 'entree') entrees += m;
    }
    return { solde: entrees - sorties, entrees, sorties, transactions: rows };
  }

  @Post('tresorerie')
  async addTresorerie(
    @Body() body: { type?: string; categorie?: string; montant?: number; membre_id?: string; description?: string },
    @CurrentUser() currentUser: User,
  ) {
    const userId = currentUser?.id;
    if (!userId) throw new ForbiddenException('Non authentifié');
    const { coop, role } = await this.resolveUserCooperative(userId);
    if (!coop || role !== 'president') {
      throw new ForbiddenException('Seul le responsable de la coopérative peut saisir une transaction');
    }
    const type = String(body?.type || '').trim();
    if (type !== 'entree' && type !== 'sortie') throw new NotFoundException('Type invalide (entree ou sortie)');
    const montant = Number(body?.montant || 0);
    if (!(montant > 0)) throw new NotFoundException('Montant invalide');
    const rows = await this.repo.query(
      `INSERT INTO cooperative_transactions (cooperative_id, user_id, type, categorie, montant, membre_id, description, statut)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'en_attente')
       RETURNING id, type, categorie, montant, description, membre_id, statut, created_at`,
      [coop.id, userId, type, String(body?.categorie || 'autre'), montant, body?.membre_id || null, body?.description ?? null],
    );
    return { success: true, transaction: rows[0] };
  }

  @Patch('tresorerie/:id')
  async updateTresorerieStatut(
    @Param('id') id: string,
    @Body() body: { statut?: string },
    @CurrentUser() currentUser: User,
  ) {
    const userId = currentUser?.id;
    if (!userId) throw new ForbiddenException('Non authentifié');
    const statut = String(body?.statut || '').trim();
    if (statut !== 'validee' && statut !== 'annulee') throw new NotFoundException('Statut invalide (validee ou annulee)');
    const { coop, role } = await this.resolveUserCooperative(userId);
    if (!coop || role !== 'president') {
      throw new ForbiddenException('Action réservée au responsable de la coopérative');
    }
    const rows = await this.repo.query(
      `UPDATE cooperative_transactions SET statut = $1
       WHERE id = $2 AND cooperative_id = $3
       RETURNING id, type, categorie, montant, description, membre_id, statut, created_at`,
      [statut, id, coop.id],
    );
    if (!rows.length) throw new NotFoundException('Transaction introuvable');
    return { success: true, transaction: rows[0] };
  }

  @Get('besoins')
  async getBesoins(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) return { besoins: [], agregation: [], total: 0, role: null };
    try {
      await this.ensureCooperativeBesoinsTable();

      const { coop, role } = await this.resolveUserCooperative(userId);
      if (!coop) return { besoins: [], agregation: [], total: 0, role: null };

      const rows = await this.repo.query(
        `SELECT
           b.id,
           b.cooperative_id,
           b.marchand_id,
           b.marchand_id AS membre_id,
           b.produit,
           b.categorie,
           b.quantite,
           b.unite,
           b.prix_max,
           b.priorite,
           b.statut,
           b.notes,
           b.date_besoin,
           b.prix_achat,
           b.prix_dispatch,
           b.quantite_attribuee,
           b.created_at,
           b.updated_at
         FROM cooperative_besoins b
         WHERE b.cooperative_id = $1::uuid
         ORDER BY b.created_at DESC`,
        [coop.id],
      );

      const grouped = new Map<string, any>();
      for (const b of rows) {
        const key = `${b.produit || ''}::${b.unite || ''}`;
        const current = grouped.get(key) || {
          produit: b.produit || '',
          categorie: b.categorie || 'autre',
          unite: b.unite || '',
          quantite_totale: 0,
          nombre_membres: 0,
          priorite_max: 'normale',
          besoins: [],
        };
        current.besoins.push(b);
        const q = Number(b.quantite || 0);
        current.quantite_totale += Number.isNaN(q) ? 0 : q;
        current.nombre_membres += 1;
        if (b.priorite === 'urgente') current.priorite_max = 'urgente';
        grouped.set(key, current);
      }

      return { besoins: rows, agregation: Array.from(grouped.values()), total: rows.length, role };
    } catch {
      return { besoins: [], agregation: [], total: 0, role: null };
    }
  }

  @Post('besoins')
  async createBesoin(@Body() body: any, @Req() req: any) {
    const userId = req.user?.id;
    if (!userId) return { success: false };
    try {
      await this.ensureCooperativeBesoinsTable();
      const [inserted] = await this.repo.query(
        `INSERT INTO cooperative_besoins (
           cooperative_id, marchand_id, produit, categorie, quantite, unite,
           prix_max, priorite, statut, notes, date_besoin
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'en_attente'), $10, $11)
         RETURNING *`,
        [
          body.cooperative_id,
          userId,
          body.produit,
          body.categorie || 'autre',
          body.quantite,
          body.unite,
          body.prix_max ?? null,
          body.priorite || 'normale',
          body.statut || 'en_attente',
          body.notes ?? null,
          body.date_besoin ?? null,
        ],
      );
      return { success: true, besoin: inserted };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  @Patch('besoins/:id')
  async updateBesoin(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    try {
      await this.ensureCooperativeBesoinsTable();
      const userId = req.user?.id;
      if (!userId) return { success: false };
      const { coop } = await this.resolveUserCooperative(userId);
      if (!coop) return { success: false };
      await this.repo.query(
        `UPDATE cooperative_besoins
         SET
           statut = COALESCE($1, statut),
           notes = COALESCE($2, notes),
           quantite_attribuee = COALESCE($3, quantite_attribuee),
           prix_achat = COALESCE($4, prix_achat),
           prix_dispatch = COALESCE($5, prix_dispatch),
           updated_at = NOW()
         WHERE id = $6::uuid AND cooperative_id = $7::uuid`,
        [
          body.statut ?? null,
          body.notes ?? null,
          body.quantite_attribuee ?? null,
          body.prix_achat ?? null,
          body.prix_dispatch ?? null,
          id,
          coop.id,
        ],
      );
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  @Post('besoins/consolider')
  async consoliderBesoins(@Body() body: any, @Req() req: any) {
    const userId = req.user?.id;
    if (!userId) return { success: false };
    try {
      await this.ensureCooperativeBesoinsTable();
      const { coop } = await this.resolveUserCooperative(userId);
      if (!coop) return { success: false };

      const cooperativeId = body.cooperative_id || coop.id;
      if (body.produit && body.unite) {
        await this.repo.query(
          `UPDATE cooperative_besoins
           SET statut = 'consolide', updated_at = NOW()
           WHERE cooperative_id = $1::uuid
             AND produit = $2
             AND unite = $3
             AND statut = 'en_attente'`,
          [cooperativeId, body.produit, body.unite],
        );
      } else {
        await this.repo.query(
          `UPDATE cooperative_besoins
           SET statut = 'consolide', updated_at = NOW()
           WHERE cooperative_id = $1::uuid
             AND statut = 'en_attente'`,
          [cooperativeId],
        );
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  @Get('ma-cooperative')
  async maCooperative(@CurrentUser() currentUser: User) {
    const userId = currentUser?.id;
    if (!userId) return null;

    const adhesions = await this.membreRepo.query(
      `SELECT id, cooperative_id, membre_id, statut, role, date_adhesion
       FROM cooperative_membres
       WHERE membre_id = $1
       ORDER BY created_at DESC NULLS LAST
       LIMIT 1`,
      [userId],
    );
    const adhesion = adhesions[0] || null;
    if (!adhesion) return null;

    const coop = await this.repo.findOne({ where: { id: adhesion.cooperative_id } });
    if (!coop) return null;

    let responsable_nom = '';
    if (coop.responsable_id) {
      const responsable = await this.userRepo.findOne({ where: { id: coop.responsable_id } });
      if (responsable) {
        responsable_nom = `${responsable.firstName || ''} ${responsable.lastName || ''}`.trim();
      }
    }

    const row = await this.repo.query(
      `SELECT nom, marche, commune, responsable_nom, fonction, contact
       FROM cooperatives WHERE id = $1 LIMIT 1`,
      [coop.id],
    );
    const meta = row[0] || {};
    return {
      id: coop.id,
      nom: meta.nom || coop.nom,
      marche: meta.marche || null,
      commune: meta.commune || null,
      fonction: meta.fonction || null,
      contact: meta.contact || null,
      statut_membre: adhesion.statut || null,
      role_membre: adhesion.role || null,
      responsable_nom: meta.responsable_nom || responsable_nom || null,
      date_adhesion: adhesion.date_adhesion || null,
    };
  }

  @Get('search-marchand')
  async searchMarchand(@Query('phone') phone: string, @CurrentUser() currentUser: User) {
    const userId = currentUser?.id;
    if (!userId) throw new ForbiddenException('Non authentifié');
    const { coop, role } = await this.resolveUserCooperative(userId);
    if (!coop || role !== 'president') {
      throw new ForbiddenException('Action réservée au responsable de la coopérative');
    }
    const normalized = String(phone || '').trim();
    if (!normalized) return { user: null };

    const user = await this.userRepo.findOne({
      where: { phone: normalized, role: UserRole.MARCHAND },
    });
    if (!user) return { user: null };

    return {
      user: {
        id: user.id,
        first_name: user.firstName,
        last_name: user.lastName,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  @Patch('membres/:id/statut')
  async updateMembreStatut(
    @Param('id') id: string,
    @Body() body: { statut: string; motif?: string },
    @CurrentUser() currentUser: User,
  ) {
    const userId = currentUser?.id;
    if (!userId) throw new ForbiddenException('Non authentifié');
    const STATUTS = ['actif', 'suspendu', 'en_attente', 'exclu'];
    const statut = String(body?.statut || '').trim();
    if (!STATUTS.includes(statut)) throw new NotFoundException('Statut invalide');
    const membre = await this.membreRepo.findOne({ where: { id } });
    if (!membre) throw new NotFoundException('Membre introuvable');
    const { coop, role } = await this.resolveUserCooperative(userId);
    if (!coop || role !== 'president' || membre.cooperative_id !== coop.id) {
      throw new ForbiddenException('Action réservée au responsable de la coopérative de ce membre');
    }
    membre.statut = statut;
    return this.membreRepo.save(membre);
  }

  @Delete('membres/:id')
  async deleteMembre(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const userId = currentUser?.id;
    if (!userId) throw new ForbiddenException('Non authentifié');
    const membre = await this.membreRepo.findOne({ where: { id } });
    if (!membre) throw new NotFoundException('Membre introuvable');
    const { coop, role } = await this.resolveUserCooperative(userId);
    if (!coop || role !== 'president' || membre.cooperative_id !== coop.id) {
      throw new ForbiddenException('Action réservée au responsable de la coopérative de ce membre');
    }
    await this.membreRepo.delete({ id });
    return { success: true };
  }

  @Patch('membres/:id/role')
  async updateMembreRole(
    @Param('id') id: string,
    @Body() body: { role: string },
    @CurrentUser() currentUser: User,
  ) {
    const userId = currentUser?.id;
    if (!userId) throw new ForbiddenException('Non authentifié');
    const ROLES = ['membre', 'president'];
    const role = String(body?.role || '').trim();
    if (!ROLES.includes(role)) throw new NotFoundException('Rôle invalide');
    const membre = await this.membreRepo.findOne({ where: { id } });
    if (!membre) throw new NotFoundException('Membre introuvable');
    const { coop, role: callerRole } = await this.resolveUserCooperative(userId);
    if (!coop || callerRole !== 'president' || membre.cooperative_id !== coop.id) {
      throw new ForbiddenException('Action réservée au responsable de la coopérative de ce membre');
    }
    membre.role = role;
    return this.membreRepo.save(membre);
  }

  @Get('commandes-groupees')
  async getCommandesGroupees(@CurrentUser() _currentUser: User) {
    // Feature "commandes groupées" morte : table commandes_groupees jamais créée
    // (aucune migration, aucune entité). Neutralisé v2.9.x — renvoie une liste vide
    // au lieu de throw (QueryFailedError "relation does not exist" -> 500 qui plantait
    // le chargement de l'écran coopérative). Réactiver = migration #133 dédiée.
    return { commandes: [] };
  }

  @Post('commandes-groupees')
  async createCommandeGroupee(
    @Body() _body: any,
    @CurrentUser() _currentUser: User,
  ) {
    // Feature morte (table commandes_groupees inexistante). Neutralisé v2.9.x :
    // retour honnête sans écriture (évite un 500 dormant). Réactiver = migration #133.
    return { success: true, persisted: false, message: 'Commandes groupées : feature non disponible' };
  }

  @Post('distribution')
  async distribution(@Body() body: any, @CurrentUser() currentUser: User) {
    const userId = currentUser?.id;
    if (!userId) return { success: false };
    try {
      const { coop } = await this.resolveUserCooperative(userId);
      if (!coop) return { success: false, message: 'Coopérative introuvable' };
      // Distribution : feature stock non finalisée (modèle de persistance à concevoir).
      // Neutralisé v2.9.x : aucune écriture (les anciennes ciblaient cooperative_tresorerie /
      // cooperatives.solde_tresorerie, 2 objets inexistants → throw silencieux). Retour honnête.
      return {
        success: true,
        persisted: false,
        message: 'Distribution enregistrée (hors persistance — feature stock à venir)',
      };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  @Post('commandes/:id/cloture')
  async cloturerCommandeCoop(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const userId = currentUser?.id;
    if (!userId) return { success: false, message: 'Non authentifié' };
    try {
      const result = await this.repo.query(
        `UPDATE commandes
         SET statut_paiement = 'paye', paye_at = now()
         WHERE id = $1 AND acheteur_id = $2 AND statut = 'livree' AND statut_paiement <> 'paye'
         RETURNING id`,
        [id, userId],
      );
      if (result?.length) return { success: true };

      const rows = await this.repo.query(
        `SELECT acheteur_id, statut, statut_paiement FROM commandes WHERE id = $1 LIMIT 1`,
        [id],
      );
      const cmd = rows?.[0];
      if (!cmd) return { success: false, message: 'Commande introuvable' };
      if (cmd.acheteur_id !== userId) return { success: false, message: 'Accès refusé' };
      if (cmd.statut_paiement === 'paye') return { success: true, message: 'Commande déjà payée' };
      if (cmd.statut !== 'livree') return { success: false, message: 'Commande non livrée' };
      return { success: false, message: 'Clôture impossible' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  @Post('cotisation')
  async cotisation(@Body() body: any, @CurrentUser() currentUser: User) {
    const userId = currentUser?.id;
    if (!userId) return { success: false };
    try {
      const { coop } = await this.resolveUserCooperative(userId);
      if (!coop) return { success: false, message: 'Coopérative introuvable' };
      const montant = Number(body.montant || 0);
      if (!montant) return { success: false, message: 'Montant invalide' };
      await this.repo.query(
        `INSERT INTO cooperative_transactions (cooperative_id, user_id, type, categorie, montant, membre_id, description, statut)
         VALUES ($1, $2, 'entree', 'cotisation', $3, $4, $5, 'validee')`,
        [coop.id, userId, montant, userId, body.description ?? null],
      );
      await this.repo.query(
        `UPDATE cooperative_membres SET cotisation_payee = true
         WHERE cooperative_id = $1 AND membre_id = $2`,
        [coop.id, userId],
      );
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  @Post('rejoindre/:id')
  async rejoindre(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const userId = currentUser?.id;
    if (!userId) return { success: false };

    const existing = await this.membreRepo.findOne({
      where: { cooperative_id: id, membre_id: userId },
    });
    if (!existing) {
      await this.membreRepo.save(
        this.membreRepo.create({
          cooperative_id: id,
          membre_id: userId,
          statut: 'en_attente',
          date_adhesion: new Date().toISOString().slice(0, 10),
        }),
      );
    }

    return { success: true };
  }

  @Get('liste')
  async liste() {
    const rows = await this.repo.query(
      `SELECT id, nom, marche, commune, responsable_nom, fonction, contact
       FROM cooperatives
       WHERE actif = true
       ORDER BY nom ASC`,
    );
    return rows;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.repo.findOne({ where: { id } });
  }

  @Post()
  @Roles('super_admin', 'admin_general', 'cooperateur')
  create(@Body() body: CreateCooperativeDto, @CurrentUser() currentUser: User) {
    return this.repo.save(this.repo.create({ ...body, responsable_id: currentUser.id }));
  }

  @Patch(':id')
  @Roles('super_admin', 'admin_general', 'cooperateur')
  async update(@Param('id') id: string, @Body() body: UpdateCooperativeDto, @CurrentUser() currentUser: User) {
    const isAdmin = ['super_admin', 'admin_general'].includes(currentUser.role);
    if (!isAdmin) {
      const existing = await this.repo.findOne({ where: { id } });
      if (!existing || existing.responsable_id !== currentUser.id) return { affected: 0 };
    }
    return this.repo.update(id, body);
  }
}
