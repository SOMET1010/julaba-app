// ──────────────────────────────────────────────────────────────────────────
// Studio Voix — persistance locale des prises (IndexedDB), DISTINCTE de la
// collecte terrain (collecteVoixDB.ts, base `julaba_collecte_voix`, destinée
// à la reconnaissance vocale dioula/baoulé). Ici : enregistrer la VRAIE voix
// de Tata pour l'appli — une prise par clé de script, réécoutable, validable,
// et qui SURVIT à un rechargement de page (« reprendre plus tard »).
//
// Même patron que collecteVoixDB.ts : interface injectable, IndexedDB en
// prod, mémoire en test.
// ──────────────────────────────────────────────────────────────────────────

export interface PriseStudio {
  cle: string;         // ex. 'AUTH_01', 'NUM_3', 'intro_accueil'
  blob: Blob;           // enregistrement natif (webm/mp4), source de vérité
  validee: boolean;     // réécoutée et jugée bonne par l'humain — pas juste "enregistrée"
  maj: number;          // Date.now() de la dernière écriture
}

const DB_NAME = 'julaba_studio_voix';
const STORE = 'prises';
const DB_VERSION = 1;

export interface StudioVoixStore {
  sauver(prise: PriseStudio): Promise<void>;
  tout(): Promise<Record<string, PriseStudio>>;
  supprimer(cle: string): Promise<void>;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'cle' });
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

export function idbStudioVoixStore(): StudioVoixStore {
  return {
    async sauver(prise) {
      const db = await openDb();
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(prise);
      await txDone(tx); db.close();
    },
    async tout() {
      const db = await openDb();
      const all = (await reqDone(db.transaction(STORE, 'readonly').objectStore(STORE).getAll())) as PriseStudio[];
      db.close();
      const parCle: Record<string, PriseStudio> = {};
      for (const p of all) parCle[p.cle] = p;
      return parCle;
    },
    async supprimer(cle) {
      const db = await openDb();
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(cle);
      await txDone(tx); db.close();
    },
  };
}

export function memoryStudioVoixStore(): StudioVoixStore {
  const prises = new Map<string, PriseStudio>();
  return {
    async sauver(prise) { prises.set(prise.cle, { ...prise }); },
    async tout() { return Object.fromEntries(prises); },
    async supprimer(cle) { prises.delete(cle); },
  };
}

let _defaultStore: StudioVoixStore | null = null;
export function defaultStudioVoixStore(): StudioVoixStore {
  if (!_defaultStore) _defaultStore = idbStudioVoixStore();
  return _defaultStore;
}
