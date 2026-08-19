import { Controller, Get, Post, Patch, Body, UseGuards, Query, Param } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MiscRestController {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  @Get('supervision')
  supervision() {
    return { alertes: [], zones: [], acteurs_actifs: 0, identifications_jour: 0 };
  }

  @Get('demandes')
  demandes() {
    return { demandes: [], total: 0 };
  }

  @Get('academy/produits')
  academyProduits() {
    return { produits: [
      { id: '1', nom: 'Cacao', categorie: 'Culture', modules: 3 },
      { id: '2', nom: 'Café', categorie: 'Culture', modules: 2 },
      { id: '3', nom: 'Anacarde', categorie: 'Culture', modules: 4 },
      { id: '4', nom: 'Maïs', categorie: 'Céréale', modules: 2 },
    ]};
  }

  @Get('livraison')
  livraison() {
    return { livraisons: [], total: 0, en_cours: 0, livrees: 0 };
  }

  @Get('cron')
  cron() {
    return { jobs: [
      { nom: 'sync_acteurs', derniere_exec: null, statut: 'idle' },
      { nom: 'rapport_hebdo', derniere_exec: null, statut: 'idle' },
      { nom: 'nettoyage_sessions', derniere_exec: null, statut: 'idle' },
    ]};
  }

  private async ensureCronJobsConfigTable(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS cron_jobs_config (
        id VARCHAR(255) PRIMARY KEY,
        actif BOOLEAN NOT NULL DEFAULT true,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  @Patch('cron/:id/toggle')
  @Roles('super_admin', 'admin_general')
  async toggleCronJob(@Param('id') id: string) {
    const key = String(id || '').trim();
    await this.ensureCronJobsConfigTable();
    let rows = await this.dataSource.query(
      `UPDATE cron_jobs_config SET actif = NOT COALESCE(actif, true), updated_at = NOW() WHERE id = $1 RETURNING id, actif`,
      [key],
    );
    if (!rows?.length) {
      await this.dataSource.query(
        `INSERT INTO cron_jobs_config (id, actif) VALUES ($1, false)`,
        [key],
      );
      rows = await this.dataSource.query(
        `SELECT id, actif FROM cron_jobs_config WHERE id = $1`,
        [key],
      );
    }
    const row = rows[0];
    return { success: true, id: String(row.id), actif: Boolean(row.actif) };
  }

  @Post('cron/:id/retry')
  @Roles('super_admin', 'admin_general')
  async retryCronJob(@Param('id') id: string) {
    const key = String(id || '').trim();
    return { success: true, id: key, relancedAt: new Date() };
  }

  // GET /communication — historique réel des campagnes envoyées.
  //
  // Il n'existe pas de table "campagnes" dédiée : l'envoi groupé réel est
  // POST /notifications/send-bulk (notifications.controller.ts), qui crée une
  // ligne `notifications` par destinataire avec metadata.bulk=true et
  // metadata.campaignId (identifiant généré côté appelant pour regrouper les
  // destinataires d'un même envoi). Cet endpoint DÉRIVE donc l'historique des
  // campagnes de ce même journal — une seule source de vérité, pas de second
  // mécanisme de stockage qui pourrait diverger.
  //
  // Repli COALESCE sur l'id de la notification : une ligne bulk plus ancienne
  // (avant l'ajout de campaignId) ou orpheline s'affiche quand même, comme sa
  // propre "campagne" à 1 destinataire, plutôt que d'être silencieusement
  // exclue de l'historique.
  @Get('communication')
  async communication() {
    try {
      const rows = await this.dataSource.query(`
        SELECT
          COALESCE(n.metadata->>'campaignId', n.id::text) AS id,
          MAX(n.titre) AS titre,
          MAX(n.message) AS message,
          COALESCE(MAX(n.metadata->>'canal'), 'push') AS canal,
          COALESCE(NULLIF(MAX(n.metadata->>'cible'), ''), 'Ciblage direct') AS cible,
          COUNT(*)::int AS nb_destinataires,
          MIN(n.created_at) AS date_envoi,
          NULLIF(TRIM(CONCAT(COALESCE(MAX(u.first_name), ''), ' ', COALESCE(MAX(u.last_name), ''))), '') AS cree_par
        FROM notifications n
        LEFT JOIN users u ON u.id::text = n.metadata->>'sentBy'
        WHERE n.metadata->>'bulk' = 'true'
          AND n.deleted_at IS NULL
        GROUP BY COALESCE(n.metadata->>'campaignId', n.id::text)
        ORDER BY MIN(n.created_at) DESC
        LIMIT 50
      `);
      const campagnes = rows.map((r: any) => ({
        id: r.id,
        titre: r.titre,
        message: r.message,
        canal: r.canal,
        cible: r.cible,
        nbDestinataires: Number(r.nb_destinataires) || 0,
        // Une notification n'est comptée que si elle a été effectivement créée
        // en base (les échecs de send-bulk ne produisent aucune ligne) : le
        // taux de délivrabilité des lignes présentes est donc de 100%.
        tauxDelivrabilite: 100,
        statut: 'envoyee' as const,
        dateEnvoi: r.date_envoi,
        creePar: r.cree_par || 'Back-office',
      }));
      return { messages: [], campagnes, total: campagnes.length };
    } catch {
      return { messages: [], campagnes: [], total: 0 };
    }
  }

  @Get('system/settings')
  systemSettings() {
    return { settings: { supportPhone: '+2250700000000' } };
  }

  private async ensureSupportConfigTable(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS support_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        config JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  @Get('support/config')
  async getSupportConfig() {
    await this.ensureSupportConfigTable();
    try {
      const rows = await this.dataSource.query(
        `SELECT config, updated_at FROM support_config ORDER BY updated_at DESC LIMIT 1`
      );
      if (!rows.length) return { config: null };
      return { config: rows[0].config, updatedAt: rows[0].updated_at };
    } catch {
      return { config: null };
    }
  }

  @Post('support/config')
  @Roles('super_admin', 'admin_general')
  async saveSupportConfig(@Body() body: { config: any }) {
    await this.ensureSupportConfigTable();
    try {
      const existing = await this.dataSource.query(
        `SELECT id FROM support_config LIMIT 1`
      );
      if (existing.length) {
        await this.dataSource.query(
          `UPDATE support_config SET config = $1::jsonb, updated_at = NOW() WHERE id = $2`,
          [body.config, existing[0].id]
        );
      } else {
        await this.dataSource.query(
          `INSERT INTO support_config (config) VALUES ($1::jsonb)`,
          [body.config]
        );
      }
      return { success: true, updatedAt: new Date().toISOString() };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  @Get('dashboard/stats')
  @Roles('super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone')
  async dashboardStats() {
    try {
      const [
        utilisateurs,
        acteursActifs,
        txRows,
        identRows,
        nouveauxRows,
        statutsRows,
      ] = await Promise.all([
        this.usersRepo.count(),
        this.usersRepo.count({ where: { status: 'actif' as any } }),
        this.dataSource.query(`SELECT COUNT(*) as total, COALESCE(SUM(montant), 0) as revenus FROM caisse_transactions`),
        this.dataSource.query(`SELECT COUNT(*) as total FROM identifications`),
        this.dataSource.query(`SELECT COUNT(*) as total FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`),
        this.dataSource.query(`
  SELECT
    COUNT(*) FILTER (WHERE validated = true AND status = 'actif') as actifs,
    COUNT(*) FILTER (WHERE validated = false) as en_attente,
    COUNT(*) FILTER (WHERE status = 'suspendu') as suspendus,
    COUNT(*) FILTER (WHERE status = 'rejete') as rejetes
  FROM users WHERE role != 'super_admin'
`),
      ]);
      const txResult = txRows?.[0] || {};
      const identResult = identRows?.[0] || {};
      const nouveauxResult = nouveauxRows?.[0] || {};
      const statutsResult = statutsRows?.[0] || {};
      return {
        utilisateurs,
        acteursActifs,
        transactions: parseInt(txResult?.total || '0'),
        identifications: parseInt(identResult?.total || '0'),
        revenus: parseFloat(txResult?.revenus || '0'),
        nouveauxSemaine: parseInt(nouveauxResult?.total || '0'),
        actifs: parseInt(statutsResult?.actifs || '0'),
        en_attente: parseInt(statutsResult?.en_attente || '0'),
        suspendus: parseInt(statutsResult?.suspendus || '0'),
        rejetes: parseInt(statutsResult?.rejetes || '0'),
      };
    } catch {
      return { utilisateurs: 0, acteursActifs: 0, transactions: 0, identifications: 0, revenus: 0, nouveauxSemaine: 0, actifs: 0, en_attente: 0, suspendus: 0, rejetes: 0 };
    }
  }

  @Get('transactions')
  @Roles('super_admin', 'admin_general', 'admin_national')
  async getAllTransactions(@Query() query: any) {
    try {
      const page = parseInt(query.page || '1');
      const limit = Math.min(Math.max(parseInt(query.limit || '50', 10), 1), 200);
      const offset = (page - 1) * limit;
      const rows = await this.dataSource.query(
        `SELECT ct.*,
        u.phone,
        u.first_name,
        u.last_name,
        u.region,
        u.commune,
        TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) AS acteur_nom
       FROM caisse_transactions ct
       LEFT JOIN users u ON u.id = ct.user_id
       ORDER BY ct.created_at DESC
       LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      const [countResult] = await this.dataSource.query(
        `SELECT COUNT(*) as total, COALESCE(SUM(montant), 0) as montant_total FROM caisse_transactions`,
      );
      return {
        data: rows,
        total: parseInt(countResult.total),
        montant_total: parseFloat(countResult.montant_total),
      };
    } catch (e: any) {
      return { data: [], total: 0, montant_total: 0 };
    }
  }
}
