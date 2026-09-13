/**
 * Journal de synchronisation Gateway ↔ Odoo — état pending/syncing/confirmed/
 * rejected par `operationId`.
 *
 * LIMITE ASSUMÉE (POC structurel) : ce journal vit EN MÉMOIRE (une simple
 * Map), pas dans une base persistée. L'idempotence qu'il garantit n'est donc
 * démontrée que PENDANT LA VIE DU PROCESSUS — un redémarrage du serveur vide
 * ce journal, et rejouer un `operationId` après un redémarrage recréerait un
 * nouveau mouvement, exactement le risque qu'un vrai Gateway doit éliminer.
 *
 * Le Gateway réel devra persister ce journal côté serveur, avec une
 * CONTRAINTE UNIQUE sur `operationId` (même logique que
 * `ux_caisse_tx_idempotency_key` pour `/caisse/vente`, déjà en production —
 * voir backend/src/database/db-init.service.ts) — pas une Map en mémoire.
 * Ce fichier n'est donc volontairement PAS le composant à copier tel quel
 * vers la version réelle : il documente le contrat (les champs, les
 * transitions d'état), la persistance viendra dans un lot séparé.
 */
export type EtatSync = 'pending' | 'syncing' | 'confirmed' | 'rejected';

export interface SyncJournalEntry {
  operationId: string;
  domaine: string;
  odooModel: string;
  odooRecordId?: number;
  etat: EtatSync;
  /** Représentation stable du payload métier, pour détecter un `operationId`
   *  réutilisé avec un contenu différent (conflit). */
  payloadSnapshot: string;
  tentatives: number;
  derniereErreur?: string;
  creeLe: number;
  confirmeLe?: number;
}

export class SyncJournal {
  private readonly entries = new Map<string, SyncJournalEntry>();

  get(operationId: string): SyncJournalEntry | undefined {
    return this.entries.get(operationId);
  }

  upsert(entry: SyncJournalEntry): SyncJournalEntry {
    this.entries.set(entry.operationId, entry);
    return entry;
  }

  list(): SyncJournalEntry[] {
    return [...this.entries.values()].sort((a, b) => a.creeLe - b.creeLe);
  }
}
