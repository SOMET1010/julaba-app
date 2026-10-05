// TABLE DE CAS PARTAGÉE — une seule, consommée par le test unitaire du
// validateur TypeScript ET par le test qui exécute le prédicat SQL en base.
// La règle est écrite deux fois (frontière API lisible / contrainte
// PostgreSQL) ; sans cette table commune, les deux finiraient par divergir.

export type CasSaisie = {
  libelle: string;
  quantite: number | null;
  quantiteSaisie: number | null;
  uniteSaisie: string | null;
  facteurSaisie: number | null;
  /** true = la ligne doit être ACCEPTÉE. */
  accepte: boolean;
};

export const CAS_SAISIE_BRUTE: CasSaisie[] = [
  // ── ACCEPTÉS ────────────────────────────────────────────────────────────
  { libelle: 'ligne historique : les trois NULL', quantite: 30, quantiteSaisie: null, uniteSaisie: null, facteurSaisie: null, accepte: true },
  { libelle: '3 paniers de 10 kg', quantite: 30, quantiteSaisie: 3, uniteSaisie: 'panier', facteurSaisie: 10, accepte: true },
  { libelle: '21 bottes de 0,5 kg (demi-kilo)', quantite: 10.5, quantiteSaisie: 21, uniteSaisie: 'botte', facteurSaisie: 0.5, accepte: true },
  { libelle: '1,5 tonne', quantite: 1500, quantiteSaisie: 1.5, uniteSaisie: 'tonne', facteurSaisie: 1000, accepte: true },
  { libelle: '150 kg saisis au kilo (facteur 1)', quantite: 150, quantiteSaisie: 150, uniteSaisie: 'kg', facteurSaisie: 1, accepte: true },
  // Facteur mesuré sur le terrain, non rond : 3 × 10,04 = 30,12 -> 30,1.
  // Prouve que la règle à 1 décimale n'est pas accidentellement trop stricte :
  // c'est exactement l'arrondi que l'écran applique.
  { libelle: 'facteur mesuré 10,04 : l’arrondi à 1 décimale colle', quantite: 30.1, quantiteSaisie: 3, uniteSaisie: 'panier', facteurSaisie: 10.04, accepte: true },

  // ── REFUSÉS — famille 1 : TRIPLET PARTIEL ───────────────────────────────
  { libelle: 'partiel : facteur manquant', quantite: 30, quantiteSaisie: 3, uniteSaisie: 'panier', facteurSaisie: null, accepte: false },
  { libelle: 'partiel : unité manquante', quantite: 30, quantiteSaisie: 3, uniteSaisie: null, facteurSaisie: 10, accepte: false },
  { libelle: 'partiel : quantité saisie manquante', quantite: 30, quantiteSaisie: null, uniteSaisie: 'panier', facteurSaisie: 10, accepte: false },

  // ── REFUSÉS — famille 2 : NÉGATIF OU NUL ────────────────────────────────
  // Le cas le plus traître : -3 × -10 = 30, donc la ligne serait
  // arithmétiquement « cohérente » tout en étant physiquement absurde.
  { libelle: 'négatif des deux côtés : -3 × -10 = 30', quantite: 30, quantiteSaisie: -3, uniteSaisie: 'panier', facteurSaisie: -10, accepte: false },
  { libelle: 'quantité saisie nulle', quantite: 30, quantiteSaisie: 0, uniteSaisie: 'panier', facteurSaisie: 10, accepte: false },
  { libelle: 'facteur nul', quantite: 0, quantiteSaisie: 3, uniteSaisie: 'panier', facteurSaisie: 0, accepte: false },

  // ── REFUSÉS — famille 3 : UNITÉ VIDE ────────────────────────────────────
  { libelle: 'unité chaîne vide', quantite: 30, quantiteSaisie: 3, uniteSaisie: '', facteurSaisie: 10, accepte: false },
  { libelle: 'unité faite d’espaces', quantite: 30, quantiteSaisie: 3, uniteSaisie: '   ', facteurSaisie: 10, accepte: false },

  // ── REFUSÉS — famille 4 : INCOHÉRENCE AVEC LA QUANTITÉ CANONIQUE ────────
  { libelle: '3 paniers de 10 kg annoncés pour 999 kg', quantite: 999, quantiteSaisie: 3, uniteSaisie: 'panier', facteurSaisie: 10, accepte: false },
  { libelle: 'écart d’un kilo : 30 attendu, 31 enregistré', quantite: 31, quantiteSaisie: 3, uniteSaisie: 'panier', facteurSaisie: 10, accepte: false },
  { libelle: 'saisie d’origine sans quantité convertie', quantite: null, quantiteSaisie: 3, uniteSaisie: 'panier', facteurSaisie: 10, accepte: false },
];
