/**
 * « Tata se souvient de moi » (connexion inclusive, lot 1) — module PUR, sans
 * React ni DOM (stockage injecté, testable au tsx comme cartStorage).
 *
 * Après une première entrée réussie, Tata mémorise la personne SUR CE TÉLÉPHONE.
 * Au retour, elle n'a plus à redonner ses 10 chiffres : Tata l'accueille par son
 * prénom et lui propose de se faire reconnaître (visage/doigt) ou son code.
 *
 * Téléphone partagé (cas réel au marché) : on mémorise une PETITE liste de
 * comptes (pas un seul), la plus récente d'abord. « Ce n'est pas moi » ne
 * supprime rien : la personne suivante s'identifie, et passe en tête.
 *
 * Vie privée : uniquement prénom, numéro et photo — jamais le code, jamais de
 * jeton. La clé survit à la déconnexion (clearAuthClientState ne la touche pas).
 */

export interface KVStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CompteMemorise {
  /** Numéro national à 10 chiffres (sans +225). */
  phone: string;
  prenom: string;
  photo?: string;
  /** true = la reconnaissance (visage/doigt) a déjà fonctionné pour ce compte ici. */
  biometrie: boolean;
  updatedAt: string;
}

export const CLE_COMPTES = 'julaba_comptes_memorises';
/** Téléphone partagé : on garde les derniers comptes, pas une liste infinie. */
export const MAX_COMPTES = 3;

interface Enveloppe { v: 1; comptes: CompteMemorise[]; }

function estCompteValide(c: unknown): c is CompteMemorise {
  if (!c || typeof c !== 'object') return false;
  const o = c as Record<string, unknown>;
  return typeof o.phone === 'string' && /^\d{10}$/.test(o.phone)
    && typeof o.prenom === 'string'
    && typeof o.biometrie === 'boolean'
    && typeof o.updatedAt === 'string'
    && (o.photo === undefined || typeof o.photo === 'string');
}

/** Liste des comptes mémorisés, plus récent d'abord. Donnée illisible → liste vide. */
export function chargerComptes(store: KVStore): CompteMemorise[] {
  try {
    const raw = store.getItem(CLE_COMPTES);
    if (!raw) return [];
    const env = JSON.parse(raw) as Partial<Enveloppe>;
    if (env?.v !== 1 || !Array.isArray(env.comptes)) return [];
    return env.comptes.filter(estCompteValide).slice(0, MAX_COMPTES);
  } catch { return []; }
}

/** Le compte à accueillir au retour (le plus récent), ou null. */
export function dernierCompte(store: KVStore): CompteMemorise | null {
  return chargerComptes(store)[0] ?? null;
}

function ecrire(store: KVStore, comptes: CompteMemorise[]): boolean {
  try {
    store.setItem(CLE_COMPTES, JSON.stringify({ v: 1, comptes: comptes.slice(0, MAX_COMPTES) } satisfies Enveloppe));
    return true;
  } catch { return false; } // quota / mode privé : la connexion classique reste intacte
}

/**
 * Mémorise (ou remet en tête) un compte après une entrée réussie.
 * Le drapeau `biometrie` déjà acquis est CONSERVÉ si l'appel ne le fournit pas à
 * true (une connexion par code ne fait pas oublier que l'empreinte marche ici).
 */
export function memoriserCompte(
  store: KVStore,
  compte: { phone: string; prenom?: string; photo?: string; biometrie?: boolean },
  nowIso: string,
): boolean {
  if (!/^\d{10}$/.test(compte.phone)) return false;
  const existants = chargerComptes(store);
  const ancien = existants.find(c => c.phone === compte.phone);
  const maj: CompteMemorise = {
    phone: compte.phone,
    prenom: (compte.prenom ?? ancien?.prenom ?? '').trim(),
    photo: compte.photo ?? ancien?.photo,
    biometrie: compte.biometrie === true || ancien?.biometrie === true,
    updatedAt: nowIso,
  };
  return ecrire(store, [maj, ...existants.filter(c => c.phone !== compte.phone)]);
}

/** Note que la reconnaissance (visage/doigt) marche — ou non — pour ce compte ici. */
export function marquerBiometrie(store: KVStore, phone: string, ok: boolean): boolean {
  const comptes = chargerComptes(store);
  const cible = comptes.find(c => c.phone === phone);
  if (!cible) return false;
  return ecrire(store, comptes.map(c => (c.phone === phone ? { ...c, biometrie: ok } : c)));
}

/** Oublie un compte sur ce téléphone (demande explicite, ex. depuis les réglages). */
export function oublierCompte(store: KVStore, phone: string): boolean {
  const restants = chargerComptes(store).filter(c => c.phone !== phone);
  if (restants.length === 0) {
    try { store.removeItem(CLE_COMPTES); return true; } catch { return false; }
  }
  return ecrire(store, restants);
}
