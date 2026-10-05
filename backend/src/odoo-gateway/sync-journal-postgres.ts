/**
 * LE JOURNAL DE SYNCHRONISATION, EN BASE — ODOO-L1, 05/10/2026.
 *
 * LE DÉFAUT QU'ON FERME, et il était écrit noir sur blanc dans
 * `sync-journal.ts` depuis le premier jour : le journal vivait dans une Map.
 * « Un redémarrage du serveur vide ce journal, et rejouer un `operationId`
 * après un redémarrage recréerait un nouveau mouvement. » Sur Render, un
 * redéploiement ou une mise en veille suffit. Une marchande dont la vente
 * repart après coupure aurait vu son stock décrémenté deux fois.
 *
 * CE QUI TIENT L'IDEMPOTENCE ICI EST LA CLÉ PRIMAIRE, PAS LA LECTURE.
 * `operation_id` est PRIMARY KEY. Deux rejeux simultanés peuvent lire « rien »
 * au même instant ; un seul peut insérer, l'autre reçoit `23505`. C'est très
 * exactement ce que `ux_caisse_tx_idempotency_key` fait depuis la production
 * pour `POST /caisse/vente` — et la raison pour laquelle cette route-là n'a
 * jamais produit de doublon.
 *
 * `upsert` ÉCRIT SANS JAMAIS PERDRE LA PREMIÈRE TRACE. `ON CONFLICT DO UPDATE`
 * fait avancer l'état (pending → syncing → confirmed), mais `cree_le` et
 * `tentatives` restent ceux que l'appelant a calculés : c'est lui qui tient le
 * compte des tentatives, et il le fait à partir de ce qu'il a lu. On ne
 * recalcule rien ici — ce module range et rend, il ne décide pas.
 *
 * LES DATES SONT DES ENTIERS, délibérément. Le contrat `SyncJournalEntry`
 * porte `creeLe` / `confirmeLe` en millisecondes depuis l'époque, et c'est la
 * forme que le Gateway compare et trie. Les convertir en `timestamptz` à
 * l'aller puis en nombre au retour ajouterait une conversion de fuseau à
 * chaque bord — pour une donnée qui ne se lit jamais à l'œil. `bigint` dit la
 * même chose sans rien perdre. (`created_at` existe en plus, en
 * `timestamptz`, pour l'exploitation humaine de la table.)
 *
 * CE MODULE N'EST PAS LE GARDIEN DE LA LOGIQUE DE REJEU. Rejeu confirmé,
 * conflit de payload, appels concurrents : tout cela vit dans
 * `OdooGatewayService`, et c'est volontaire. Ici, seulement une table.
 */
import { Logger } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import type { EtatSync, JournalSync, SyncJournalEntry } from './sync-journal';

/** Le nom est préfixé `odoo_` : cette table appartient à la passerelle, pas au
 *  domaine métier de la caisse. On ne la confondra pas avec
 *  `stock_operation_idempotency`, qui protège un tout autre chemin. */
export const TABLE_JOURNAL_ODOO = 'odoo_sync_journal';

interface LigneBrute {
  operation_id: string;
  domaine: string;
  odoo_model: string;
  odoo_record_id: string | number | null;
  etat: string;
  payload_snapshot: string;
  tentatives: string | number;
  derniere_erreur: string | null;
  cree_le: string | number;
  confirme_le: string | number | null;
}

/** Postgres rend `bigint` et `numeric` en CHAÎNE (le pilote ne suppose pas
 *  qu'ils tiennent dans un `number`). Les reconvertir est obligatoire : sans
 *  ça, `a.creeLe - b.creeLe` dans le tri ferait une soustraction de chaînes. */
function nombre(v: string | number | null | undefined): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function versEntree(l: LigneBrute): SyncJournalEntry {
  return {
    operationId: l.operation_id,
    domaine: l.domaine,
    odooModel: l.odoo_model,
    odooRecordId: nombre(l.odoo_record_id),
    etat: l.etat as EtatSync,
    payloadSnapshot: l.payload_snapshot,
    tentatives: nombre(l.tentatives) ?? 0,
    derniereErreur: l.derniere_erreur ?? undefined,
    creeLe: nombre(l.cree_le) ?? 0,
    confirmeLe: nombre(l.confirme_le),
  };
}

export class SyncJournalPostgres implements JournalSync {
  private readonly logger = new Logger(SyncJournalPostgres.name);

  constructor(private readonly dataSource: DataSource) {}

  async get(operationId: string): Promise<SyncJournalEntry | undefined> {
    const lignes: LigneBrute[] = await this.dataSource.query(
      `SELECT * FROM ${TABLE_JOURNAL_ODOO} WHERE operation_id = $1 LIMIT 1`,
      [operationId],
    );
    return lignes[0] ? versEntree(lignes[0]) : undefined;
  }

  async upsert(entry: SyncJournalEntry): Promise<SyncJournalEntry> {
    const lignes: LigneBrute[] = await this.dataSource.query(
      `INSERT INTO ${TABLE_JOURNAL_ODOO}
         (operation_id, domaine, odoo_model, odoo_record_id, etat,
          payload_snapshot, tentatives, derniere_erreur, cree_le, confirme_le)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (operation_id) DO UPDATE SET
         domaine          = EXCLUDED.domaine,
         odoo_model       = EXCLUDED.odoo_model,
         odoo_record_id   = EXCLUDED.odoo_record_id,
         etat             = EXCLUDED.etat,
         payload_snapshot = EXCLUDED.payload_snapshot,
         tentatives       = EXCLUDED.tentatives,
         derniere_erreur  = EXCLUDED.derniere_erreur,
         confirme_le      = EXCLUDED.confirme_le
       RETURNING *`,
      [
        entry.operationId,
        entry.domaine,
        entry.odooModel,
        entry.odooRecordId ?? null,
        entry.etat,
        entry.payloadSnapshot,
        entry.tentatives,
        entry.derniereErreur ?? null,
        entry.creeLe,
        entry.confirmeLe ?? null,
      ],
    );
    // `cree_le` est volontairement ABSENT du DO UPDATE : la première trace
    // d'une opération garde sa date de naissance, quelle que soit la tentative.
    return lignes[0] ? versEntree(lignes[0]) : entry;
  }

  async list(): Promise<SyncJournalEntry[]> {
    const lignes: LigneBrute[] = await this.dataSource.query(
      `SELECT * FROM ${TABLE_JOURNAL_ODOO} ORDER BY cree_le ASC`,
    );
    return lignes.map(versEntree);
  }
}
