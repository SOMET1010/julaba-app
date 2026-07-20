import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface BOWalletRow {
  id: string;
  user_id: string;
  prenoms: string;
  nom: string;
  telephone: string;
  role: string;
  solde: string;
  solde_bloque: string;
  status: string;
  created_at: string;
}

export interface BOTransactionRow {
  id: string;
  user_id: string;
  prenoms: string;
  nom: string;
  telephone: string;
  type: string;
  montant: string;
  description: string;
  statut: string;
  created_at: string;
}

export interface BOWalletStatsRow {
  total_wallets: number;
  wallets_actifs: number;
  wallets_zero: number;
  volume_total: string;
  total_credits: string;
  total_debits: string;
  transactions_today: number;
  transactions_7j: number;
  transactions_30j: number;
  taux_recharge_moyen: string;
}

@Injectable()
export class AdminWalletsService {
  constructor(private readonly dataSource: DataSource) {}

  async getStats(): Promise<BOWalletStatsRow> {
    const [stats] = await this.dataSource.query(`
      SELECT
        COUNT(DISTINCT w.id)::int                                        AS total_wallets,
        COUNT(DISTINCT w.id) FILTER (WHERE w.solde > 0)::int            AS wallets_actifs,
        COUNT(DISTINCT w.id) FILTER (WHERE w.solde = 0)::int            AS wallets_zero,
        COALESCE(SUM(w.solde), 0)                                       AS volume_total,
        COALESCE(SUM(wt.montant) FILTER (WHERE wt.type = 'credit'), 0)  AS total_credits,
        COALESCE(SUM(wt.montant) FILTER (WHERE wt.type = 'debit'), 0)   AS total_debits,
        COUNT(wt.id) FILTER (WHERE wt.created_at >= CURRENT_DATE)::int  AS transactions_today,
        COUNT(wt.id) FILTER (WHERE wt.created_at >= NOW() - INTERVAL '7 days')::int  AS transactions_7j,
        COUNT(wt.id) FILTER (WHERE wt.created_at >= NOW() - INTERVAL '30 days')::int AS transactions_30j,
        COALESCE(AVG(wt.montant) FILTER (WHERE wt.type = 'credit'), 0)  AS taux_recharge_moyen
      FROM wallets w
      LEFT JOIN wallet_transactions wt ON wt.user_id = w.user_id
    `);
    return stats;
  }

  async getChartData(): Promise<{
    volume30j: { jour: string; nb_transactions: number; credits: string; debits: string }[];
    top10: { first_name: string; last_name: string; phone: string; volume_total: string; nb_transactions: number }[];
  }> {
    const volume30j = await this.dataSource.query(`
      SELECT
        DATE(created_at)            AS jour,
        COUNT(*)::int               AS nb_transactions,
        COALESCE(SUM(montant) FILTER (WHERE type = 'credit'), 0) AS credits,
        COALESCE(SUM(montant) FILTER (WHERE type = 'debit'), 0)  AS debits
      FROM wallet_transactions
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY jour ASC
    `);

    const top10 = await this.dataSource.query(`
      SELECT
        u.first_name, u.last_name, u.phone,
        COALESCE(SUM(wt.montant), 0) AS volume_total,
        COUNT(wt.id)::int             AS nb_transactions
      FROM users u
      JOIN wallets w ON w.user_id = u.id
      LEFT JOIN wallet_transactions wt ON wt.user_id = u.id
      GROUP BY u.id, u.first_name, u.last_name, u.phone
      ORDER BY volume_total DESC
      LIMIT 10
    `);

    return { volume30j, top10 };
  }

  async getAllWallets(params: {
    page: number;
    limit: number;
    search: string;
    role: string;
    statut: string;
    solde_min: string;
  }): Promise<{ wallets: BOWalletRow[]; total: number }> {
    const offset = (params.page - 1) * params.limit;
    const conditions: string[] = ['1=1'];
    const values: unknown[] = [];
    let idx = 1;

    if (params.search) {
      conditions.push(`(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR u.phone ILIKE $${idx})`);
      values.push(`%${params.search}%`);
      idx++;
    }
    if (params.role) {
      conditions.push(`u.role = $${idx}`);
      values.push(params.role);
      idx++;
    }
    if (params.statut === 'actif') {
      conditions.push(`w.solde > 0`);
    } else if (params.statut === 'zero') {
      conditions.push(`w.solde = 0`);
    }
    if (params.solde_min) {
      conditions.push(`w.solde >= $${idx}`);
      values.push(Number(params.solde_min));
      idx++;
    }

    const where = conditions.join(' AND ');

    const [countResult] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total FROM wallets w JOIN users u ON u.id = w.user_id WHERE ${where}`,
      values,
    );

    const wallets = await this.dataSource.query(
      `SELECT
         w.id, w.user_id,
         u.first_name AS prenoms,
         u.last_name  AS nom,
         u.phone      AS telephone,
         u.role,
         w.solde, w.solde_bloque,
         'actif'      AS status,
         w.created_at
       FROM wallets w
       JOIN users u ON u.id = w.user_id
       WHERE ${where}
       ORDER BY w.solde DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, params.limit, offset],
    );

    return { wallets, total: countResult.total };
  }

  async getAllTransactions(params: {
    page: number;
    limit: number;
    type: string;
    search: string;
    date_debut: string;
    date_fin: string;
    montant_min: string;
    montant_max: string;
  }): Promise<{ transactions: BOTransactionRow[]; total: number }> {
    const offset = (params.page - 1) * params.limit;
    const conditions: string[] = ['1=1'];
    const values: unknown[] = [];
    let idx = 1;

    if (params.type) {
      conditions.push(`wt.type = $${idx}`);
      values.push(params.type);
      idx++;
    }
    if (params.search) {
      conditions.push(`(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR u.phone ILIKE $${idx})`);
      values.push(`%${params.search}%`);
      idx++;
    }
    if (params.date_debut) {
      conditions.push(`wt.created_at >= $${idx}`);
      values.push(params.date_debut);
      idx++;
    }
    if (params.date_fin) {
      conditions.push(`wt.created_at <= $${idx}::date + INTERVAL '1 day'`);
      values.push(params.date_fin);
      idx++;
    }
    if (params.montant_min) {
      conditions.push(`wt.montant >= $${idx}`);
      values.push(Number(params.montant_min));
      idx++;
    }
    if (params.montant_max) {
      conditions.push(`wt.montant <= $${idx}`);
      values.push(Number(params.montant_max));
      idx++;
    }

    const where = conditions.join(' AND ');

    const [countResult] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total
       FROM wallet_transactions wt
       JOIN users u ON u.id = wt.user_id
       WHERE ${where}`,
      values,
    );

    const transactions = await this.dataSource.query(
      `SELECT
         wt.id, wt.user_id,
         u.first_name AS prenoms,
         u.last_name  AS nom,
         u.phone      AS telephone,
         wt.type, wt.montant, wt.description, wt.statut, wt.created_at
       FROM wallet_transactions wt
       JOIN users u ON u.id = wt.user_id
       WHERE ${where}
       ORDER BY wt.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, params.limit, offset],
    );

    return { transactions, total: countResult.total };
  }

  async creditWallet(userId: string, montant: number, description: string): Promise<void> {
    if (montant <= 0) throw new BadRequestException('Montant invalide');
    await this.dataSource.transaction(async (em) => {
      const [wallet] = await em.query(
        `SELECT id FROM wallets WHERE user_id = $1 FOR UPDATE`,
        [userId],
      );
      if (!wallet) throw new NotFoundException('Wallet introuvable');
      await em.query(
        `UPDATE wallets SET solde = solde + $1, updated_at = NOW() WHERE user_id = $2`,
        [montant, userId],
      );
      await em.query(
        `INSERT INTO wallet_transactions (user_id, type, montant, description, statut)
         VALUES ($1, 'credit', $2, $3, 'completed')`,
        [userId, montant, description],
      );
    });
  }

  async debitWallet(userId: string, montant: number, description: string): Promise<void> {
    if (montant <= 0) throw new BadRequestException('Montant invalide');
    await this.dataSource.transaction(async (em) => {
      const [wallet] = await em.query(
        `SELECT id, solde, solde_bloque FROM wallets WHERE user_id = $1 FOR UPDATE`,
        [userId],
      );
      if (!wallet) throw new NotFoundException('Wallet introuvable');
      const disponible = Number(wallet.solde) - Number(wallet.solde_bloque);
      if (disponible < montant) throw new BadRequestException(`Solde insuffisant: ${disponible} FCFA disponible`);
      await em.query(
        `UPDATE wallets SET solde = solde - $1, updated_at = NOW() WHERE user_id = $2`,
        [montant, userId],
      );
      await em.query(
        `INSERT INTO wallet_transactions (user_id, type, montant, description, statut)
         VALUES ($1, 'debit', $2, $3, 'completed')`,
        [userId, montant, description],
      );
    });
  }

  async bloquerWallet(userId: string, raison: string): Promise<void> {
    const [wallet] = await this.dataSource.query(
      `SELECT id FROM wallets WHERE user_id = $1`,
      [userId],
    );
    if (!wallet) throw new NotFoundException('Wallet introuvable');
    await this.dataSource.query(
      `INSERT INTO wallet_transactions (user_id, type, montant, description, statut)
       VALUES ($1, 'debit', 0, $2, 'completed')`,
      [userId, `BLOCAGE ADMIN: ${raison}`],
    );
  }

  async reinitialiserWallet(userId: string, confirmation: string): Promise<void> {
    if (confirmation !== 'CONFIRMER') throw new BadRequestException('Confirmation invalide');
    await this.dataSource.transaction(async (em) => {
      const [wallet] = await em.query(
        `SELECT id, solde FROM wallets WHERE user_id = $1 FOR UPDATE`,
        [userId],
      );
      if (!wallet) throw new NotFoundException('Wallet introuvable');
      const soldeActuel = Number(wallet.solde);
      if (soldeActuel > 0) {
        await em.query(
          `INSERT INTO wallet_transactions (user_id, type, montant, description, statut)
           VALUES ($1, 'debit', $2, 'REINITIALISATION ADMIN', 'completed')`,
          [userId, soldeActuel],
        );
      }
      await em.query(
        `UPDATE wallets SET solde = 0, solde_bloque = 0, updated_at = NOW() WHERE user_id = $1`,
        [userId],
      );
    });
  }

  async exportWalletsCSV(): Promise<string> {
    const rows = await this.dataSource.query(`
      SELECT
        u.first_name AS prenoms, u.last_name AS nom, u.phone AS telephone, u.role,
        w.solde, w.solde_bloque, w.created_at
      FROM wallets w
      JOIN users u ON u.id = w.user_id
      ORDER BY w.solde DESC
    `);
    const header = 'Prénom,Nom,Téléphone,Rôle,Solde,Solde Bloqué,Créé le';
    const lines = rows.map((r: BOWalletRow & { created_at: string }) =>
      `${r.prenoms},${r.nom},${r.telephone},${r.role},${r.solde},${r.solde_bloque},${new Date(r.created_at).toLocaleDateString('fr-FR')}`,
    );
    return [header, ...lines].join('\n');
  }

  async exportTransactionsCSV(): Promise<string> {
    const rows = await this.dataSource.query(`
      SELECT
        u.first_name AS prenoms, u.last_name AS nom, u.phone AS telephone,
        wt.type, wt.montant, wt.description, wt.statut, wt.created_at
      FROM wallet_transactions wt
      JOIN users u ON u.id = wt.user_id
      ORDER BY wt.created_at DESC
      LIMIT 5000
    `);
    const header = 'Prénom,Nom,Téléphone,Type,Montant,Description,Statut,Date';
    const lines = rows.map((r: BOTransactionRow) =>
      `${r.prenoms},${r.nom},${r.telephone},${r.type},${r.montant},${r.description || ''},${r.statut},${new Date(r.created_at).toLocaleDateString('fr-FR')}`,
    );
    return [header, ...lines].join('\n');
  }

  async getAuditLogs(limit: number): Promise<unknown[]> {
    return this.dataSource.query(`
      SELECT
        al.id, al.user_id, al.action, al.entite, al.entite_id,
        al.details, al.created_at,
        u.first_name, u.last_name, u.phone
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT $1
    `, [limit]);
  }

  // ── Config items (services / banques / mobile_money) ────────────────────────
  async getConfigItems(type: string): Promise<unknown[]> {
    const where = type ? `WHERE type = $1` : '';
    const params = type ? [type] : [];
    return this.dataSource.query(
      `SELECT * FROM keiwa_config_items ${where} ORDER BY type, ordre ASC`,
      params,
    );
  }

  async getConfigParametres(): Promise<Record<string, string>> { return {}; }
  async getBanquesAttente(): Promise<unknown[]> { return []; }

  async createConfigItem(body: {
    type: string;
    item_id: string;
    name: string;
    logo_text?: string;
    logo_url?: string;
    color?: string;
    description?: string;
    categorie?: string;
    actif?: boolean;
    est_favori?: boolean;
    ordre?: number;
    frais_transaction?: number;
  }): Promise<unknown> {
    const [row] = await this.dataSource.query(
      `
    INSERT INTO keiwa_config_items
      (type, item_id, name, logo_text, logo_url, color, description, categorie, actif, est_favori, ordre, frais_transaction)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    ON CONFLICT (type, item_id) DO UPDATE SET
      name = EXCLUDED.name, logo_text = EXCLUDED.logo_text,
      logo_url = EXCLUDED.logo_url, color = EXCLUDED.color,
      description = EXCLUDED.description, categorie = EXCLUDED.categorie,
      actif = EXCLUDED.actif, est_favori = EXCLUDED.est_favori,
      ordre = EXCLUDED.ordre, frais_transaction = EXCLUDED.frais_transaction,
      updated_at = NOW()
    RETURNING *
  `,
      [
        body.type,
        body.item_id,
        body.name,
        body.logo_text ?? null,
        body.logo_url ?? null,
        body.color ?? '#C66A2C',
        body.description ?? null,
        body.categorie ?? null,
        body.actif ?? true,
        body.est_favori ?? false,
        body.ordre ?? 99,
        body.frais_transaction ?? 0,
      ],
    );
    return row;
  }

  async updateConfigItem(
    id: string,
    body: {
      name?: string;
      logo_text?: string;
      logo_url?: string;
      color?: string;
      description?: string;
      categorie?: string;
      actif?: boolean;
      est_favori?: boolean;
      ordre?: number;
      frais_transaction?: number;
    },
  ): Promise<unknown> {
    const [row] = await this.dataSource.query(
      `
    UPDATE keiwa_config_items SET
      name = COALESCE($2, name),
      logo_text = COALESCE($3, logo_text),
      logo_url = COALESCE($4, logo_url),
      color = COALESCE($5, color),
      description = COALESCE($6, description),
      categorie = COALESCE($7, categorie),
      actif = COALESCE($8, actif),
      est_favori = COALESCE($9, est_favori),
      ordre = COALESCE($10, ordre),
      frais_transaction = COALESCE($11, frais_transaction),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `,
      [
        id,
        body.name ?? null,
        body.logo_text ?? null,
        body.logo_url ?? null,
        body.color ?? null,
        body.description ?? null,
        body.categorie ?? null,
        body.actif ?? null,
        body.est_favori ?? null,
        body.ordre ?? null,
        body.frais_transaction ?? null,
      ],
    );
    if (!row) throw new NotFoundException(`Item ${id} introuvable`);
    return row;
  }

  async deleteConfigItem(id: string): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM keiwa_config_items WHERE id = $1`,
      [id],
    );
  }

  async uploadLogo(file: Express.Multer.File): Promise<{ url: string }> {
    const ext = file.originalname.split('.').pop();
    const filename = `logo_${Date.now()}.${ext}`;
    const fs = await import('fs/promises');
    const path = await import('path');
    const dest = path.join('/var/www/julaba/uploads/logos', filename);
    await fs.writeFile(dest, file.buffer);
    return { url: `https://julaba.online/uploads/logos/${filename}` };
  }
}
