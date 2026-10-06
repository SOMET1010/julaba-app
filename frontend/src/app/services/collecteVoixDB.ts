// ──────────────────────────────────────────────────────────────────────────
// Studio v1 (collecte terrain) — file locale des clips, IndexedDB.
//
// Même patron que voice-offline/offlineCaisse.ts (OutboxStore) : interface de
// stockage injectable (implémentation IndexedDB en prod, mémoire en test),
// pour rester pur et déterministe côté tests. Contrairement à la caisse, il
// n'y a PAS de rejeu réseau ici — hors périmètre de ce lot (§ docs/PACKS_VOIX_
// COLLECTE.md, « pas de sync backend, décision future »). Les clips restent
// en file locale jusqu'à export manuel ou câblage d'un vrai point de synchro.
// ──────────────────────────────────────────────────────────────────────────

export type StatutValidation = 'pending' | 'validated' | 'rejected';

export interface ClipCollecte {
  clip_id: string;
  prompt_id: string;
  task_type: 'elicit_image';
  lang: string; // ex. 'fr' (placeholder) — 'dyu'/'bci' quand le contenu existera
  /** Identifiant de locutrice anonyme, stable sur CET appareil pour la session. */
  speaker_id: string;
  consent_version: string;
  ts: number;
  duree_s: number;
  audio: Blob;
  votes_up: number;
  votes_down: number;
  statut: StatutValidation;
}

const DB_NAME = 'julaba_collecte_voix';
const STORE = 'clips';
const DB_VERSION = 1;

export interface CollecteStore {
  enqueue(clip: ClipCollecte): Promise<void>;
  list(): Promise<ClipCollecte[]>; // plus récents d'abord
  get(id: string): Promise<ClipCollecte | undefined>;
  voter(id: string, positif: boolean): Promise<ClipCollecte | undefined>;
  remove(id: string): Promise<void>;
  count(): Promise<number>;
}

// ── Implémentation IndexedDB (production) ────────────────────────────────────
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'clip_id' });
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

// Deux points d'écriture concurrents sur le MÊME vote (deux taps rapides) sont
// possibles sur un pavé tactile : on relit et réécrit dans la même transaction
// pour ne jamais perdre un vote (pas de "lost update" sur un simple +1 en JS).
function votePur(clip: ClipCollecte, positif: boolean): ClipCollecte {
  const votes_up = clip.votes_up + (positif ? 1 : 0);
  const votes_down = clip.votes_down + (positif ? 0 : 1);
  // Règle Common Voice reprise dans le doc de design : 2 votes positifs =
  // validé, 2 négatifs = rejeté ; sinon on attend d'autres votes.
  const statut: StatutValidation =
    votes_up >= 2 ? 'validated' : votes_down >= 2 ? 'rejected' : 'pending';
  return { ...clip, votes_up, votes_down, statut };
}

export function idbCollecteStore(): CollecteStore {
  return {
    async enqueue(clip) {
      const db = await openDb();
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(clip);
      await txDone(tx); db.close();
    },
    async list() {
      const db = await openDb();
      const all = (await reqDone(db.transaction(STORE, 'readonly').objectStore(STORE).getAll())) as ClipCollecte[];
      db.close();
      return all.sort((a, b) => b.ts - a.ts);
    },
    async get(id) {
      const db = await openDb();
      const clip = (await reqDone(db.transaction(STORE, 'readonly').objectStore(STORE).get(id))) as ClipCollecte | undefined;
      db.close();
      return clip;
    },
    async voter(id, positif) {
      const db = await openDb();
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const clip = (await reqDone(store.get(id))) as ClipCollecte | undefined;
      let resultat: ClipCollecte | undefined;
      if (clip) { resultat = votePur(clip, positif); store.put(resultat); }
      await txDone(tx); db.close();
      return resultat;
    },
    async remove(id) {
      const db = await openDb();
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      await txDone(tx); db.close();
    },
    async count() {
      const db = await openDb();
      const n = await reqDone(db.transaction(STORE, 'readonly').objectStore(STORE).count());
      db.close(); return n as number;
    },
  };
}

// ── Implémentation mémoire (tests purs, sans IndexedDB) ──────────────────────
export function memoryCollecteStore(): CollecteStore {
  const clips = new Map<string, ClipCollecte>();
  return {
    async enqueue(clip) { clips.set(clip.clip_id, { ...clip }); },
    async list() { return [...clips.values()].sort((a, b) => b.ts - a.ts); },
    async get(id) { return clips.get(id); },
    async voter(id, positif) {
      const clip = clips.get(id); if (!clip) return undefined;
      const resultat = votePur(clip, positif);
      clips.set(id, resultat);
      return resultat;
    },
    async remove(id) { clips.delete(id); },
    async count() { return clips.size; },
  };
}

let _defaultStore: CollecteStore | null = null;
export function defaultCollecteStore(): CollecteStore {
  if (!_defaultStore) _defaultStore = idbCollecteStore();
  return _defaultStore;
}
