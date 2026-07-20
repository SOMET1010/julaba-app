import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ZonesService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async findOne(id: string) {
    const rows = await this.dataSource.query(
      `SELECT id, nom, ville, region, description, gestionnaire_id, actif, created_at
       FROM zones
       WHERE id = $1::uuid
       LIMIT 1`,
      [id],
    );
    if (!rows.length) throw new NotFoundException(`Zone ${id} introuvable`);
    return rows[0];
  }

  async getZonesWithStats() {
    return this.dataSource.query(`
      SELECT
        z.id, z.nom, z.ville, z.region, z.description,
        z.gestionnaire_id, z.actif, z.created_at,
        COUNT(DISTINCT u.id) AS "nbActeurs",
        COUNT(DISTINCT CASE WHEN u.role = 'identificateur' THEN u.id END) AS "nbIdentificateurs",
        COALESCE(SUM(s.quantite), 0) AS "stockTotal",
        COALESCE((
          SELECT SUM(ct.montant)
          FROM caisse_transactions ct
          JOIN users u2 ON u2.id::text = ct.user_id
          WHERE u2.zone_id = z.id::text
            AND ct.type = 'vente'
        ), 0) AS "volumeTotal",
        COALESCE(
          ROUND(
            (COUNT(DISTINCT CASE
              WHEN ct.created_at >= NOW() - INTERVAL '30 days'
              THEN u.id
            END)::numeric / NULLIF(COUNT(DISTINCT u.id), 0)) * 100,
            0
          ),
          0
        ) AS "tauxActivite"
      FROM zones z
      LEFT JOIN stocks s ON s.zone_id = z.id
      LEFT JOIN users u ON u.zone_id IS NOT NULL
        AND u.zone_id != ''
        AND u.zone_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND u.zone_id::uuid = z.id
      LEFT JOIN caisse_transactions ct ON ct.user_id::uuid = u.id
      GROUP BY z.id
      ORDER BY z.ville, z.nom
    `);
  }

  async getTerritoires() {
    const rows = await this.dataSource.query(`
      SELECT
        z.id AS zone_id, z.nom AS commune, z.ville, z.region,
        z.actif AS zone_actif,
        m.id AS marche_id, m.nom AS marche_nom, m.actif AS marche_actif
      FROM zones z
      LEFT JOIN marches m ON m.zone_id = z.id
      ORDER BY z.ville, z.nom, m.nom
    `);
    const villesMap: Record<string, any> = {};
    for (const row of rows) {
      const ville = row.ville || row.region || 'Autre';
      if (!villesMap[ville]) villesMap[ville] = { nom: ville, communes: {} };
      const communes = villesMap[ville].communes;
      if (!communes[row.zone_id]) {
        communes[row.zone_id] = {
          id: row.zone_id, nom: row.commune,
          actif: row.zone_actif, marches: [],
        };
      }
      if (row.marche_id) {
        communes[row.zone_id].marches.push({
          id: row.marche_id, nom: row.marche_nom, actif: row.marche_actif,
        });
      }
    }
    return Object.values(villesMap).map((v: any) => ({
      nom: v.nom,
      communes: Object.values(v.communes),
    }));
  }

  async createZoneAvecMarches(data: {
    nom: string;
    ville: string;
    region: string;
    gestionnaire?: string;
    marches?: string[];
  }) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const zoneResult = await queryRunner.query(`
        INSERT INTO zones (nom, ville, region, gestionnaire_id, actif)
        VALUES ($1, $2, $3, $4, true)
        RETURNING id, nom, ville, region, actif
      `, [data.nom, data.ville, data.region, data.gestionnaire || null]);

      const zone = zoneResult[0];

      if (data.marches && data.marches.length > 0) {
        const marchesValides = data.marches.filter(m => m.trim());
        if (marchesValides.length > 0) {
          const placeholders = marchesValides
            .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2}, true)`)
            .join(', ');
          const values = marchesValides.flatMap(m => [m.trim(), zone.id]);
          await queryRunner.query(
            `INSERT INTO marches (nom, zone_id, actif) VALUES ${placeholders}`,
            values
          );
        }
      }

      await queryRunner.commitTransaction();
      return zone;
    } catch (err: unknown) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getVilles() {
    return this.dataSource.query(`
      SELECT DISTINCT ville, region
      FROM zones
      WHERE ville IS NOT NULL
      ORDER BY region, ville
    `);
  }

  async updateZone(id: string, data: {
    nom?: string;
    ville?: string;
    region?: string;
    actif?: boolean;
    gestionnaire?: string;
  }) {
    const existing = await this.dataSource.query(
      'SELECT id FROM zones WHERE id = $1::uuid', [id]
    );
    if (!existing.length) throw new NotFoundException(`Zone ${id} introuvable`);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (data.nom !== undefined)        { fields.push(`nom = $${idx++}`);              values.push(data.nom); }
    if (data.ville !== undefined)      { fields.push(`ville = $${idx++}`);            values.push(data.ville); }
    if (data.region !== undefined)     { fields.push(`region = $${idx++}`);           values.push(data.region); }
    if (data.actif !== undefined)      { fields.push(`actif = $${idx++}`);            values.push(data.actif); }
    if (data.gestionnaire !== undefined) { fields.push(`gestionnaire_id = $${idx++}`); values.push(data.gestionnaire); }

    if (!fields.length) {
      const zone = await this.dataSource.query('SELECT id, nom, ville, region, actif FROM zones WHERE id = $1::uuid', [id]);
      return zone[0];
    }

    values.push(id);
    const result = await this.dataSource.query(
      `UPDATE zones SET ${fields.join(', ')} WHERE id = $${idx}::uuid RETURNING id, nom, ville, region, actif`,
      values
    );
    return result[0];
  }

  async deleteZone(id: string) {
    const existing = await this.dataSource.query(
      'SELECT id FROM zones WHERE id = $1::uuid', [id]
    );
    if (!existing.length) throw new NotFoundException(`Zone ${id} introuvable`);

    const acteurs = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM users WHERE zone_id = $1::uuid', [id]
    );
    const nbActeurs = Number(acteurs[0]?.count || 0);
    if (nbActeurs > 0) {
      throw new BadRequestException(
        `Impossible de supprimer cette zone : ${nbActeurs} acteur${nbActeurs > 1 ? 's' : ''} y sont encore rattachés. Désactivez-la ou réaffectez les acteurs avant suppression.`
      );
    }

    const marches = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM marches WHERE zone_id = $1::uuid', [id]
    );
    const nbMarches = Number(marches[0]?.count || 0);
    if (nbMarches > 0) {
      throw new BadRequestException(
        `Impossible de supprimer cette zone : ${nbMarches} marché${nbMarches > 1 ? 's' : ''} y sont encore rattaché${nbMarches > 1 ? 's' : ''}. Supprimez ou réaffectez les marchés avant suppression.`
      );
    }

    await this.dataSource.query('DELETE FROM zones WHERE id = $1::uuid', [id]);
    return { success: true, id, message: 'Zone supprimée' };
  }
}
