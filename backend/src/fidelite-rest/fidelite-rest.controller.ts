import { Controller, Get, Put, Post, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import {
  calculerPointsGagnes,
  estEligibleRecompense,
  normaliserBareme,
  normaliserTel,
  type BaremeFidelite,
} from './fidelite-calcul';

// ── Programme de fidélité paramétrable (écart CDC 8.1.2) ─────────────────────
// Chaque marchand définit son barème (points par 100 FCFA, seuil de récompense,
// valeur de la remise) et suit les points de ses clients par numéro de téléphone.
// Tout est scopé au marchand connecté.
//
// Chaque gain de points et chaque récompense accordée est tracé dans le journal
// APPEND-ONLY `fidelite_evenements` (Constitution §5) : `fidelite_clients.points`
// n'est jamais la seule source — c'est une projection dérivable du journal.
// Idempotence : une `idempotency_key` par action protège contre un double
// crédit/débit en cas de rejeu réseau (même mécanisme que la caisse).

const DEFAUT: BaremeFidelite & { actif: boolean } = {
  actif: false, points_par_cent: 1, seuil_points: 100, recompense_fcfa: 1000,
};

function estViolationUnicite(e: any): boolean {
  return e?.code === '23505' || /duplicate key|unique/i.test(e?.message || '');
}

@UseGuards(JwtAuthGuard)
@Controller('fidelite')
export class FideliteRestController {
  constructor(private dataSource: DataSource) {}

  private async lireConfig(marchandId: string, m: DataSource | EntityManager = this.dataSource) {
    const rows = await m.query(
      `SELECT actif, points_par_cent, seuil_points, recompense_fcfa FROM fidelite_config WHERE marchand_id = $1::uuid LIMIT 1`,
      [marchandId],
    );
    const c = rows?.[0];
    return {
      actif: c ? !!c.actif : DEFAUT.actif,
      points_par_cent: Number(c?.points_par_cent ?? DEFAUT.points_par_cent),
      seuil_points: Number(c?.seuil_points ?? DEFAUT.seuil_points),
      recompense_fcfa: Number(c?.recompense_fcfa ?? DEFAUT.recompense_fcfa),
    };
  }

  @Get('config')
  async getConfig(@CurrentUser() user: User) {
    return { config: await this.lireConfig(user.id) };
  }

  @Put('config')
  async setConfig(@Body() body: any, @CurrentUser() user: User) {
    const actif = !!body?.actif;
    const { points_par_cent: ppc, seuil_points: seuil, recompense_fcfa: recompense } = normaliserBareme(body);
    await this.dataSource.query(
      `INSERT INTO fidelite_config (marchand_id, actif, points_par_cent, seuil_points, recompense_fcfa, updated_at)
       VALUES ($1::uuid, $2, $3, $4, $5, now())
       ON CONFLICT (marchand_id) DO UPDATE SET
         actif = EXCLUDED.actif, points_par_cent = EXCLUDED.points_par_cent,
         seuil_points = EXCLUDED.seuil_points, recompense_fcfa = EXCLUDED.recompense_fcfa, updated_at = now()`,
      [user.id, actif, ppc, seuil, recompense],
    );
    return { config: await this.lireConfig(user.id) };
  }

  /** Fiche fidélité d'un client (par téléphone) + barème courant. */
  @Get('client')
  async getClient(@Query('tel') tel: string, @CurrentUser() user: User) {
    const telephone = normaliserTel(tel);
    if (!telephone) throw new BadRequestException('Numéro requis');
    const rows = await this.dataSource.query(
      `SELECT id, telephone, nom, points, total_achats FROM fidelite_clients
       WHERE marchand_id = $1::uuid AND telephone = $2 LIMIT 1`,
      [user.id, telephone],
    );
    const config = await this.lireConfig(user.id);
    return { client: rows?.[0] || null, config };
  }

  /** Liste des clients fidélité (classés par points). */
  @Get('clients')
  async listClients(@CurrentUser() user: User) {
    const rows = await this.dataSource.query(
      `SELECT id, telephone, nom, points, total_achats FROM fidelite_clients
       WHERE marchand_id = $1::uuid ORDER BY points DESC, total_achats DESC LIMIT 100`,
      [user.id],
    );
    return { clients: rows, config: await this.lireConfig(user.id) };
  }

  /**
   * Historique des événements de fidélité (gains + récompenses), le plus
   * récent d'abord — la preuve consultable du journal append-only. Filtrable
   * par téléphone (fiche d'un client) ou global au marchand (défaut).
   */
  @Get('evenements')
  async listEvenements(@Query('tel') tel: string | undefined, @CurrentUser() user: User) {
    const telephone = tel ? normaliserTel(tel) : null;
    const rows = telephone
      ? await this.dataSource.query(
          `SELECT id, telephone, type, points_delta, points_apres, montant_achat, remise_fcfa, created_at
             FROM fidelite_evenements WHERE marchand_id = $1::uuid AND telephone = $2
            ORDER BY created_at DESC LIMIT 50`,
          [user.id, telephone],
        )
      : await this.dataSource.query(
          `SELECT id, telephone, type, points_delta, points_apres, montant_achat, remise_fcfa, created_at
             FROM fidelite_evenements WHERE marchand_id = $1::uuid
            ORDER BY created_at DESC LIMIT 50`,
          [user.id],
        );
    return { evenements: rows };
  }

  /** Enregistre un achat → crédite les points selon le barème (tracé, idempotent). */
  @Post('gagner')
  async gagner(@Body() body: any, @CurrentUser() user: User) {
    const telephone = normaliserTel(body?.telephone);
    const montant = Math.max(0, Number(body?.montant) || 0);
    const idemKey = body?.idempotency_key ? String(body.idempotency_key).slice(0, 120) : null;
    if (!telephone) throw new BadRequestException('Numéro requis');
    if (!(montant > 0)) throw new BadRequestException('Montant invalide');

    try {
      return await this.dataSource.transaction(async (m) => {
        // Rejeu (même clé) : renvoyer l'événement déjà enregistré, ne jamais
        // recréditer une deuxième fois.
        if (idemKey) {
          const deja = await m.query(
            `SELECT id FROM fidelite_evenements WHERE marchand_id = $1::uuid AND idempotency_key = $2 LIMIT 1`,
            [user.id, idemKey],
          );
          if (deja?.[0]) return this.resultatGagnerDepuisEvenement(deja[0].id, user.id, m);
        }

        const config = await this.lireConfig(user.id, m);
        const pointsGagnes = calculerPointsGagnes(montant, config.points_par_cent);

        const rows = await m.query(
          `INSERT INTO fidelite_clients (marchand_id, telephone, nom, points, total_achats, updated_at)
           VALUES ($1::uuid, $2, $3, $4, $5, now())
           ON CONFLICT (marchand_id, telephone) DO UPDATE SET
             nom = COALESCE(NULLIF($3, ''), fidelite_clients.nom),
             points = fidelite_clients.points + $4,
             total_achats = fidelite_clients.total_achats + $5,
             updated_at = now()
           RETURNING id, telephone, nom, points, total_achats`,
          [user.id, telephone, String(body?.nom || '').slice(0, 160), pointsGagnes, montant],
        );
        const client = rows[0];

        await m.query(
          `INSERT INTO fidelite_evenements
             (marchand_id, client_id, telephone, type, points_delta, points_apres, montant_achat, idempotency_key)
           VALUES ($1::uuid, $2::uuid, $3, 'gain', $4, $5, $6, $7)`,
          [user.id, client.id, telephone, pointsGagnes, client.points, montant, idemKey],
        );

        return {
          success: true,
          pointsGagnes,
          client,
          recompenseDisponible: estEligibleRecompense(Number(client.points), config),
          config,
        };
      });
    } catch (e: any) {
      // Course : deux requêtes concurrentes avec la même clé -> la 2e viole
      // l'unicité ; on renvoie l'événement déjà enregistré au lieu de propager.
      if (idemKey && estViolationUnicite(e)) {
        return this.resultatGagnerDepuisEvenement(null, user.id, this.dataSource, idemKey);
      }
      throw e;
    }
  }

  private async resultatGagnerDepuisEvenement(
    evenementId: string | null,
    marchandId: string,
    m: DataSource | EntityManager,
    idemKey?: string,
  ) {
    const evenement = await this.chargerEvenement(evenementId, marchandId, m, idemKey);
    const client = await this.chargerClient(evenement.client_id, m);
    const config = await this.lireConfig(marchandId, m);
    return {
      success: true,
      pointsGagnes: Number(evenement.points_delta),
      client,
      recompenseDisponible: estEligibleRecompense(Number(client.points), config),
      config,
    };
  }

  /** Utilise la récompense : déduit le seuil de points, renvoie la remise à appliquer (tracé, idempotent). */
  @Post('utiliser')
  async utiliser(@Body() body: any, @CurrentUser() user: User) {
    const telephone = normaliserTel(body?.telephone);
    const idemKey = body?.idempotency_key ? String(body.idempotency_key).slice(0, 120) : null;
    if (!telephone) throw new BadRequestException('Numéro requis');

    try {
      return await this.dataSource.transaction(async (m) => {
        if (idemKey) {
          const deja = await m.query(
            `SELECT id FROM fidelite_evenements WHERE marchand_id = $1::uuid AND idempotency_key = $2 LIMIT 1`,
            [user.id, idemKey],
          );
          if (deja?.[0]) return this.resultatUtiliserDepuisEvenement(deja[0].id, user.id, m);
        }

        const config = await this.lireConfig(user.id, m);
        const rows = await m.query(
          `SELECT id, points FROM fidelite_clients WHERE marchand_id = $1::uuid AND telephone = $2 LIMIT 1`,
          [user.id, telephone],
        );
        const client = rows?.[0];
        if (!client) throw new BadRequestException('Client introuvable');
        if (Number(client.points) < config.seuil_points) {
          throw new BadRequestException('Points insuffisants pour la récompense');
        }
        // Piège TypeORM : pour un UPDATE (contrairement à un INSERT), le driver
        // Postgres renvoie un TUPLE [lignes, nombreAffecté] — PAS directement le
        // tableau de lignes. `updated[0]` est donc le tableau des lignes, et
        // `updated[0][0]` la ligne elle-même. (Vérifié empiriquement : un INSERT
        // ... ON CONFLICT DO UPDATE ... RETURNING, lui, renvoie bien le tableau de
        // lignes tel quel — c'est UNIQUEMENT le UPDATE/DELETE nu qui est concerné.)
        const [updatedRows] = await m.query(
          `UPDATE fidelite_clients SET points = points - $1, updated_at = now()
           WHERE id = $2::uuid RETURNING id, telephone, nom, points, total_achats`,
          [config.seuil_points, client.id],
        );
        const clientMaj = updatedRows[0];

        await m.query(
          `INSERT INTO fidelite_evenements
             (marchand_id, client_id, telephone, type, points_delta, points_apres, remise_fcfa, idempotency_key)
           VALUES ($1::uuid, $2::uuid, $3, 'recompense', $4, $5, $6, $7)`,
          [user.id, clientMaj.id, telephone, -config.seuil_points, clientMaj.points, config.recompense_fcfa, idemKey],
        );

        return { success: true, remise: config.recompense_fcfa, client: clientMaj, config };
      });
    } catch (e: any) {
      if (idemKey && estViolationUnicite(e)) {
        return this.resultatUtiliserDepuisEvenement(null, user.id, this.dataSource, idemKey);
      }
      throw e;
    }
  }

  private async resultatUtiliserDepuisEvenement(
    evenementId: string | null,
    marchandId: string,
    m: DataSource | EntityManager,
    idemKey?: string,
  ) {
    const evenement = await this.chargerEvenement(evenementId, marchandId, m, idemKey);
    const client = await this.chargerClient(evenement.client_id, m);
    const config = await this.lireConfig(marchandId, m);
    return { success: true, remise: Number(evenement.remise_fcfa), client, config };
  }

  private async chargerEvenement(
    evenementId: string | null,
    marchandId: string,
    m: DataSource | EntityManager,
    idemKey?: string,
  ) {
    const rows = evenementId
      ? await m.query(`SELECT * FROM fidelite_evenements WHERE id = $1::uuid`, [evenementId])
      : await m.query(
          `SELECT * FROM fidelite_evenements WHERE marchand_id = $1::uuid AND idempotency_key = $2 LIMIT 1`,
          [marchandId, idemKey],
        );
    return rows[0];
  }

  private async chargerClient(clientId: string, m: DataSource | EntityManager) {
    const rows = await m.query(
      `SELECT id, telephone, nom, points, total_achats FROM fidelite_clients WHERE id = $1::uuid`,
      [clientId],
    );
    return rows[0];
  }
}
