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

export interface PersistedCartItem {
  productId: string;
  nom: string;
  prix: number;
  quantite: number;
}

export interface CartEnvelope {
  v: 1;
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

/** Ne conserve que les lignes valides, réduites au strict nécessaire. */
export function sanitizeItems(raw: unknown): PersistedCartItem[] {
  if (!Array.isArray(raw)) return [];
  const out: PersistedCartItem[] = [];
  for (const it of raw) {
    if (isValidItem(it)) {
      out.push({ productId: it.productId, nom: it.nom, prix: it.prix, quantite: it.quantite });
    }
  }
  return out;
}

/** Sérialise un panier dans une enveloppe versionnée. */
export function serializeCart(items: PersistedCartItem[], nowIso: string): string {
  const env: CartEnvelope = { v: 1, items: sanitizeItems(items), updatedAt: nowIso };
  return JSON.stringify(env);
}

/** Parse défensif : null si vide, corrompu, ou de forme/version inconnue. */
export function parseCart(raw: string | null): CartEnvelope | null {
  if (!raw) return null;
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return null; }
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.v !== 1) return null;
  const items = sanitizeItems(d.items);
  const updatedAt = typeof d.updatedAt === 'string' ? d.updatedAt : '';
  return { v: 1, items, updatedAt };
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
