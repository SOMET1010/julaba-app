/**
 * Vente guidée — LIGNE PROVISOIRE (module PUR, sans React ni DOM).
 *
 * Socle de la vente vocale unifiée (cf. docs/SPEC_VENTE_VOCALE.md §3 et §5) :
 *
 *   écoute → interprétation → LIGNE PROVISOIRE → répétition → confirmation → ajout au panier
 *
 * Règles NON négociables encodées ici :
 * - AUCUN ajout au panier tant que le prix n'est pas résolu (§5) : une ligne dont
 *   l'interprétation reste « a_confirmer » ne peut PAS être confirmée.
 * - Confirmer ne touche JAMAIS le panier : ce module ne fait que produire/valider
 *   une ligne. L'ajout réel (addToCart) et l'enregistrement (encaissement) vivent
 *   ailleurs — la voix n'appelle jamais `enregistrerVente`.
 * - Une ligne CONFIRMÉE mais non ajoutée (fermeture, interruption) est persistable
 *   et reproposable ; une ligne NON confirmée est jetée sans bruit.
 *
 * Ce module est testé au tsx (`npm run test:provisoire`), sans micro ni navigateur.
 */

export type InterpretationPrix = 'unitaire' | 'total' | 'a_confirmer';
export type StatutLigne = 'a_confirmer' | 'confirmee';

export interface LigneProvisoire {
  id: string;
  nomParle: string;            // ce qu'elle a dit
  produitId: string | null;    // appariement catalogue (null = ligne libre)
  nomAffiche: string;          // nom catalogue ou nomParle propre
  quantite: number;            // ≥ 1
  unite: string;               // 'tas', 'kg', 'sac', 'unite'…
  prixUnitaire: number | null; // null tant que non résolu
  total: number | null;        // = quantite × prixUnitaire une fois résolu
  interpretationPrix: InterpretationPrix;
  statut: StatutLigne;
  creeLe: string;              // ISO
}

/** Ce que la voix a extrait avant résolution. */
export interface EntreeVocale {
  nomParle: string;
  quantite?: number;               // défaut 1, plancher 1
  montant?: number | null;         // X dicté (peut être unitaire OU total : ambigu)
  /** Formulation explicite : « à X chacun » → 'unitaire' ; « le tout à X » → 'total'. */
  prixExplicite?: 'unitaire' | 'total' | null;
  unite?: string;
}

/** Contexte catalogue pour lever l'ambiguïté (§5). */
export interface ContexteProduit {
  produitId: string | null;
  nomCatalogue?: string;
  /** Prix unitaire au catalogue (FCFA). null/0 = inconnu → pas d'heuristique. */
  prixCatalogue?: number | null;
  unite?: string;
}

const TOLERANCE = 0.2; // ±20 % (règle §5)

function estProche(valeur: number, reference: number): boolean {
  if (!(reference > 0)) return false;
  return Math.abs(valeur - reference) <= TOLERANCE * reference;
}

function quantiteSaine(q?: number): number {
  return q != null && Number.isFinite(q) && q >= 1 ? Math.floor(q) : 1;
}

interface Resolution {
  interpretationPrix: InterpretationPrix;
  prixUnitaire: number | null;
  total: number | null;
}

/**
 * Résout l'ambiguïté prix unitaire/total (SPEC §5) — cœur du module.
 * 1. Formulation explicite → résolu.
 * 2. Sinon, si produit apparié et X ≈ prix catalogue → unitaire ;
 *    si X ≈ quantité × prix catalogue → total. (≈ = ±20 %.)
 * 3. Sinon → « a_confirmer » : AUCUN prix posé, il faudra demander.
 */
export function resoudrePrix(
  quantite: number,
  montant: number | null | undefined,
  prixExplicite: 'unitaire' | 'total' | null | undefined,
  prixCatalogue: number | null | undefined,
): Resolution {
  const q = quantiteSaine(quantite);
  if (montant == null || !Number.isFinite(montant) || montant <= 0) {
    return { interpretationPrix: 'a_confirmer', prixUnitaire: null, total: null };
  }
  const commeUnitaire = (): Resolution => ({
    interpretationPrix: 'unitaire', prixUnitaire: Math.round(montant), total: Math.round(montant) * q,
  });
  const commeTotal = (): Resolution => ({
    interpretationPrix: 'total', prixUnitaire: Math.round(montant / q), total: Math.round(montant),
  });

  if (prixExplicite === 'unitaire') return commeUnitaire();
  if (prixExplicite === 'total') return commeTotal();

  const cat = prixCatalogue ?? null;
  if (cat && cat > 0) {
    // Ordre : unitaire d'abord (§5 étape 2). Avec quantité 1, unitaire == total :
    // on tranche « unitaire », sans ambiguïté réelle.
    if (estProche(montant, cat)) return commeUnitaire();
    if (q > 1 && estProche(montant, q * cat)) return commeTotal();
  }
  return { interpretationPrix: 'a_confirmer', prixUnitaire: null, total: null };
}

function uuid(): string {
  try {
    const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch { /* pas de crypto : repli ci-dessous */ }
  return 'lp-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/**
 * Construit une ligne provisoire à partir de ce que la voix a compris.
 * `opts.id` / `opts.creeLe` sont injectables pour des tests déterministes.
 * Statut toujours 'a_confirmer' : rien n'est acquis avant confirmation explicite.
 */
export function creerLigneProvisoire(
  entree: EntreeVocale,
  ctx: ContexteProduit,
  opts?: { id?: string; creeLe?: string },
): LigneProvisoire {
  const quantite = quantiteSaine(entree.quantite);
  const res = resoudrePrix(quantite, entree.montant, entree.prixExplicite, ctx.prixCatalogue);
  const nomAffiche = (ctx.nomCatalogue || entree.nomParle || '').trim() || 'Produit';
  return {
    id: opts?.id ?? uuid(),
    nomParle: (entree.nomParle || '').trim(),
    produitId: ctx.produitId ?? null,
    nomAffiche,
    quantite,
    unite: (entree.unite || ctx.unite || 'unité').trim() || 'unité',
    prixUnitaire: res.prixUnitaire,
    total: res.total,
    interpretationPrix: res.interpretationPrix,
    statut: 'a_confirmer',
    creeLe: opts?.creeLe ?? new Date().toISOString(),
  };
}

/** La ligne est-elle prête à être ajoutée (prix résolu, total connu) ? */
export function estResolue(ligne: LigneProvisoire): boolean {
  return ligne.interpretationPrix !== 'a_confirmer'
    && ligne.total != null && ligne.total > 0
    && ligne.prixUnitaire != null && ligne.prixUnitaire >= 0;
}

/**
 * Corrige la QUANTITÉ (« non, deux »). Repasse en 'a_confirmer' (re-confirmation).
 *
 * Le PRIX UNITAIRE est l'invariant d'une correction de quantité : le total suit
 * (2 × 500 = 1000), que le prix ait été dicté en unitaire OU en total. Garder le
 * total figé ferait bondir le prix unitaire (surprise pour la marchande), donc on
 * ne le fait pas. Si le prix n'est pas encore résolu, la ligne reste non résolue.
 */
export function corrigerQuantite(ligne: LigneProvisoire, nouvelleQuantite: number): LigneProvisoire {
  const q = quantiteSaine(nouvelleQuantite);
  const prixUnitaire = ligne.prixUnitaire;
  const total = prixUnitaire != null ? prixUnitaire * q : ligne.total;
  return { ...ligne, quantite: q, prixUnitaire, total, statut: 'a_confirmer' };
}

/**
 * Corrige le PRIX (« le prix c'est mille » / « à 400 francs »).
 * `mode` dit si le montant fourni est unitaire ou total. Repasse en 'a_confirmer'.
 */
export function corrigerPrix(
  ligne: LigneProvisoire,
  montant: number,
  mode: 'unitaire' | 'total',
): LigneProvisoire {
  const res = resoudrePrix(ligne.quantite, montant, mode, null);
  return {
    ...ligne,
    prixUnitaire: res.prixUnitaire,
    total: res.total,
    interpretationPrix: res.interpretationPrix,
    statut: 'a_confirmer',
  };
}

/** Fixe l'interprétation quand Tata a demandé « d'une » / « des trois » (§5 étape 3). */
export function resoudreAmbiguite(
  ligne: LigneProvisoire,
  montant: number,
  choix: 'unitaire' | 'total',
): LigneProvisoire {
  return corrigerPrix(ligne, montant, choix);
}

/**
 * Confirme la ligne → 'confirmee'. GARDE : refuse si le prix n'est pas résolu
 * (retourne null). C'est ce qui garantit « aucun ajout tant que non résolu » (§5).
 */
export function confirmer(ligne: LigneProvisoire): LigneProvisoire | null {
  if (!estResolue(ligne)) return null;
  return { ...ligne, statut: 'confirmee' };
}

// ── Persistance / reprise (§3) ───────────────────────────────────────────────

/** Sérialise pour stockage local. */
export function serialiser(ligne: LigneProvisoire): string {
  return JSON.stringify(ligne);
}

function estLigneProvisoire(x: unknown): x is LigneProvisoire {
  if (!x || typeof x !== 'object') return false;
  const l = x as Record<string, unknown>;
  return typeof l.id === 'string'
    && typeof l.quantite === 'number'
    && (l.interpretationPrix === 'unitaire' || l.interpretationPrix === 'total' || l.interpretationPrix === 'a_confirmer')
    && (l.statut === 'a_confirmer' || l.statut === 'confirmee');
}

/** Désérialise ; retourne null si la donnée est corrompue/illisible. */
export function deserialiser(brut: string | null | undefined): LigneProvisoire | null {
  if (!brut) return null;
  try {
    const parsed = JSON.parse(brut);
    return estLigneProvisoire(parsed) ? parsed : null;
  } catch { return null; }
}

/**
 * Au démarrage : quelle ligne reproposer ? UNIQUEMENT une ligne CONFIRMÉE et
 * résolue (« On était sur 3 tas de tomates à 500 francs. Je l'ajoute ? »).
 * Une ligne 'a_confirmer' est jetée sans bruit (retourne null).
 */
export function ligneAReproposer(brut: string | null | undefined): LigneProvisoire | null {
  const ligne = deserialiser(brut);
  if (!ligne) return null;
  if (ligne.statut !== 'confirmee' || !estResolue(ligne)) return null;
  return ligne;
}
