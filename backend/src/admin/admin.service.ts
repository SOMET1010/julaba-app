import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Cooperative } from '../cooperatives-rest/cooperative.entity';
import { WalletTransaction } from '../wallets/entities/wallet-transaction.entity';
import { DataSource } from 'typeorm';
import { AuditLog } from '../audit-rest/audit-log.entity';

type DeviceFamily = 'desktop' | 'mobile' | 'tablet' | 'app' | 'unknown';

type DeviceInfo = {
  family: DeviceFamily;
  browser: string;
  fullLabel: string;
  userAgent: string;
};

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Cooperative) private coopsRepo: Repository<Cooperative>,
    @InjectRepository(WalletTransaction) private txRepo: Repository<WalletTransaction>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    private dataSource: DataSource,
  ) {}

  async getStats() {
    try {
      const [totalActeursRaw, totalCoops, nouveauxRaw] = await Promise.all([
        this.dataSource.query(`
          SELECT COUNT(*) as cnt FROM users u
          WHERE (
            u.role NOT IN ('marchand', 'producteur', 'cooperateur')
            OR EXISTS (
              SELECT 1 FROM identifications i
              WHERE i.acteur_id::text = u.id::text
                AND i.statut IN ('approuve', 'validee', 'en_attente', 'complement', 'rejete')
            )
          )
        `),
        this.coopsRepo.count(),
        this.dataSource.query(`
          SELECT COUNT(*) as cnt FROM users u
          WHERE u.created_at >= NOW() - INTERVAL '7 days'
            AND (
              u.role NOT IN ('marchand', 'producteur', 'cooperateur')
              OR EXISTS (
                SELECT 1 FROM identifications i
                WHERE i.acteur_id::text = u.id::text
                  AND i.statut IN ('approuve', 'validee', 'en_attente', 'complement', 'rejete')
              )
            )
        `),
      ]);
      const totalActeurs = parseInt(totalActeursRaw[0]?.cnt || 0, 10);
      const nouveaux = parseInt(nouveauxRaw[0]?.cnt || 0, 10);

      const [txToday, txHour, volumeTotal, caisseTotals] = await Promise.all([
        this.txRepo.createQueryBuilder('t')
          .where("t.created_at >= CURRENT_DATE").getCount(),
        this.txRepo.createQueryBuilder('t')
          .where("t.created_at >= NOW() - INTERVAL '1 hour'").getCount(),
        this.txRepo.createQueryBuilder('t')
          .select('SUM(t.montant)', 'total')
          .getRawOne(),
        this.dataSource.query(
          "SELECT COUNT(*) as nb, COALESCE(SUM(montant),0) as total FROM caisse_transactions WHERE type='vente'"
        ),
      ]);

      const activeUsersRaw = await this.dataSource.query(`
        SELECT COUNT(*) as cnt FROM users u
        WHERE u.status = 'actif'
          AND (
            u.role NOT IN ('marchand', 'producteur', 'cooperateur')
            OR EXISTS (
              SELECT 1 FROM identifications i
              WHERE i.acteur_id::text = u.id::text
                AND i.statut IN ('approuve', 'validee', 'en_attente', 'complement', 'rejete')
            )
          )
      `).catch(() => [{ cnt: 0 }]);
      const activeUsers = parseInt(activeUsersRaw[0]?.cnt || 0, 10);

      return {
        total_acteurs: totalActeurs,
        total_transactions: txToday + parseInt(caisseTotals[0]?.nb || 0),
        transactions_heure: txHour,
        total_cooperatives: totalCoops,
        montant_total: Number(volumeTotal?.total || 0) + Number(caisseTotals[0]?.total || 0),
        nouveaux_acteurs_semaine: nouveaux,
        utilisateurs_actifs: activeUsers,
        timestamp: new Date().toISOString(),
      };
    } catch (e) {
      return {
        total_acteurs: 0, total_transactions: 0, transactions_heure: 0,
        total_cooperatives: 0, montant_total: 0, nouveaux_acteurs_semaine: 0,
        utilisateurs_actifs: 0, timestamp: new Date().toISOString(),
      };
    }
  }

  private async queryActivitySource(
    source: string,
    sql: string,
    params: any[],
    countSql?: string,
  ): Promise<any[]> {
    try {
      const rows = await this.dataSource.query(sql, params);
      if (rows.length === 0 && countSql) {
        await this.warnEmptyActivitySource(source, countSql);
      }
      return rows;
    } catch (error) {
      console.warn(`[AdminService.getRecentActivity] Source ${source} indisponible`, {
        message: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private async warnEmptyActivitySource(source: string, countSql: string): Promise<void> {
    try {
      const counts = await this.dataSource.query(countSql);
      console.warn(`[AdminService.getRecentActivity] Source ${source} vide`, {
        rowsBeforeFilter: Number(counts[0]?.rows_before_filter || 0),
        rowsAfterFilter: Number(counts[0]?.rows_after_filter || 0),
      });
    } catch (error) {
      console.warn(`[AdminService.getRecentActivity] Source ${source} vide, comptage impossible`, {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async getActivitySchema() {
    const rows: Array<{ table_schema: string; table_name: string; column_name: string }> = await this.dataSource.query(`
      SELECT table_schema, table_name, column_name
      FROM information_schema.columns
      WHERE (table_schema = 'public' AND table_name IN (
        'users',
        'users_julaba',
        'wallet_transactions',
        'caisse_transactions',
        'identifications',
        'user_flags',
        'notifications',
        'audit_logs',
        'zones'
      ))
      OR (table_schema = 'auth' AND table_name = 'users')
    `);
    const columns = new Set(rows.map((row) => `${row.table_schema}.${row.table_name}.${row.column_name}`));
    const hasColumn = (schema: string, table: string, column: string) => columns.has(`${schema}.${table}.${column}`);
    const hasTable = (schema: string, table: string) => rows.some((row) => row.table_schema === schema && row.table_name === table);
    const userTable = hasTable('public', 'users') ? 'users' : hasTable('public', 'users_julaba') ? 'users_julaba' : null;

    return { hasColumn, hasTable, userTable };
  }

  private getUserSql(schema: any) {
    if (!schema.userTable) return null;
    const table = schema.userTable;
    const has = (column: string) => schema.hasColumn('public', table, column);
    const nameExpr = has('first_name') || has('last_name')
      ? `COALESCE(NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''), u.phone, u.email, 'Acteur')`
      : `COALESCE(NULLIF(CONCAT_WS(' ', u.prenom, u.nom), ''), u.telephone, u.email, 'Acteur')`;
    const zoneIdExpr = has('zone_id') ? `u.zone_id::text` : `NULL::text`;
    const zoneJoin = has('zone_id') ? `LEFT JOIN zones z ON z.id::text = u.zone_id::text` : `LEFT JOIN zones z ON false`;
    const lastLoginExpr = has('last_login_at') ? `u.last_login_at` : null;
    const lastLoginUserAgentExpr = has('last_login_user_agent') ? `u.last_login_user_agent` : null;

    return {
      table,
      tableSql: table,
      nameExpr,
      roleExpr: has('role') ? `u.role` : `NULL::text`,
      userIdExpr: `u.id::text`,
      zoneIdExpr,
      zoneJoin,
      lastLoginExpr,
      lastLoginUserAgentExpr,
      createdAtExpr: has('created_at') ? `u.created_at` : null,
      authUserIdExpr: has('auth_user_id') ? `u.auth_user_id` : null,
    };
  }

  private parseDevice(raw: unknown): DeviceInfo {
    const userAgent = typeof raw === 'string' ? raw.trim() : '';
    if (!userAgent) {
      return {
        family: 'unknown',
        browser: 'Inconnu',
        fullLabel: 'Non identifié',
        userAgent: '',
      };
    }

    const ua = userAgent.toLowerCase();
    const browser = (() => {
      if (ua.includes('julaba-apk') || ua.includes('julaba apk') || ua.includes('apk') || ua.includes('okhttp') || ua.includes('dart') || ua.includes('flutter')) return 'APK';
      if (ua.includes('samsungbrowser/')) return 'Samsung';
      if (ua.includes('edg/') || ua.includes('edge/')) return 'Edge';
      if (ua.includes('firefox/') || ua.includes('fxios/')) return 'Firefox';
      if (ua.includes('chrome/') || ua.includes('crios/')) return 'Chrome';
      if (ua.includes('safari/')) return 'Safari';
      return 'Inconnu';
    })();

    const device = (() => {
      if (browser === 'APK') {
        if (ua.includes('iphone')) return { os: 'iPhone', family: 'app' as DeviceFamily };
        if (ua.includes('ipad')) return { os: 'iPad', family: 'app' as DeviceFamily };
        if (ua.includes('android')) return { os: 'Android', family: 'app' as DeviceFamily };
        return { os: 'Mobile', family: 'app' as DeviceFamily };
      }
      if (ua.includes('iphone')) return 'iPhone';
      if (ua.includes('ipad')) return 'iPad';
      if (ua.includes('android')) {
        const os = ua.includes('samsung') || /\bsm-[a-z0-9]+/i.test(userAgent) ? 'Samsung' : 'Android';
        return { os, family: ua.includes('mobile') ? 'mobile' as DeviceFamily : 'tablet' as DeviceFamily };
      }
      if (ua.includes('windows')) return { os: 'Windows', family: 'desktop' as DeviceFamily };
      if (ua.includes('mac os x') || ua.includes('macintosh') || ua.includes('macos')) return { os: 'MacBook', family: 'desktop' as DeviceFamily };
      if (ua.includes('linux')) return { os: 'Linux', family: 'desktop' as DeviceFamily };
      return { os: 'Inconnu', family: 'unknown' as DeviceFamily };
    })();

    if (typeof device === 'string') {
      const family: DeviceFamily = device === 'iPhone' ? 'mobile' : 'tablet';
      return { family, browser, fullLabel: `${device} - ${browser}`, userAgent };
    }

    return {
      family: device.family,
      browser,
      fullLabel: `${device.os} - ${browser}`,
      userAgent,
    };
  }

  private sanitizeMetadata(raw: any): Record<string, unknown> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const blocked = ['password', 'token', 'secret', 'hash', 'pin', 'credential', 'challenge'];
    return Object.entries(raw).reduce<Record<string, unknown>>((acc, [key, value]) => {
      const lower = key.toLowerCase();
      if (blocked.some((word) => lower.includes(word))) return acc;
      if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
        acc[key] = value as string | number | boolean | null;
      }
      return acc;
    }, {});
  }

  private toActivityEvent(row: any) {
    const rawMontant = row.montant;
    const montant = rawMontant === null || rawMontant === undefined || rawMontant === ''
      ? undefined
      : Number(rawMontant);
    const metadata = this.sanitizeMetadata(row.metadata);
    const type = row.type || 'connexion';
    const rawDevice = row.device ?? row.user_agent ?? metadata.deviceInfo ?? metadata.userAgent;
    const deviceInfo = type === 'connexion' ? this.parseDevice(rawDevice) : undefined;
    const fallbackColor: Record<string, string> = {
      connexion: 'blue',
      acteur: 'purple',
      transaction: 'green',
      paiement: 'green',
      validation: 'blue',
      alerte: 'red',
    };

    return {
      id: String(row.id),
      type,
      label: row.label || 'Événement',
      detail: row.detail || '',
      timestamp: row.timestamp,
      color: row.color || fallbackColor[type] || 'blue',
      acteurNom: row.acteur_nom || row.acteurNom || undefined,
      acteurRole: row.acteur_role || row.acteurRole || undefined,
      userId: row.user_id || row.userId || undefined,
      zoneId: row.zone_id || row.zoneId || undefined,
      zoneNom: row.zone_nom || row.zoneNom || row.zonenom || undefined,
      montant: typeof montant === 'number' && Number.isFinite(montant) ? montant : undefined,
      reference: row.reference || undefined,
      ip: row.ip || undefined,
      device: deviceInfo?.fullLabel,
      deviceFamily: deviceInfo?.family,
      deviceBrowser: deviceInfo?.browser,
      deviceUserAgent: deviceInfo?.userAgent,
      metadata,
    };
  }

  async getRecentActivity(limit = 50) {
    const take = Math.min(Math.max(Number(limit) || 50, 1), 100);

    try {
      const schema = await this.getActivitySchema();
      const userSql = this.getUserSql(schema);
      const userNameExpr = userSql?.nameExpr || `NULL::text`;
      const userRoleExpr = userSql?.roleExpr || `NULL::text`;
      const userZoneIdExpr = userSql?.zoneIdExpr || `NULL::text`;
      const userJoin = (sourceUserId: string) => userSql ? `LEFT JOIN ${userSql.tableSql} u ON u.id::text = ${sourceUserId}` : '';
      const zoneJoin = (zoneIdExpr: string) => `LEFT JOIN zones z ON z.id::text = ${zoneIdExpr}`;
      const emptySource = (source: string, message: string) => {
        console.warn(`[AdminService.getRecentActivity] Source ${source} indisponible`, { message });
        return Promise.resolve([]);
      };
      const hasWalletColumn = (column: string) => schema.hasColumn('public', 'wallet_transactions', column);
      const hasCaisseColumn = (column: string) => schema.hasColumn('public', 'caisse_transactions', column);
      const hasIdentificationColumn = (column: string) => schema.hasColumn('public', 'identifications', column);
      const hasAuditColumn = (column: string) => schema.hasColumn('public', 'audit_logs', column);
      const auditDeviceExpr = [
        hasAuditColumn('user_agent') ? 'a.user_agent' : null,
        hasAuditColumn('details') ? `a.details->>'deviceInfo'` : null,
        hasAuditColumn('details') ? `a.details->>'userAgent'` : null,
        hasAuditColumn('metadata') ? `a.metadata->>'deviceInfo'` : null,
        hasAuditColumn('metadata') ? `a.metadata->>'userAgent'` : null,
      ].filter(Boolean).length > 0
        ? `COALESCE(${[
          hasAuditColumn('user_agent') ? 'a.user_agent' : null,
          hasAuditColumn('details') ? `a.details->>'deviceInfo'` : null,
          hasAuditColumn('details') ? `a.details->>'userAgent'` : null,
          hasAuditColumn('metadata') ? `a.metadata->>'deviceInfo'` : null,
          hasAuditColumn('metadata') ? `a.metadata->>'userAgent'` : null,
        ].filter(Boolean).join(', ')})`
        : 'NULL::text';

      const connexionSource = userSql?.lastLoginExpr
        ? this.queryActivitySource('connexion', `
          SELECT
            CONCAT('connexion:', ${userSql.userIdExpr}, ':', EXTRACT(EPOCH FROM ${userSql.lastLoginExpr})::bigint) AS id,
            'connexion' AS type,
            'Connexion' AS label,
            ${userSql.nameExpr} AS detail,
            ${userSql.lastLoginExpr} AS timestamp,
            'blue' AS color,
            ${userSql.nameExpr} AS acteur_nom,
            ${userSql.roleExpr} AS acteur_role,
            ${userSql.userIdExpr} AS user_id,
            ${userSql.zoneIdExpr} AS zone_id,
            z.nom AS zone_nom,
            NULL::numeric AS montant,
            NULL::text AS reference,
            NULL::text AS ip,
            ${userSql.lastLoginUserAgentExpr || 'NULL::text'} AS device,
            jsonb_build_object('source', '${userSql.table}.last_login_at') AS metadata
          FROM ${userSql.tableSql} u
          ${userSql.zoneJoin}
          WHERE ${userSql.lastLoginExpr} IS NOT NULL
            AND ${userSql.lastLoginExpr} >= NOW() - INTERVAL '24 hours'
          ORDER BY ${userSql.lastLoginExpr} DESC
          LIMIT $1
        `, [take], `
          SELECT
            COUNT(*) FILTER (WHERE ${userSql.lastLoginExpr} IS NOT NULL)::int AS rows_before_filter,
            COUNT(*) FILTER (
              WHERE ${userSql.lastLoginExpr} IS NOT NULL
                AND ${userSql.lastLoginExpr} >= NOW() - INTERVAL '24 hours'
            )::int AS rows_after_filter
          FROM ${userSql.tableSql} u
        `)
        : userSql?.authUserIdExpr && schema.hasColumn('auth', 'users', 'last_sign_in_at')
          ? this.queryActivitySource('connexion', `
            SELECT
              CONCAT('connexion:', COALESCE(u.id::text, au.id::text), ':', EXTRACT(EPOCH FROM au.last_sign_in_at)::bigint) AS id,
              'connexion' AS type,
              'Connexion' AS label,
              COALESCE(${userSql.nameExpr}, au.email, au.phone, 'Acteur') AS detail,
              au.last_sign_in_at AS timestamp,
              'blue' AS color,
              COALESCE(${userSql.nameExpr}, au.email, au.phone) AS acteur_nom,
              ${userSql.roleExpr} AS acteur_role,
              COALESCE(u.id::text, au.id::text) AS user_id,
              ${userSql.zoneIdExpr} AS zone_id,
              z.nom AS zone_nom,
              NULL::numeric AS montant,
              NULL::text AS reference,
              NULL::text AS ip,
              NULL::text AS device,
              jsonb_build_object('source', 'auth.users.last_sign_in_at') AS metadata
            FROM auth.users au
            LEFT JOIN ${userSql.tableSql} u ON u.auth_user_id = au.id
            ${userSql.zoneJoin}
            WHERE au.last_sign_in_at IS NOT NULL
              AND au.last_sign_in_at >= NOW() - INTERVAL '24 hours'
            ORDER BY au.last_sign_in_at DESC
            LIMIT $1
          `, [take], `
            SELECT
              COUNT(*) FILTER (WHERE au.last_sign_in_at IS NOT NULL)::int AS rows_before_filter,
              COUNT(*) FILTER (
                WHERE au.last_sign_in_at IS NOT NULL
                  AND au.last_sign_in_at >= NOW() - INTERVAL '24 hours'
              )::int AS rows_after_filter
            FROM auth.users au
          `)
          : emptySource('connexion', 'Aucune colonne last_login_at ou auth.users.last_sign_in_at disponible');

      const acteursSource = userSql?.createdAtExpr
        ? this.queryActivitySource('acteur', `
          SELECT
            CONCAT('acteur:', ${userSql.userIdExpr}) AS id,
            'acteur' AS type,
            'Nouvel acteur inscrit' AS label,
            ${userSql.nameExpr} AS detail,
            ${userSql.createdAtExpr} AS timestamp,
            'purple' AS color,
            ${userSql.nameExpr} AS acteur_nom,
            ${userSql.roleExpr} AS acteur_role,
            ${userSql.userIdExpr} AS user_id,
            ${userSql.zoneIdExpr} AS zone_id,
            z.nom AS zone_nom,
            NULL::numeric AS montant,
            NULL::text AS reference,
            NULL::text AS ip,
            jsonb_build_object('source', '${userSql.table}.created_at') AS metadata
          FROM ${userSql.tableSql} u
          ${userSql.zoneJoin}
          WHERE ${userSql.createdAtExpr} >= NOW() - INTERVAL '24 hours'
          ORDER BY ${userSql.createdAtExpr} DESC
          LIMIT $1
        `, [take], `
          SELECT
            COUNT(*)::int AS rows_before_filter,
            COUNT(*) FILTER (WHERE ${userSql.createdAtExpr} >= NOW() - INTERVAL '24 hours')::int AS rows_after_filter
          FROM ${userSql.tableSql} u
        `)
        : emptySource('acteur', 'Table utilisateurs ou colonne created_at introuvable');

      const walletReferenceExpr = hasWalletColumn('reference')
        ? `wt.reference`
        : hasWalletColumn('related_entity_id')
          ? `COALESCE(wt.metadata->>'reference', wt.metadata->>'commandeId', wt.related_entity_id::text)`
          : `COALESCE(wt.metadata->>'reference', wt.metadata->>'commandeId', wt.id::text)`;
      const walletMetadataExpr = hasWalletColumn('related_entity_type')
        ? `jsonb_build_object('source', 'wallet_transactions', 'statut', wt.statut, 'relatedEntityType', wt.related_entity_type) || COALESCE(wt.metadata, '{}'::jsonb)`
        : `jsonb_build_object('source', 'wallet_transactions', 'statut', wt.statut) || COALESCE(wt.metadata, '{}'::jsonb)`;

      const [
        connexions,
        acteurs,
        walletTransactions,
        caisseTransactions,
        validations,
        alertes,
        notifications,
        audit,
      ] = await Promise.all([
        connexionSource,
        acteursSource,
        this.queryActivitySource('transaction.wallet', `
          SELECT
            wt.id::text AS id,
            'transaction' AS type,
            CASE WHEN wt.type = 'credit' THEN 'Crédit wallet' ELSE 'Débit wallet' END AS label,
            COALESCE(wt.description, '') AS detail,
            wt.created_at AS timestamp,
            CASE WHEN wt.type = 'credit' THEN 'green' ELSE 'blue' END AS color,
            ${userNameExpr} AS acteur_nom,
            ${userRoleExpr} AS acteur_role,
            wt.user_id::text AS user_id,
            ${userZoneIdExpr} AS zone_id,
            z.nom AS zone_nom,
            wt.montant AS montant,
            ${walletReferenceExpr} AS reference,
            NULL::text AS ip,
            ${walletMetadataExpr} AS metadata
          FROM wallet_transactions wt
          ${userJoin('wt.user_id::text')}
          ${zoneJoin(userZoneIdExpr)}
          WHERE wt.created_at >= NOW() - INTERVAL '24 hours'
          ORDER BY wt.created_at DESC
          LIMIT $1
        `, [take], `
          SELECT
            COUNT(*)::int AS rows_before_filter,
            COUNT(*) FILTER (WHERE wt.created_at >= NOW() - INTERVAL '24 hours')::int AS rows_after_filter
          FROM wallet_transactions wt
        `),
        this.queryActivitySource('transaction.caisse', `
          SELECT
            CONCAT('caisse:', ct.id::text) AS id,
            'transaction' AS type,
            CASE WHEN ct.mode_paiement IS NOT NULL THEN 'Paiement caisse' ELSE 'Transaction caisse' END AS label,
            COALESCE(${[
              hasCaisseColumn('description') ? 'ct.description' : null,
              hasCaisseColumn('produit') ? 'ct.produit' : null,
              hasCaisseColumn('notes') ? 'ct.notes' : null,
              hasCaisseColumn('produits') ? 'ct.produits::text' : null,
            ].filter(Boolean).join(', ') || `''`}, '') AS detail,
            ct.created_at AS timestamp,
            'green' AS color,
            ${userNameExpr} AS acteur_nom,
            ${userRoleExpr} AS acteur_role,
            ${[
              hasCaisseColumn('user_id') ? 'ct.user_id::text' : null,
              hasCaisseColumn('marchand_id') ? 'ct.marchand_id::text' : null,
            ].filter(Boolean).length > 1
              ? `COALESCE(${[
                hasCaisseColumn('user_id') ? 'ct.user_id::text' : null,
                hasCaisseColumn('marchand_id') ? 'ct.marchand_id::text' : null,
              ].filter(Boolean).join(', ')})`
              : ([hasCaisseColumn('user_id') ? 'ct.user_id::text' : null, hasCaisseColumn('marchand_id') ? 'ct.marchand_id::text' : null].filter(Boolean)[0] || 'NULL::text')} AS user_id,
            ${hasCaisseColumn('zone_id') ? `COALESCE(ct.zone_id::text, ${userZoneIdExpr})` : userZoneIdExpr} AS zone_id,
            z.nom AS zone_nom,
            ct.montant AS montant,
            ${hasCaisseColumn('details')
              ? `COALESCE(ct.details->>'reference', ct.details->>'ref', ${hasCaisseColumn('session_id') ? 'ct.session_id' : 'ct.id::text'})`
              : hasCaisseColumn('metadata')
                ? `COALESCE(ct.metadata->>'reference', ct.metadata->>'ref', ct.id::text)`
                : `ct.id::text`} AS reference,
            NULL::text AS ip,
            jsonb_build_object('source', 'caisse_transactions', 'modePaiement', ct.mode_paiement) || ${
              hasCaisseColumn('details') ? `COALESCE(ct.details, '{}'::jsonb)` : hasCaisseColumn('metadata') ? `COALESCE(ct.metadata, '{}'::jsonb)` : `'{}'::jsonb`
            } AS metadata
          FROM caisse_transactions ct
          ${userJoin([
            hasCaisseColumn('user_id') ? 'ct.user_id::text' : null,
            hasCaisseColumn('marchand_id') ? 'ct.marchand_id::text' : null,
          ].filter(Boolean).length > 1
            ? `COALESCE(${[
              hasCaisseColumn('user_id') ? 'ct.user_id::text' : null,
              hasCaisseColumn('marchand_id') ? 'ct.marchand_id::text' : null,
            ].filter(Boolean).join(', ')})`
            : ([hasCaisseColumn('user_id') ? 'ct.user_id::text' : null, hasCaisseColumn('marchand_id') ? 'ct.marchand_id::text' : null].filter(Boolean)[0] || 'NULL::text'))}
          ${zoneJoin(hasCaisseColumn('zone_id') ? `COALESCE(ct.zone_id::text, ${userZoneIdExpr})` : userZoneIdExpr)}
          WHERE ct.created_at >= NOW() - INTERVAL '24 hours'
          ORDER BY ct.created_at DESC
          LIMIT $1
        `, [take], `
          SELECT
            COUNT(*)::int AS rows_before_filter,
            COUNT(*) FILTER (WHERE ct.created_at >= NOW() - INTERVAL '24 hours')::int AS rows_after_filter
          FROM caisse_transactions ct
        `),
        this.queryActivitySource('validation', `
          SELECT
            CONCAT('validation:', i.id::text) AS id,
            'validation' AS type,
            CASE WHEN i.statut IN ('rejete', 'rejected') THEN 'Dossier rejeté' ELSE 'Dossier validé' END AS label,
            ${hasIdentificationColumn('acteur_nom') ? `COALESCE(i.acteur_nom, ${userNameExpr}, 'Acteur')` : `COALESCE(${userNameExpr}, 'Acteur')`} AS detail,
            ${hasIdentificationColumn('updated_at') ? `COALESCE(i.updated_at, i.created_at)` : `i.created_at`} AS timestamp,
            'blue' AS color,
            ${hasIdentificationColumn('acteur_nom') ? `COALESCE(i.acteur_nom, ${userNameExpr})` : userNameExpr} AS acteur_nom,
            COALESCE(i.type_acteur, ${userRoleExpr}) AS acteur_role,
            COALESCE(i.acteur_id::text, ${userSql ? 'u.id::text' : 'NULL::text'}) AS user_id,
            COALESCE(i.zone_id::text, ${userZoneIdExpr}) AS zone_id,
            z.nom AS zone_nom,
            i.commission AS montant,
            i.id::text AS reference,
            NULL::text AS ip,
            jsonb_build_object(
              'source', 'identifications',
              'statut', i.statut,
              'validateurId', i.identificateur_id,
              'motifRejet', i.motif_rejet
            ) AS metadata
          FROM identifications i
          ${userJoin('i.acteur_id::text')}
          ${zoneJoin(`COALESCE(i.zone_id::text, ${userZoneIdExpr})`)}
          WHERE i.statut IN ('approuve', 'validee', 'rejete', 'complement', 'validated', 'rejected')
            AND ${hasIdentificationColumn('updated_at') ? `COALESCE(i.updated_at, i.created_at)` : `i.created_at`} >= NOW() - INTERVAL '24 hours'
          ORDER BY ${hasIdentificationColumn('updated_at') ? `COALESCE(i.updated_at, i.created_at)` : `i.created_at`} DESC
          LIMIT $1
        `, [take], `
          SELECT
            COUNT(*) FILTER (WHERE i.statut IN ('approuve', 'validee', 'rejete', 'complement', 'validated', 'rejected'))::int AS rows_before_filter,
            COUNT(*) FILTER (
              WHERE i.statut IN ('approuve', 'validee', 'rejete', 'complement', 'validated', 'rejected')
                AND ${hasIdentificationColumn('updated_at') ? `COALESCE(i.updated_at, i.created_at)` : `i.created_at`} >= NOW() - INTERVAL '24 hours'
            )::int AS rows_after_filter
          FROM identifications i
        `),
        schema.hasTable('public', 'user_flags')
          ? this.queryActivitySource('alerte.user_flags', `
            SELECT
              CONCAT('alerte:', uf.id::text) AS id,
              'alerte' AS type,
              'Alerte signalement' AS label,
              COALESCE(uf.raison, uf.flag_type, 'Signalement acteur') AS detail,
              uf.created_at AS timestamp,
              'red' AS color,
              ${userNameExpr} AS acteur_nom,
              ${userRoleExpr} AS acteur_role,
              uf.user_id AS user_id,
              ${userZoneIdExpr} AS zone_id,
              z.nom AS zone_nom,
              NULL::numeric AS montant,
              uf.id::text AS reference,
              ${hasAuditColumn('ip') ? 'al.ip' : 'NULL::text'} AS ip,
              jsonb_build_object('source', 'user_flags', 'flagType', uf.flag_type, 'createdBy', uf.created_by) AS metadata
            FROM user_flags uf
            ${userJoin('uf.user_id::text')}
            ${zoneJoin(userZoneIdExpr)}
            ${schema.hasTable('public', 'audit_logs') && hasAuditColumn('entite_id') ? 'LEFT JOIN audit_logs al ON al.entite_id = uf.id::text' : ''}
            WHERE uf.created_at >= NOW() - INTERVAL '24 hours'
            ORDER BY uf.created_at DESC
            LIMIT $1
          `, [take], `
            SELECT
              COUNT(*)::int AS rows_before_filter,
              COUNT(*) FILTER (WHERE uf.created_at >= NOW() - INTERVAL '24 hours')::int AS rows_after_filter
            FROM user_flags uf
          `)
          : emptySource('alerte.user_flags', 'Table user_flags absente'),
        this.queryActivitySource('alerte.notifications', `
          SELECT
            CONCAT('notification:', n.id::text) AS id,
            'alerte' AS type,
            COALESCE(n.titre, 'Alerte') AS label,
            COALESCE(n.message, '') AS detail,
            n.created_at AS timestamp,
            'red' AS color,
            ${userNameExpr} AS acteur_nom,
            COALESCE(n.role, ${userRoleExpr}) AS acteur_role,
            n.user_id AS user_id,
            ${userZoneIdExpr} AS zone_id,
            z.nom AS zone_nom,
            NULL::numeric AS montant,
            n.id::text AS reference,
            NULL::text AS ip,
            jsonb_build_object('source', 'notifications', 'priority', n.priority, 'category', n.category) || COALESCE(n.metadata, '{}'::jsonb) AS metadata
          FROM notifications n
          ${userJoin('n.user_id::text')}
          ${zoneJoin(userZoneIdExpr)}
          WHERE n.created_at >= NOW() - INTERVAL '24 hours'
            AND (n.type ILIKE '%alerte%' OR n.type ILIKE '%alert%' OR n.category = 'admin' OR n.priority = 'high')
          ORDER BY n.created_at DESC
          LIMIT $1
        `, [take], `
          SELECT
            COUNT(*) FILTER (WHERE n.type ILIKE '%alerte%' OR n.type ILIKE '%alert%' OR n.category = 'admin' OR n.priority = 'high')::int AS rows_before_filter,
            COUNT(*) FILTER (
              WHERE n.created_at >= NOW() - INTERVAL '24 hours'
                AND (n.type ILIKE '%alerte%' OR n.type ILIKE '%alert%' OR n.category = 'admin' OR n.priority = 'high')
            )::int AS rows_after_filter
          FROM notifications n
        `),
        this.queryActivitySource('audit', `
          SELECT
            CONCAT('audit:', a.id::text) AS id,
            CASE
              WHEN a.action IN ('login', 'logout', 'connexion') THEN 'connexion'
              WHEN a.action IN ('validation', 'rejet') THEN 'validation'
              WHEN a.action ILIKE '%signalement%' THEN 'alerte'
              ELSE 'acteur'
            END AS type,
            CASE
              WHEN a.action = 'login' THEN 'Connexion'
              WHEN a.action = 'logout' THEN 'Déconnexion'
              WHEN a.action = 'validation' THEN 'Validation'
              WHEN a.action = 'rejet' THEN 'Rejet'
              ELSE COALESCE(a.action, 'Action')
            END AS label,
            ${hasAuditColumn('entite') ? `COALESCE(a.entite, '')` : hasAuditColumn('description') ? `COALESCE(a.description, a.entity_type, '')` : `''`} AS detail,
            a.created_at AS timestamp,
            'amber' AS color,
            ${userNameExpr} AS acteur_nom,
            ${hasAuditColumn('role') ? `COALESCE(a.role, ${userRoleExpr})` : userRoleExpr} AS acteur_role,
            a.user_id AS user_id,
            ${userZoneIdExpr} AS zone_id,
            z.nom AS zone_nom,
            NULL::numeric AS montant,
            ${hasAuditColumn('entite_id') ? 'a.entite_id' : hasAuditColumn('entity_id') ? 'a.entity_id' : 'NULL::text'} AS reference,
            ${hasAuditColumn('ip') ? 'a.ip' : 'NULL::text'} AS ip,
            ${auditDeviceExpr} AS device,
            jsonb_build_object('source', 'audit_logs') || ${hasAuditColumn('details') ? `COALESCE(a.details, '{}'::jsonb)` : hasAuditColumn('metadata') ? `COALESCE(a.metadata, '{}'::jsonb)` : `'{}'::jsonb`} AS metadata
          FROM audit_logs a
          ${userJoin('a.user_id::text')}
          ${zoneJoin(userZoneIdExpr)}
          WHERE a.created_at >= NOW() - INTERVAL '24 hours'
            AND (a.action IN ('login', 'logout', 'connexion', 'validation', 'rejet')
              OR a.action ILIKE '%signalement%')
          ORDER BY a.created_at DESC
          LIMIT $1
        `, [take], `
          SELECT
            COUNT(*) FILTER (WHERE a.action IN ('login', 'logout', 'connexion', 'validation', 'rejet') OR a.action ILIKE '%signalement%')::int AS rows_before_filter,
            COUNT(*) FILTER (
              WHERE a.created_at >= NOW() - INTERVAL '24 hours'
                AND (a.action IN ('login', 'logout', 'connexion', 'validation', 'rejet') OR a.action ILIKE '%signalement%')
            )::int AS rows_after_filter
          FROM audit_logs a
        `),
      ]);

      return [
        ...connexions,
        ...acteurs,
        ...walletTransactions,
        ...caisseTransactions,
        ...validations,
        ...alertes,
        ...notifications,
        ...audit,
      ]
        .map((row) => this.toActivityEvent(row))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, take);
    } catch {
      return [];
    }
  }

  async getSystemHealth() {
    const start = Date.now();
    try {
      await this.usersRepo.query('SELECT 1');
      const dbLatency = Date.now() - start;
      const [txCount, errorCount] = await Promise.all([
        this.txRepo.createQueryBuilder('t')
          .where("t.created_at >= NOW() - INTERVAL '1 hour'").getCount(),
        this.auditRepo.createQueryBuilder('a')
          .where("a.created_at >= NOW() - INTERVAL '1 hour'")
          .andWhere("a.action ILIKE '%error%'").getCount().catch(() => 0),
      ]);

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        db: { status: 'ok', latency_ms: dbLatency },
        api: { status: 'ok', transactions_last_hour: txCount, errors_last_hour: errorCount },
        uptime_seconds: Math.floor(process.uptime()),
      };
    } catch (e) {
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        db: { status: 'error', latency_ms: Date.now() - start },
        api: { status: 'unknown', transactions_last_hour: 0, errors_last_hour: 0 },
        uptime_seconds: Math.floor(process.uptime()),
      };
    }
  }

  async getTransactionsTimeline() {
    try {
      const raw = await this.txRepo.createQueryBuilder('t')
        .select("date_trunc('minute', t.created_at)", 'minute')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(t.montant)', 'volume')
        .where("t.created_at >= NOW() - INTERVAL '2 hours'")
        .groupBy("date_trunc('minute', t.created_at)")
        .orderBy("minute", 'ASC')
        .getRawMany();

      return raw.map(r => ({
        time: new Date(r.minute).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        transactions: Number(r.count),
        volume: Math.round(Number(r.volume || 0) / 1000),
      }));
    } catch {
      return [];
    }
  }
}
