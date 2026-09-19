import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { CronJobsConfigService } from '../cron-jobs/cron-jobs-config.service';
import { CRON_JOB_ALERTES_VERIFICATION } from '../cron-jobs/cron-jobs.registry';

@Injectable()
export class AlertesService {
  private readonly logger = new Logger(AlertesService.name);

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private notificationsService: NotificationsService,
    private readonly cronJobsConfig: CronJobsConfigService,
  ) {}

  // Vérifier si une notif du même type existe déjà aujourd'hui pour cet user
  private async dejaNotifieAujourdhui(userId: string, type: string, reference?: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let existing: any[];
    if (reference) {
      existing = await this.dataSource.query(`
        SELECT COUNT(*) FROM notifications
        WHERE user_id = $1 AND type = $2 AND created_at >= $3
          AND metadata->>'reference' = $4
      `, [userId, type, today.toISOString(), String(reference)]);
    } else {
      existing = await this.dataSource.query(`
        SELECT COUNT(*) FROM notifications
        WHERE user_id = $1 AND type = $2 AND created_at >= $3
      `, [userId, type, today.toISOString()]);
    }
    return parseInt(existing[0].count) > 0;
  }

  private async creerNotif(data: {
    userId: string;
    type: string;
    titre: string;
    message: string;
    priority: string;
    category: string;
    icon: string;
    metadata?: any;
  }) {
    await this.notificationsService.create({
      userId: data.userId,
      type: data.type as any,
      titre: data.titre,
      message: data.message,
      priority: data.priority as any,
      category: data.category,
      icon: data.icon,
      metadata: data.metadata || {},
    });
    this.logger.log(`[ALERTE] ${data.type} → ${data.userId}`);
  }

  // ── OÙ VIT LE STOCK DE CETTE PERSONNE ? ──────────────────────────────────
  //
  // ARGENT-2, 19/09/2026. Ces alertes lisaient `FROM stocks` et rien d'autre.
  // Or le stock d'une MARCHANDE vit toujours dans `produits` : la branche qui
  // écrit dans `stocks` est réservée à `cooperateur` et `producteur`
  // (stocks-rest.controller.ts). Aucun chemin n'a jamais inséré une ligne de
  // marchande dans `stocks`.
  //
  // Conséquence : `stock_rupture` et `stock_faible` étaient, pour une
  // marchande, du CODE MORT. Elle partait au marché sans riz sans avoir été
  // prévenue. L'avertissement existe bien au moment de la vente, mais il ne
  // survit pas à la fermeture de l'écran — et il ne lui sert à rien la veille
  // au soir, quand elle décide de ses achats. C'est précisément le moment où
  // une application qui parle devrait parler.
  //
  // On interroge donc LES DEUX tables, ramenées à une seule forme. Pas de test
  // de rôle : il en existe déjà ailleurs, et un deuxième endroit qui décide
  // « qui a du stock où » serait une deuxième vérité de plus. Les deux tables
  // restent une dette nommée — les fusionner demande une migration.
  //
  // `filtreProduit` sert au contrôle APRÈS une vente (un seul produit) ; vide
  // pour la vérification quotidienne (tout le stock).
  private async stockSousSeuil(userId: string, produitNom?: string): Promise<Array<{
    id: string; produit: string; quantite: number; unite: string | null; seuil_alerte: number | null;
  }>> {
    const params: unknown[] = produitNom ? [userId, `%${produitNom}%`] : [userId];
    const clauseProduits = produitNom ? 'AND LOWER(p.nom) LIKE LOWER($2)' : '';
    const clauseStocks = produitNom ? 'AND LOWER(s.produit) LIKE LOWER($2)' : '';
    return this.dataSource.query(`
      SELECT p.id::text AS id, p.nom AS produit, p.stock::float AS quantite, p.unite AS unite,
             p.seuil_alerte::float AS seuil_alerte
        FROM produits p
       WHERE p.marchand_id = $1::text
         AND p.actif = true
         AND p.stock IS NOT NULL
         AND p.seuil_alerte IS NOT NULL
         AND p.stock <= p.seuil_alerte
         ${clauseProduits}
      UNION ALL
      SELECT s.id::text AS id, s.produit AS produit, s.quantite::float AS quantite, s.unite AS unite,
             s.seuil_alerte::float AS seuil_alerte
        FROM stocks s
       WHERE s.proprietaire_id::text = $1::text
         AND s.quantite IS NOT NULL
         AND s.seuil_alerte IS NOT NULL
         AND s.quantite <= s.seuil_alerte
         ${clauseStocks}
    `, params);
  }

  // ── Vérifier stocks faibles d'un marchand ──────────────────
  async checkStocksFaibles(userId: string): Promise<void> {
    const user = await this.dataSource.query(`SELECT preferences FROM users WHERE id = $1`, [userId]);
    const prefs = (user[0]?.preferences) || {};
    if (prefs.notif_stock_faible === false) return;
    const stocks = await this.stockSousSeuil(userId);

    for (const s of stocks) {
      const type = s.quantite == 0 ? 'stock_rupture' : 'stock_faible';
      const deja = await this.dejaNotifieAujourdhui(userId, type, s.id);
      if (deja) continue;

      await this.creerNotif({
        userId,
        type,
        titre: s.quantite == 0 ? `Rupture de stock pour ${s.produit}` : `Stock faible pour ${s.produit}`,
        message: s.quantite == 0
          ? `Tu n'as plus de ${s.produit}. Réapprovisionne vite !`
          : `Il te reste ${s.quantite} ${s.unite || 'unités'} de ${s.produit} (seuil: ${s.seuil_alerte})`,
        priority: s.quantite == 0 ? 'critical' : 'high',
        category: 'stock',
        icon: s.quantite == 0 ? '🚨' : '📦',
        metadata: { reference: s.id, produit: s.produit, quantite: s.quantite },
      });
    }
  }

  // ── Vérifier récoltes proches (producteur) ─────────────────
  async checkRecoltesProches(userId: string): Promise<void> {
    const dans7jours = new Date();
    dans7jours.setDate(dans7jours.getDate() + 7);

    const cycles = await this.dataSource.query(`
      SELECT id, culture, date_recolte_estimee
      FROM cycles
      WHERE user_id = $1
        AND date_recolte_estimee IS NOT NULL
        AND date_recolte_estimee <= $2
        AND date_recolte_estimee >= NOW()
        AND statut != 'recolte'
    `, [userId, dans7jours.toISOString()]).catch((e: any) => {
      this.logger.warn(`[ALERTE] checkRecoltesProches cycles query failed: ${e.message}`);
      return [];
    });

    for (const c of cycles) {
      const jours = Math.floor((new Date(c.date_recolte_estimee).getTime() - Date.now()) / 86400000);
      const deja = await this.dejaNotifieAujourdhui(userId, 'recolte_proche', c.id);
      if (deja) continue;
      await this.creerNotif({
        userId,
        type: 'recolte_proche',
        titre: `Récolte de ${c.culture} dans ${jours} jour${jours > 1 ? 's' : ''}`,
        message: 'Prépare ton équipement et préviens tes acheteurs.',
        priority: 'medium',
        category: 'production',
        icon: '🌾',
        metadata: { reference: c.id, culture: c.culture, jours },
      });
    }
  }

  // ── Vérifier cotisations impayées (coopérative) ────────────
  async checkCotisationsImpayees(userId: string): Promise<void> {
    // Placeholder — à connecter quand table cotisations disponible
    this.logger.log(`[ALERTE] checkCotisationsImpayees pour ${userId} — non implémenté`);
  }

  // ── Vérifier stock après vente (event-driven) ──────────────
  async checkStockApreVente(userId: string, produitNom: string): Promise<void> {
    if (!produitNom) return;
    const stocks = await this.stockSousSeuil(userId, produitNom);

    for (const s of stocks) {
      const type = s.quantite == 0 ? 'stock_rupture' : 'stock_faible';
      const deja = await this.dejaNotifieAujourdhui(userId, type, s.id);
      if (deja) continue;
      await this.creerNotif({
        userId,
        type,
        titre: s.quantite == 0 ? `Rupture pour ${s.produit}` : `Stock bas pour ${s.produit}`,
        message: s.quantite == 0
          ? `Plus de ${s.produit} après cette vente !`
          : `Il te reste ${s.quantite} ${s.unite || 'unités'} de ${s.produit}.`,
        priority: s.quantite == 0 ? 'critical' : 'high',
        category: 'stock',
        icon: s.quantite == 0 ? '🚨' : '📦',
        metadata: { reference: s.id, produit: s.produit, quantite: s.quantite },
      });
    }
  }

  async checkPublicationsExpirees(): Promise<void> {
    const rows = await this.dataSource.query(`
      SELECT id, user_id, produit, date_expiration
      FROM publications
      WHERE statut = 'disponible'
        AND date_expiration IS NOT NULL
        AND date_expiration < NOW()::date
    `);

    for (const p of rows) {
      const deja = await this.dejaNotifieAujourdhui(p.user_id, 'offre_expiree', p.id);
      if (deja) continue;
      await this.creerNotif({
        userId: p.user_id,
        type: 'offre_expiree',
        titre: `Publication expirée pour ${p.produit}`,
        message: `Ta publication ${p.produit} a expiré. Renouvelle-la si besoin.`,
        priority: 'medium',
        category: 'marche',
        icon: '⌛',
        metadata: { publicationId: p.id, produit: p.produit, dateExpiration: p.date_expiration },
      });
    }
  }

  // ── CRON — Vérification globale tous les users actifs ──────
  @Cron('0 * * * *')
  async runCronAlertes(): Promise<void> {
    if (!(await this.cronJobsConfig.isEnabled(CRON_JOB_ALERTES_VERIFICATION))) {
      this.logger.debug('[CRON] désactivé depuis le back-office — exécution ignorée');
      return;
    }
    const startedAt = Date.now();
    try {
      await this.executerVerificationAlertes();
      await this.cronJobsConfig.recordExecution(CRON_JOB_ALERTES_VERIFICATION, {
        status: 'success',
        durationMs: Date.now() - startedAt,
      });
    } catch (e: any) {
      await this.cronJobsConfig.recordExecution(CRON_JOB_ALERTES_VERIFICATION, {
        status: 'error',
        durationMs: Date.now() - startedAt,
        error: e?.message ?? String(e),
      });
      throw e;
    }
  }

  private async executerVerificationAlertes(): Promise<void> {
    this.logger.log('[CRON] Lancement vérification alertes...');
    const marchands = await this.dataSource.query(`
      SELECT id FROM users WHERE role = 'marchand' AND status = 'actif'
    `);
    const producteurs = await this.dataSource.query(`
      SELECT id FROM users WHERE role = 'producteur' AND status = 'actif'
    `);

    for (const u of marchands) {
      try {
        await this.checkStocksFaibles(u.id);
      } catch (e: any) {
        this.logger.error(`[CRON] checkStocksFaibles ${u.id}: ${e.message}`);
      }
    }
    for (const u of producteurs) {
      try {
        await this.checkRecoltesProches(u.id);
      } catch (e: any) {
        this.logger.error(`[CRON] checkRecoltesProches ${u.id}: ${e.message}`);
      }
    }
    try {
      await this.checkPublicationsExpirees();
    } catch (e: any) {
      this.logger.error(`[CRON] checkPublicationsExpirees: ${e.message}`);
    }
    this.logger.log(`[CRON] Alertes vérifiées — ${marchands.length} marchands, ${producteurs.length} producteurs`);
  }
}
