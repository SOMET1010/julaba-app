import type { LigneDeVente } from '../types/vente';
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
export type StockEndpoint = `/stocks/${string}`;
export type OfflineEndpoint = CaisseEndpoint | StockEndpoint;
export type OfflineMethod = 'POST' | 'PATCH';

/** Ce qu'une opération mise en file transporte : une VENTE, une DÉPENSE ou une
 *  mise à jour de STOCK. Les trois portent une clé d'idempotence — c'est elle
 *  qui empêche qu'une vente rejouée soit comptée deux fois.
 *
 *  Ce champ était `any`. C'est la donnée la plus exposée de l'application :
 *  elle est écrite sur le téléphone, survit à une coupure, à une fermeture de
 *  l'application, parfois à une mise à jour — et repart plus tard vers le
 *  serveur sans que personne ne la relise. Un `any` ici, c'est une vente qui
 *  peut partir déformée sans qu'aucun outil ne l'ait signalé. */
export type PayloadOperation = {
  idempotency_key?: string;
  montant?: number;
  produits?: LigneDeVente[];
  details?: LigneDeVente[];
  mode_paiement?: string;
  notes?: string;
  prix_achat?: number;
  prix_vente?: number;
  source?: 'vocal' | 'kassa';
  date_operation?: string;
  /** Mise à jour de stock : quantité et prix de la ligne visée. */
  quantite?: number;
  prix_unitaire?: number;
  seuil_alerte?: number;
  categorie?: string;
  date_peremption?: string | null;
};

export interface OperationCaisse {
  id: string;                 // clé d'idempotence (uuid)
  endpoint: OfflineEndpoint;
  method?: OfflineMethod;
  payload: PayloadOperation;
  ts: number;
  attempts?: number;          // essais TRANSITOIRES uniquement
  // P0-1 : propriétaire de l'opération (l'utilisateur connecté au moment de la
  // mise en file). Optionnel UNIQUEMENT pour lire des opérations posées avant ce
  // correctif (terminal déjà en usage, file existante à ne pas perdre).
  //
  // IMPORTANT — une opération SANS userId (héritée) n'appartient à PERSONNE.
  // Elle n'est JAMAIS adoptée par l'utilisateur courant : ce serait recréer
  // exactement le risque de rejeu sous le mauvais compte que ce cloisonnement
  // doit empêcher (terminal partagé : A quitte sans réseau, mise à jour, B se
  // connecte — B n'a produit AUCUNE preuve d'être le propriétaire de l'op de
  // A). Ces opérations sont mises à part (`operationsSansProprietaire`),
  // jamais rejouées ni supprimées automatiquement — voir `synchroniser`.
  userId?: string;
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

/** Un `userId` de secours (fallback 'anon', chaîne vide, etc.) n'est PAS une
 *  preuve d'identité — accepter une telle valeur reviendrait à créer, dès la
 *  mise en file, exactement l'opération « sans propriétaire fiable » que ce
 *  cloisonnement doit empêcher. Correction post-revue (2e passe) :
 *  `enfilerOperation` refuse maintenant explicitement toute valeur qui n'est
 *  pas un identifiant réel. */
function estUnUtilisateurReel(userId: unknown): userId is string {
  return typeof userId === 'string' && userId.trim().length > 0 && userId !== 'anon';
}

/** Ajoute une opération à la file durable. Réutilise `idempotency_key` comme id
 *  si présente (envoi en ligne échoué), pour que le rejeu envoie la MÊME clé.
 *
 *  `userId` (P0-1) : propriétaire de l'opération, OBLIGATOIRE et RÉEL — c'est
 *  lui qui protège contre le rejeu sous une autre session (terminal partagé).
 *  FAIL CLOSED : `undefined`/`null`/`''`/`'anon'` sont refusés avec une erreur
 *  explicite plutôt que silencieusement remplacés — une opération financière
 *  ou de stock ne doit JAMAIS être créée sans propriétaire authentifié réel.
 *  L'appelant doit empêcher l'action (ou la faire échouer visiblement) tant
 *  que l'identité n'est pas disponible, pas la mettre en file sous un nom
 *  générique. */
export async function enfilerOperation(
  endpoint: OfflineEndpoint,
  payload: unknown,
  userId: string | undefined | null,
  store: OutboxStore = defaultStore(),
  method: OfflineMethod = 'POST',
): Promise<string> {
  if (!estUnUtilisateurReel(userId)) {
    throw new Error(
      `Opération hors-ligne refusée (${endpoint}) : aucun utilisateur authentifié réel. ` +
      `Une opération financière ou de stock ne peut jamais être mise en file sous un propriétaire de secours ('anon' ou vide).`,
    );
  }
  const cle = (payload as PayloadOperation | null)?.idempotency_key;
  const op: OperationCaisse = { id: cle || uuid(), endpoint, method, payload: payload as PayloadOperation, ts: Date.now(), userId };
  await store.enqueue(op);
  return op.id;
}

/** Vue filtrée par propriétaire (P0-1) : n'expose QUE les opérations dont le
 *  propriétaire est CONNU et correspond exactement — stricte, sans exception.
 *  Une opération sans `userId` (héritée) n'appartient à personne : elle ne
 *  passe ce filtre pour AUCUN utilisateur, voir `operationsSansProprietaire`. */
function estAUtilisateur(op: OperationCaisse, userId: string): boolean {
  return op.userId === userId;
}

/** Une opération sans propriétaire connu (héritée d'avant P0-1, ou toute
 *  incohérence future) n'est jamais silencieusement perdue : elle reste
 *  visible ici, mise à part, en attente d'un traitement/alerte manuel — mais
 *  jamais attribuée ni rejouée automatiquement (voir `synchroniser`). */
function estOrpheline(op: OperationCaisse): boolean {
  return !op.userId;
}

export async function operationsEnAttente(userId: string, store: OutboxStore = defaultStore()): Promise<OperationCaisse[]> {
  return (await store.list()).filter((op) => estAUtilisateur(op, userId));
}
export async function nbEnAttente(userId: string, store: OutboxStore = defaultStore()): Promise<number> {
  return (await operationsEnAttente(userId, store)).length;
}
export async function nbEchecs(userId: string, store: OutboxStore = defaultStore()): Promise<number> {
  return (await lettresMortes(userId, store)).length;
}
export async function lettresMortes(userId: string, store: OutboxStore = defaultStore()): Promise<LettreMorte[]> {
  return (await store.deadList()).filter((op) => estAUtilisateur(op, userId));
}
/** Retire une lettre morte — vérifie la propriété d'abord (P0-1) : on ne
 *  supprime jamais silencieusement l'opération d'un AUTRE compte, ni d'une
 *  opération orpheline (propriétaire inconnu — la stricte égalité l'exclut
 *  déjà, aucun utilisateur ne peut la purger via ce chemin). */
export async function purgerLettreMorte(id: string, userId: string, store: OutboxStore = defaultStore()): Promise<void> {
  const dead = await store.deadList();
  const cible = dead.find((op) => op.id === id);
  if (!cible || !estAUtilisateur(cible, userId)) return;
  return store.deadRemove(id);
}

/** Opérations ACTIVES sans propriétaire connu, tous comptes confondus — jamais
 *  rejouées ni attribuées automatiquement (voir `synchroniser`). Exposé pour
 *  qu'un traitement/alerte manuel puisse les repérer plutôt que les laisser
 *  invisibles indéfiniment. */
export async function operationsSansProprietaire(store: OutboxStore = defaultStore()): Promise<OperationCaisse[]> {
  return (await store.list()).filter(estOrpheline);
}
export async function nbSansProprietaire(store: OutboxStore = defaultStore()): Promise<number> {
  return (await operationsSansProprietaire(store)).length;
}

/**
 * Rejoue les opérations en attente selon la politique 4xx/5xx.
 *
 * P0-1 — cloisonnement par utilisateur, STRICT : `currentUserId` est
 * l'identité de la session ACTIVE au moment du rejeu (pas une valeur
 * mémorisée à la création de l'effet React qui appelle cette fonction — elle
 * doit être relue à chaque appel). Seule une opération dont
 * `op.userId === currentUserId` est rejouée.
 *
 * Une opération dont le propriétaire diffère n'est NI rejouée NI purgée :
 * elle reste intacte dans la file, prête pour le retour de son propriétaire
 * (terminal partagé, logout/login, fermeture/redémarrage de l'appli).
 *
 * Une opération héritée SANS propriétaire connu (posée avant P0-1) n'est PAS
 * rejouée et n'est JAMAIS attribuée à l'utilisateur courant — l'identité
 * actuellement connectée n'est pas une preuve de qui a créé cette opération.
 * Elle est comptée à part (`sansProprietaire`) et reste consultable via
 * `operationsSansProprietaire`, pour un traitement/alerte manuel.
 *
 * CLOISONNEMENT DES COMPTEURS (correction post-revue, 2e passe) : `reste` et
 * `echecs` sont scopés à `currentUserId`, JAMAIS des comptes globaux tous
 * comptes confondus — sinon une session pourrait comparer un « avant »
 * mesuré pour elle-même à un « après » qui inclut les lettres mortes d'un
 * AUTRE compte sur le même terminal (ex: A à 0 échec, B à 2 → une alerte
 * fausse se déclencherait chez A). Toute métrique globale éventuelle doit
 * porter un nom explicite séparé (voir `sansProprietaire`, déjà distinct) et
 * ne jamais être présentée dans l'UX d'une session utilisateur.
 *
 * @returns { ok, reste (actives DE currentUserId uniquement), echecs
 *   (lettres mortes DE currentUserId uniquement), ignorees (d'un AUTRE
 *   compte, non touchées), sansProprietaire (propriétaire inconnu, ni
 *   rejouée ni attribuée — global par nature, nom explicite) }
 */
/**
 * Opérations dont la DATE compte : celles qui appartiennent à une journée de
 * caisse. Une vente faite à 23h55 sans réseau et remontée à 00h05 doit rester
 * au jour où elle a eu lieu — sinon la marchande compte faux le soir, des deux
 * côtés de minuit.
 */
// Les DEUX côtés du livre portent leur jour — ARGENT-1, 19/09/2026.
//
// Cette liste ne contenait que la vente. La dépense partait donc sans sa date,
// et le serveur l'enregistrait au jour du retour du réseau. La caisse théorique
// du soir — fond + ventes − dépenses — était fausse des deux côtés : trop haute
// hier, trop basse aujourd'hui.
//
// `/stocks/` reste HORS de cette liste, et c'est délibéré : une mise à jour de
// stock n'a pas de jour comptable, et lui en joindre un avait cassé
// `test:offline-stock` la première fois.
const ENDPOINTS_DATES = ['/caisse/vente', '/caisse/depense'];

export async function synchroniser<E extends OfflineEndpoint = OfflineEndpoint>(
  poster: (endpoint: E, payload: unknown, method: OfflineMethod) => Promise<void>,
  currentUserId: string,
  store: OutboxStore = defaultStore(),
): Promise<{ ok: number; reste: number; echecs: number; ignorees: number; sansProprietaire: number }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      ok: 0, reste: await nbEnAttente(currentUserId, store), echecs: await nbEchecs(currentUserId, store),
      ignorees: 0, sansProprietaire: await nbSansProprietaire(store),
    };
  }
  const ops = await store.list();
  let ok = 0;
  let ignorees = 0;
  let sansProprietaire = 0;
  for (const op of ops) {
    // Propriétaire inconnu : jamais rejouée, jamais attribuée à personne.
    // Mise à part, intacte, en attente d'un traitement/alerte manuel.
    if (estOrpheline(op)) { sansProprietaire++; continue; }
    // Cloisonnement : jamais rejouer l'opération d'un AUTRE compte sous la
    // session courante. On ne la touche pas — ni tentative, ni lettre morte,
    // ni incrément d'essais — elle reste active pour son propriétaire.
    if (op.userId !== currentUserId) { ignorees++; continue; }
    try {
      // LA DATE DE L'OPÉRATION PART AVEC ELLE — correctif du 18/09/2026.
      // Sans elle, le serveur horodatait au moment du REJEU : une vente de
      // 2 000 F faite à 23h55 sans réseau, remontée à 00h05, basculait sur le
      // jour suivant. Le total global restait juste, mais la journée de la
      // marchande — celle qu'elle compte le soir en fermant sa caisse — était
      // fausse des deux côtés. `ts` était déjà mémorisé dans la file ; il n'en
      // sortait simplement jamais.
      // SEULES LES OPÉRATIONS D'ARGENT PORTENT LEUR DATE. Un ajustement de
      // stock n'a pas de journée comptable : lui coller une date n'apporte
      // rien et change le contrat d'une route qui ne l'attend pas (défaut
      // attrapé par test:offline-stock avant qu'il ne sorte).
      const portefaireDate = ENDPOINTS_DATES.some((e) => op.endpoint.startsWith(e));
      await poster(
        op.endpoint as E,
        {
          ...op.payload,
          idempotency_key: op.id,
          ...(portefaireDate ? { date_operation: new Date(op.ts).toISOString() } : {}),
        },
        op.method || 'POST',
      );
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
  return {
    ok, reste: await nbEnAttente(currentUserId, store), echecs: await nbEchecs(currentUserId, store),
    ignorees, sansProprietaire,
  };
}
