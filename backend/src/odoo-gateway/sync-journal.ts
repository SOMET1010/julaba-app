/**
 * Journal de synchronisation Gateway ↔ Odoo — état pending/syncing/confirmed/
 * rejected par `operationId`.
 *
 * LA LIMITE QUI ÉTAIT ASSUMÉE ICI EST FERMÉE — ODOO-L1, 05/10/2026.
 *
 * Ce fichier portait l'avertissement suivant, et il disait vrai : « ce journal
 * vit EN MÉMOIRE (une simple Map) […] un redémarrage du serveur vide ce
 * journal, et rejouer un `operationId` après un redémarrage recréerait un
 * nouveau mouvement, exactement le risque qu'un vrai Gateway doit éliminer ».
 * Il nommait aussi son propre correctif : persister, avec une CONTRAINTE
 * UNIQUE sur `operationId`, comme `ux_caisse_tx_idempotency_key` le fait pour
 * `/caisse/vente` depuis la production.
 *
 * C'est ce que fait ce lot. Le journal n'est plus UNE classe mais UN CONTRAT,
 * `JournalSync`, avec deux implémentations :
 *   · `SyncJournalMemoire` — celle d'avant, inchangée dans son comportement.
 *     Elle reste la valeur par défaut, et c'est elle que les bancs utilisent :
 *     aucun test n'a besoin d'une base pour prouver la logique de rejeu.
 *   · `SyncJournalPostgres` (sync-journal-postgres.ts) — la vraie, branchée en
 *     production, où c'est la BASE qui arbitre, pas le processus.
 *
 * POURQUOI LES MÉTHODES DEVIENNENT ASYNCHRONES. Une écriture en base l'est.
 * Garder une façade synchrone aurait voulu dire un cache mémoire devant la
 * table — c'est-à-dire remettre au milieu exactement l'objet dont on vient de
 * démontrer qu'il ne survit pas à un redémarrage, et qui ne voit pas ce qu'un
 * AUTRE processus a écrit. On préfère une signature qui dit la vérité.
 *
 * CE QUI GARANTIT L'IDEMPOTENCE N'EST PAS LA LECTURE, C'EST LA CONTRAINTE.
 * Deux rejeux simultanés peuvent lire « rien » en même temps ; un seul peut
 * insérer. C'est la leçon déjà payée côté caisse, où l'index unique partiel
 * fait le travail que la lecture préalable ne peut pas faire.
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

/**
 * CE QUE TOUT JOURNAL DOIT SAVOIR FAIRE — et rien de plus.
 *
 * Trois opérations. Aucune n'est « verrouille » ni « transaction » : le
 * Gateway n'a pas besoin de savoir COMMENT l'unicité est tenue, seulement
 * qu'elle l'est. L'implémentation Postgres s'en charge avec la contrainte de
 * clé primaire ; celle en mémoire, avec le fait qu'un processus Node ne
 * s'interrompt pas au milieu d'un `Map.set`.
 */
export interface JournalSync {
  get(operationId: string): Promise<SyncJournalEntry | undefined>;
  upsert(entry: SyncJournalEntry): Promise<SyncJournalEntry>;
  list(): Promise<SyncJournalEntry[]>;
}

/**
 * Le journal EN MÉMOIRE — celui d'avant ce lot, au comportement identique.
 *
 * IL N'EST PAS DÉPRÉCIÉ, ET CE N'EST PAS UN REPLI PAR DÉFAUT HONTEUX : c'est
 * l'implémentation que les bancs utilisent, et elle leur suffit pour prouver
 * TOUTE la logique de rejeu — rejeu confirmé, conflit de payload, appels
 * concurrents. Une base n'y ajouterait rien, et la rendrait indisponible hors
 * d'un environnement qui en a une.
 *
 * Ce qu'elle ne prouve pas, et qu'elle ne prétend plus prouver : la survie à
 * un redémarrage. C'est le rôle de `SyncJournalPostgres`.
 */
export class SyncJournalMemoire implements JournalSync {
  private readonly entries = new Map<string, SyncJournalEntry>();

  async get(operationId: string): Promise<SyncJournalEntry | undefined> {
    return this.entries.get(operationId);
  }

  async upsert(entry: SyncJournalEntry): Promise<SyncJournalEntry> {
    this.entries.set(entry.operationId, entry);
    return entry;
  }

  async list(): Promise<SyncJournalEntry[]> {
    return [...this.entries.values()].sort((a, b) => a.creeLe - b.creeLe);
  }
}

/** Ancien nom, conservé : il est lisible et rien ne gagne à le renommer. */
export { SyncJournalMemoire as SyncJournal };

/** Token d'injection NestJS — une interface TypeScript n'existe pas à
 *  l'exécution, même raison que `ODOO_CLIENT`. */
export const JOURNAL_SYNC = Symbol('JOURNAL_SYNC');
