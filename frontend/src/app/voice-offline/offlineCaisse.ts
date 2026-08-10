// ──────────────────────────────────────────────────────────────────────────
// File d'attente HORS-LIGNE des opérations de caisse (couche 2).
//
// Principe SÛR pour de l'argent : une seule source de vérité = le serveur.
// Hors-ligne, on ne tient pas de compte parallèle ; on met la vente/dépense dans
// une file DURABLE (IndexedDB, survit à la fermeture), et on la REJOUE à la
// reconnexion. Chaque opération porte une clé d'idempotence (id unique) : rejouée
// deux fois, elle ne doit compter qu'une fois.
//
// ⚠️ Sécurité anti double-comptage : le backend DOIT dédupliquer sur
// `idempotency_key`. Côté frontend, on garantit une clé stable par opération ;
// le petit ajout backend (ignorer une clé déjà vue) est décrit dans la note
// d'intégration.
// ──────────────────────────────────────────────────────────────────────────

const DB_NAME = 'julaba_offline';
const STORE = 'caisse_outbox';
const DB_VERSION = 1;

export type CaisseEndpoint = '/caisse/vente' | '/caisse/depense';

export interface OperationCaisse {
  id: string;                 // clé d'idempotence (uuid)
  endpoint: CaisseEndpoint;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  ts: number;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'op-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Ajoute une opération à la file durable. Renvoie la clé d'idempotence.
 *  Si le payload porte déjà une `idempotency_key` (cas d'un envoi EN LIGNE qui a
 *  échoué : la même clé a peut-être déjà atteint le serveur), on la RÉUTILISE
 *  comme id d'opération. Ainsi le rejeu envoie EXACTEMENT la même clé, et le
 *  backend déduplique — pas de double-comptage si la vente était déjà passée. */
export async function enfilerOperation(endpoint: CaisseEndpoint, payload: unknown): Promise<string> {
  const cle = (payload as { idempotency_key?: string } | null)?.idempotency_key;
  const op: OperationCaisse = { id: cle || uuid(), endpoint, payload, ts: Date.now() };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(op);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return op.id;
}

/** Liste les opérations en attente (les plus anciennes d'abord). */
export async function operationsEnAttente(): Promise<OperationCaisse[]> {
  const db = await openDb();
  const ops = await new Promise<OperationCaisse[]>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as OperationCaisse[]).sort((a, b) => a.ts - b.ts));
    req.onerror = () => reject(req.error);
  });
  db.close();
  return ops;
}

export async function nbEnAttente(): Promise<number> {
  return (await operationsEnAttente()).length;
}

async function retirer(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/**
 * Rejoue les opérations en attente. `poster` effectue l'appel réseau réel
 * (endpoint, payload-avec-idempotency_key). On s'arrête à la première erreur
 * réseau (on retentera à la prochaine reconnexion) pour préserver l'ordre.
 * @returns nombre synchronisé + reste en attente
 */
export async function synchroniser(
  poster: (endpoint: CaisseEndpoint, payload: unknown) => Promise<void>,
): Promise<{ ok: number; reste: number }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: 0, reste: await nbEnAttente() };
  }
  const ops = await operationsEnAttente();
  let ok = 0;
  for (const op of ops) {
    try {
      await poster(op.endpoint, { ...op.payload, idempotency_key: op.id });
      await retirer(op.id);
      ok++;
    } catch {
      break; // réseau instable : on garde le reste pour plus tard
    }
  }
  return { ok, reste: await nbEnAttente() };
}
