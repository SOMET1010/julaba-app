/**
 * Persistance locale du panier de caisse (Phase 1 — « Sécuriser & rendre la caisse visible »).
 *
 * Module PUR : aucune dépendance React / DOM. Le stockage est INJECTÉ (KVStore),
 * donc tout est testable sans navigateur (même approche que audioManager).
 *
 * Décisions de spec appliquées :
 *  - R2 : la clé ne dépend que de l'utilisateur (une marchande = un seul point de
 *         vente dans le modèle actuel). Point d'extension unique : cartKey().
 *  - R4 : une écriture qui échoue ne lève jamais → { ok:false } (la vente reste possible).
 *  - R5 : un panier plus vieux que STALE_AFTER_MS est « ancien » (reprendre/effacer).
 *  - Un panier VIDE n'est jamais restauré ni conservé.
 */

/**
 * CE QUI SURVIT À UNE FERMETURE D'APPLICATION — PAN-01, 27/09/2026.
 *
 * `CartItem` porte huit champs ; cette forme n'en écrivait que QUATRE. Les
 * quatre autres n'étaient ni perdus à la lecture ni corrompus : jamais écrits.
 * Mesuré sur un aller-retour réel :
 *
 *   · `prix_achat` → 0, DONC LA MARGE DEVENAIT LE PRIX DE VENTE ENTIER. Un
 *     sac de riz acheté 15 000 et revendu 20 000 affichait 20 000 F de
 *     bénéfice au lieu de 5 000. Le champ avait été ajouté au modèle VIVANT
 *     (`CartItem.prix_achat`, dont le commentaire annonçait déjà ce défaut),
 *     pas à la persistance.
 *   · `unite` → « 1 sac de Riz » redevenait « 1 × Riz ». Le défaut du 19/09,
 *     rouvert par un simple redémarrage.
 *   · `totalExact` → le total repartait à `prix × quantité` ; en FCFA un
 *     montant négocié ne retombe pas juste (« 6 régimes pour 5 000 » → 4 998).
 *   · `origine` → la vente dictée sortait de « Par la voix ».
 *
 * LES QUATRE AJOUTS SONT OPTIONNELS, et c'est voulu : un panier écrit avant
 * ce lot ne les a pas, et on ne les invente pas. Fabriquer une unité qu'elle
 * n'a jamais dite serait pire que de ne rien savoir.
 */
export interface PersistedCartItem {
  productId: string;
  nom: string;
  prix: number;
  quantite: number;
  /** Prix d'achat UNITAIRE. Sans lui la marge vaut le prix de vente entier. */
  prix_achat?: number;
  /** Montant TOTAL convenu pour la ligne. JAMAIS recalculé — voir `sanitizeItems`. */
  totalExact?: number;
  /** L'unité au moment de la vente : « tas », « kg », « sac »… */
  unite?: string;
  /** D'où vient la ligne. Seule `'vocal'` est significative aujourd'hui. */
  origine?: 'vocal';
}

/**
 * VERSION 2 — quatre champs ajoutés, aucun retiré.
 *
 * La lecture accepte encore `v: 1` et le convertit sans rien jeter : un panier
 * déjà sur un téléphone ne doit pas disparaître au déploiement. Une marchande
 * en plein marché ne comprendrait pas où sont passés ses articles.
 */
export type CartVersion = 1 | 2;

export interface CartEnvelope {
  v: CartVersion;
  items: PersistedCartItem[];
  updatedAt: string; // ISO 8601
}

export type CartAge = 'recent' | 'stale';

/** Store clé→valeur minimal : localStorage en prod, factice en test. */
export interface KVStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const CART_KEY_PREFIX = 'julaba_cart_';

/**
 * Seuil au-delà duquel un panier est considéré « ancien » (R5).
 * 12 h : couvre une très longue journée de marché d'un seul tenant (ex. 6h→20h)
 * sans franchir la nuit ; un panier laissé la veille est donc « ancien ».
 */
export const STALE_AFTER_MS = 12 * 60 * 60 * 1000;

/**
 * Clé de stockage du panier d'une utilisatrice. Ne dépend QUE de son identifiant :
 * dans l'architecture actuelle une marchande n'a qu'un seul point de vente
 * (aucune entité boutique/magasin, ventes isolées par marchand_id = user.id,
 * session unique par (marchand_id, date)). Si un modèle multi-boutiques était
 * introduit, l'étendre ICI et NULLE PART AILLEURS : `${prefix}${userId}_${pdvId}`.
 */
export function cartKey(userId: string): string {
  return `${CART_KEY_PREFIX}${userId}`;
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

/** Une ligne de panier est-elle bien formée ? */
export function isValidItem(x: unknown): x is PersistedCartItem {
  if (!x || typeof x !== 'object') return false;
  const it = x as Record<string, unknown>;
  return (
    typeof it.productId === 'string' && it.productId.length > 0 &&
    typeof it.nom === 'string' &&
    isFiniteNumber(it.prix) && it.prix >= 0 &&
    isFiniteNumber(it.quantite) && Number.isInteger(it.quantite) && it.quantite > 0
  );
}

/**
 * Ne conserve que les lignes valides, réduites au strict nécessaire.
 *
 * PAN-01 — LES QUATRE CHAMPS OPTIONNELS NE SONT ÉCRITS QUE S'ILS EXISTENT.
 * Un champ absent reste absent : c'est ce qui permet à un panier v1 de
 * traverser sans qu'on lui invente une unité ou un prix d'achat.
 *
 * `totalExact` N'EST JAMAIS RECALCULÉ ICI. Il est recopié tel quel, ou pas du
 * tout. Le dériver de `prix × quantité` reviendrait à fabriquer le montant que
 * ce champ existe précisément pour préserver — celui qu'elle a négocié.
 */
export function sanitizeItems(raw: unknown): PersistedCartItem[] {
  if (!Array.isArray(raw)) return [];
  const out: PersistedCartItem[] = [];
  for (const it of raw) {
    if (!isValidItem(it)) continue;
    const ligne: PersistedCartItem = {
      productId: it.productId, nom: it.nom, prix: it.prix, quantite: it.quantite,
    };
    const brut = it as unknown as Record<string, unknown>;
    if (isFiniteNumber(brut.prix_achat) && brut.prix_achat >= 0) ligne.prix_achat = brut.prix_achat;
    if (isFiniteNumber(brut.totalExact) && brut.totalExact >= 0) ligne.totalExact = brut.totalExact;
    if (typeof brut.unite === 'string' && brut.unite.trim() !== '') ligne.unite = brut.unite;
    if (brut.origine === 'vocal') ligne.origine = 'vocal';
    out.push(ligne);
  }
  return out;
}

/** Sérialise un panier dans une enveloppe versionnée. */
export function serializeCart(items: PersistedCartItem[], nowIso: string): string {
  const env: CartEnvelope = { v: 2, items: sanitizeItems(items), updatedAt: nowIso };
  return JSON.stringify(env);
}

/**
 * Parse défensif : null si vide, corrompu, ou de forme/version inconnue.
 *
 * PAN-01 — LA MIGRATION v1 → v2 SE FAIT ICI, ET ELLE NE JETTE RIEN.
 *
 * Cette fonction refusait tout ce qui n'était pas `v: 1`. Le jour où l'on
 * écrit du `v: 2`, elle aurait rendu `null` : le panier d'une marchande
 * disparaissait en silence au premier déploiement — précisément le défaut
 * qu'on cherche à éviter en versionnant.
 *
 * La conversion est DÉTERMINISTE et sans perte : un panier v1 n'a que ses
 * quatre champs, `sanitizeItems` n'en invente aucun autre, et il ressort
 * intact. On ne fabrique ni unité, ni prix d'achat, ni total : ne rien savoir
 * est plus honnête qu'inventer.
 *
 * Une version INCONNUE (3, 0, absente) reste refusée : mieux vaut repartir
 * d'un panier vide que de deviner la forme d'une donnée d'argent.
 */
const VERSIONS_LUES: ReadonlySet<unknown> = new Set<unknown>([1, 2]);

export function parseCart(raw: string | null): CartEnvelope | null {
  if (!raw) return null;
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return null; }
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (!VERSIONS_LUES.has(d.v)) return null;
  const items = sanitizeItems(d.items);
  const updatedAt = typeof d.updatedAt === 'string' ? d.updatedAt : '';
  // La version RENDUE est celle d'aujourd'hui : ce qui sort d'ici est déjà
  // migré, et l'appelant n'a pas à connaître la forme d'origine.
  return { v: 2, items, updatedAt };
}

/** Âge du panier vs le seuil (R5). Une date invalide est traitée comme « ancien ». */
export function cartAge(updatedAt: string, nowMs: number): CartAge {
  const t = Date.parse(updatedAt);
  if (!Number.isFinite(t)) return 'stale';
  return (nowMs - t) <= STALE_AFTER_MS ? 'recent' : 'stale';
}

export interface LoadedCart {
  items: PersistedCartItem[];
  age: CartAge;
  updatedAt: string;
}

/**
 * Lit le panier d'un utilisateur. Renvoie null s'il n'y a aucun panier valide et
 * NON VIDE (rien à reprendre). Ne lève jamais.
 */
export function loadCart(store: KVStore, userId: string, nowMs: number): LoadedCart | null {
  if (!userId) return null;
  let raw: string | null = null;
  try { raw = store.getItem(cartKey(userId)); } catch { return null; }
  const env = parseCart(raw);
  if (!env || env.items.length === 0) return null;
  return { items: env.items, age: cartAge(env.updatedAt, nowMs), updatedAt: env.updatedAt };
}

/**
 * Écrit le panier. Un panier vide EFFACE la clé. En cas d'échec de stockage
 * (quota, mode privé…), renvoie { ok:false } SANS lever (R4 : la vente reste possible).
 */
export function saveCart(
  store: KVStore,
  userId: string,
  items: PersistedCartItem[],
  nowIso: string,
): { ok: boolean } {
  if (!userId) return { ok: false };
  try {
    const clean = sanitizeItems(items);
    if (clean.length === 0) store.removeItem(cartKey(userId));
    else store.setItem(cartKey(userId), serializeCart(clean, nowIso));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Efface le panier d'un utilisateur (déconnexion volontaire — R3). Ne lève jamais. */
export function clearStoredCart(store: KVStore, userId: string): void {
  if (!userId) return;
  try { store.removeItem(cartKey(userId)); } catch { /* ignore */ }
}
