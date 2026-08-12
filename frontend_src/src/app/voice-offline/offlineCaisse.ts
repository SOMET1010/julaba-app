// ──────────────────────────────────────────────────────────────────────────
// File d'attente HORS-LIGNE des opérations de caisse (couche 2).
//
// Principe SÛR pour de l'argent : une seule source de vérité = le serveur.
// Hors-ligne, on met la vente/dépense dans une file DURABLE (IndexedDB) et on la
// REJOUE à la reconnexion. Chaque opération porte une clé d'idempotence (id
// unique) : rejouée deux fois, elle ne compte qu'une fois (dédup backend).
//
// REJEU (lot « file hors-ligne 4xx ») — on classe l'échec par son STATUT :
//   • 4xx (rejet métier PERMANENT) → lettre morte + on CONTINUE (ne bloque plus
//     la file) ; l'échec est surfacé à l'UI ;
//   • transitoire (hors-ligne, réseau, 5xx, sans statut) → on incrémente
//     `attempts` (UNIQUEMENT ici) et on ARRÊTE le tour (ordre préservé, on
//     retentera) ; au-delà de CAP essais → lettre morte (pas de rétention
//     infinie) ;
//   • succès (2xx) → retiré.
// Invariant d'atomicité : passer une op en lettre morte = UNE seule transaction
// IndexedDB (put dead + delete active) → un crash ne peut ni la perdre ni la
// rejouer indéfiniment.
// ──────────────────────────────────────────────────────────────────────────

const DB_NAME = 'julaba_offline';
const STORE = 'caisse_outbox';
const DEAD_STORE = 'caisse_dead';
const DB_VERSION = 2; // v1→v2 : ajout additif du store des lettres mortes.

/** Nombre d'essais transitoires avant de parquer une op en lettre morte. */
export const REPLAY_CAP = 5;

export type CaisseEndpoint = '/caisse/vente' | '/caisse/depense';

export interface OperationCaisse {
  id: string;                 // clé d'idempotence (uuid)
  endpoint: CaisseEndpoint;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  ts: number;
  attempts?: number;          // essais TRANSITOIRES uniquement
}

export interface LettreMorte extends OperationCaisse {
  echec: { status: number | null; message: string; failedAt: number };
}

/** Classe une erreur de rejeu. PERMANENT = statut HTTP 4xx (rejet métier). */
export function estPermanent(error: unknown): boolean {
  const s = (error as { status?: unknown } | null)?.status;
  return typeof s === 'number' && s >= 400 && s < 500;
}

function statutDe(error: unknown): number | null {
  const s = (error as { status?: unknown } | null)?.status;
  return typeof s === 'number' ? s : null;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'op-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

// ── Abstraction de stockage (injectable pour des tests purs et déterministes) ─
export interface OutboxStore {
  enqueue(op: OperationCaisse): Promise<void>;
  list(): Promise<OperationCaisse[]>;              // actives, plus anciennes d'abord
  remove(id: string): Promise<void>;
  activeCount(): Promise<number>;
  incrementAttempts(id: string): Promise<number>;  // renvoie le nouveau compteur
  moveToDead(id: string, echec: LettreMorte['echec']): Promise<void>; // ATOMIQUE
  deadCount(): Promise<number>;
  deadList(): Promise<LettreMorte[]>;
  deadRemove(id: string): Promise<void>;
}

// ── Implémentation IndexedDB (production) ────────────────────────────────────
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // Migration additive : ne détruit jamais les données existantes.
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(DEAD_STORE)) db.createObjectStore(DEAD_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
function reqDone<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export function idbOutboxStore(): OutboxStore {
  return {
    async enqueue(op) {
      const db = await openDb();
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(op);
      await txDone(tx); db.close();
    },
    async list() {
      const db = await openDb();
      const all = await reqDone(db.transaction(STORE, 'readonly').objectStore(STORE).getAll());
      db.close();
      return (all as OperationCaisse[]).sort((a, b) => a.ts - b.ts);
    },
    async remove(id) {
      const db = await openDb();
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      await txDone(tx); db.close();
    },
    async activeCount() {
      const db = await openDb();
      const n = await reqDone(db.transaction(STORE, 'readonly').objectStore(STORE).count());
      db.close(); return n as number;
    },
    async incrementAttempts(id) {
      const db = await openDb();
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const op = (await reqDone(store.get(id))) as OperationCaisse | undefined;
      let n = 0;
      if (op) { n = (op.attempts ?? 0) + 1; op.attempts = n; store.put(op); }
      await txDone(tx); db.close();
      return n;
    },
    // ATOMIQUE : lecture active + écriture dead + suppression active dans UNE tx.
    async moveToDead(id, echec) {
      const db = await openDb();
      const tx = db.transaction([STORE, DEAD_STORE], 'readwrite');
      const active = tx.objectStore(STORE);
      const op = (await reqDone(active.get(id))) as OperationCaisse | undefined;
      if (op) {
        tx.objectStore(DEAD_STORE).put({ ...op, echec } as LettreMorte);
        active.delete(id);
      }
      await txDone(tx); db.close();
    },
    async deadCount() {
      const db = await openDb();
      const n = await reqDone(db.transaction(DEAD_STORE, 'readonly').objectStore(DEAD_STORE).count());
      db.close(); return n as number;
    },
    async deadList() {
      const db = await openDb();
      const all = await reqDone(db.transaction(DEAD_STORE, 'readonly').objectStore(DEAD_STORE).getAll());
      db.close();
      return (all as LettreMorte[]).sort((a, b) => a.ts - b.ts);
    },
    async deadRemove(id) {
      const db = await openDb();
      const tx = db.transaction(DEAD_STORE, 'readwrite');
      tx.objectStore(DEAD_STORE).delete(id);
      await txDone(tx); db.close();
    },
  };
}

// ── Implémentation mémoire (tests purs, sans IndexedDB, atomicité JS naturelle) ─
export function memoryOutboxStore(): OutboxStore {
  const active = new Map<string, OperationCaisse>();
  const dead = new Map<string, LettreMorte>();
  return {
    async enqueue(op) { active.set(op.id, { ...op }); },
    async list() { return [...active.values()].sort((a, b) => a.ts - b.ts); },
    async remove(id) { active.delete(id); },
    async activeCount() { return active.size; },
    async incrementAttempts(id) {
      const op = active.get(id); if (!op) return 0;
      op.attempts = (op.attempts ?? 0) + 1; return op.attempts;
    },
    async moveToDead(id, echec) {
      const op = active.get(id); if (!op) return;
      dead.set(id, { ...op, echec }); active.delete(id); // les deux d'un coup (mono-thread)
    },
    async deadCount() { return dead.size; },
    async deadList() { return [...dead.values()].sort((a, b) => a.ts - b.ts); },
    async deadRemove(id) { dead.delete(id); },
  };
}

// ── Store par défaut (production) ────────────────────────────────────────────
let _defaultStore: OutboxStore | null = null;
function defaultStore(): OutboxStore {
  if (!_defaultStore) _defaultStore = idbOutboxStore();
  return _defaultStore;
}

/** Ajoute une opération à la file durable. Réutilise `idempotency_key` comme id
 *  si présente (envoi en ligne échoué), pour que le rejeu envoie la MÊME clé. */
export async function enfilerOperation(
  endpoint: CaisseEndpoint,
  payload: unknown,
  store: OutboxStore = defaultStore(),
): Promise<string> {
  const cle = (payload as { idempotency_key?: string } | null)?.idempotency_key;
  const op: OperationCaisse = { id: cle || uuid(), endpoint, payload, ts: Date.now() };
  await store.enqueue(op);
  return op.id;
}

export async function operationsEnAttente(store: OutboxStore = defaultStore()): Promise<OperationCaisse[]> {
  return store.list();
}
export async function nbEnAttente(store: OutboxStore = defaultStore()): Promise<number> {
  return store.activeCount();
}
export async function nbEchecs(store: OutboxStore = defaultStore()): Promise<number> {
  return store.deadCount();
}
export async function lettresMortes(store: OutboxStore = defaultStore()): Promise<LettreMorte[]> {
  return store.deadList();
}
export async function purgerLettreMorte(id: string, store: OutboxStore = defaultStore()): Promise<void> {
  return store.deadRemove(id);
}

/**
 * Rejoue les opérations en attente selon la politique 4xx/5xx.
 * @returns { ok, reste (actives), echecs (lettres mortes) }
 */
export async function synchroniser(
  poster: (endpoint: CaisseEndpoint, payload: unknown) => Promise<void>,
  store: OutboxStore = defaultStore(),
): Promise<{ ok: number; reste: number; echecs: number }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: 0, reste: await store.activeCount(), echecs: await store.deadCount() };
  }
  const ops = await store.list();
  let ok = 0;
  for (const op of ops) {
    try {
      await poster(op.endpoint, { ...op.payload, idempotency_key: op.id });
      await store.remove(op.id);
      ok++;
    } catch (e) {
      if (estPermanent(e)) {
        // Rejet métier définitif : lettre morte (atomique) + on CONTINUE.
        await store.moveToDead(op.id, { status: statutDe(e), message: String((e as Error)?.message ?? ''), failedAt: Date.now() });
        continue;
      }
      // Transitoire UNIQUEMENT : on incrémente les essais.
      const n = await store.incrementAttempts(op.id);
      if (n >= REPLAY_CAP) {
        await store.moveToDead(op.id, { status: statutDe(e), message: String((e as Error)?.message ?? ''), failedAt: Date.now() });
        continue;
      }
      break; // réseau/serveur instable : on préserve l'ordre et on retentera
    }
  }
  return { ok, reste: await store.activeCount(), echecs: await store.deadCount() };
}
