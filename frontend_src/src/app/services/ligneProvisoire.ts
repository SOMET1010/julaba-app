/**
 * LIGNE PROVISOIRE de la vente vocale — cœur PUR de la Phase 1
 * (docs/SPEC_VENTE_VOCALE.md, validée par Alex le 11/08/2026).
 *
 * Chaîne obligatoire :
 *   écoute → interprétation → LIGNE PROVISOIRE → répétition → confirmation
 *   → ajout au panier COMMUN.
 *
 * Règles portées ici :
 * - rien n'entre au panier avant confirmation ;
 * - ambiguïté prix unitaire/total résolue par la règle de la spec §5
 *   (formulation explicite → ±20 % du prix catalogue → question ciblée) ;
 * - « non » n'est JAMAIS une nouvelle vente : en attente de confirmation,
 *   le vocabulaire de correction PRIME ;
 * - « annule » ne touche que la ligne provisoire, jamais le panier ;
 * - seule une ligne CONFIRMÉE est persistée (reprise après interruption) ;
 *   une ligne non confirmée se jette sans bruit.
 */

export type InterpretationPrix = 'unitaire' | 'total' | 'a_confirmer';
export type StatutLigne = 'a_confirmer' | 'confirmee';

export interface LigneProvisoire {
  id: string;
  nomParle: string;
  produitId: string | null;
  nomAffiche: string;
  quantite: number;
  unite: string;
  prixUnitaire: number | null;
  total: number | null;
  interpretationPrix: InterpretationPrix;
  statut: StatutLigne;
  creeLe: string;
}

export interface ProduitCatalogue { id: string; nom: string; prix?: number; unite?: string }
export interface KVStore { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem?(k: string): void }

export const CLE_LIGNE_PROVISOIRE = 'julaba_ligne_provisoire';
const TOLERANCE = 0.2; // ±20 % autour du prix catalogue (spec §5)

// ── Création + résolution du prix ──────────────────────────────────────────

export function creerLigne(args: {
  nomParle?: string;
  quantite?: number;
  montantDit?: number;
  produit?: ProduitCatalogue | null;
  /** 'unitaire' (« à X chacun ») ou 'total' (« le tout à X ») si la
   *  formulation était EXPLICITE ; null sinon. */
  formulation?: 'unitaire' | 'total' | null;
  id?: string;
  nowIso?: string;
}): LigneProvisoire {
  const q = Math.max(1, Math.round(args.quantite || 1));
  const montant = Math.max(0, args.montantDit || 0);
  const produit = args.produit ?? null;
  const nomAffiche = (produit?.nom || (args.nomParle || 'Article').trim() || 'Article');

  let interpretation: InterpretationPrix;
  let prixUnitaire: number | null = null;

  const proche = (a: number, b: number) => b > 0 && Math.abs(a - b) / b <= TOLERANCE;

  if (montant <= 0) {
    interpretation = 'a_confirmer'; // prix manquant → Tata demandera
  } else if (args.formulation === 'unitaire') {
    interpretation = 'unitaire'; prixUnitaire = montant;
  } else if (args.formulation === 'total') {
    interpretation = 'total'; prixUnitaire = Math.round(montant / q);
  } else if (q === 1) {
    interpretation = 'unitaire'; prixUnitaire = montant; // 1 article : pas d'ambiguïté
  } else if (produit?.prix && proche(montant, produit.prix)) {
    interpretation = 'unitaire'; prixUnitaire = montant;
  } else if (produit?.prix && proche(montant, produit.prix * q)) {
    interpretation = 'total'; prixUnitaire = Math.round(montant / q);
  } else {
    interpretation = 'a_confirmer'; // question ciblée obligatoire
  }

  return {
    id: args.id || `lp-${Math.random().toString(36).slice(2, 10)}`,
    nomParle: (args.nomParle || '').trim(),
    produitId: produit?.id ?? null,
    nomAffiche,
    quantite: q,
    unite: produit?.unite || 'unite',
    prixUnitaire,
    total: prixUnitaire !== null ? prixUnitaire * q : null,
    interpretationPrix: interpretation,
    statut: 'a_confirmer',
    creeLe: args.nowIso || '',
    // le montant DIT est retrouvable : total (si 'total') ou prixUnitaire.
  };
}

/** Réponse à la question « prix d'un seul ou de tous ? » — X était le montant dit. */
export function resoudrePrix(l: LigneProvisoire, montantDit: number, choix: 'unitaire' | 'total'): LigneProvisoire {
  const pu = choix === 'unitaire' ? montantDit : Math.round(montantDit / l.quantite);
  return { ...l, interpretationPrix: choix, prixUnitaire: pu, total: pu * l.quantite, statut: 'a_confirmer' };
}

// ── Corrections (modifient la ligne PROVISOIRE, jamais une vente) ──────────

export function corrigerQuantite(l: LigneProvisoire, q: number): LigneProvisoire {
  const quantite = Math.max(1, Math.round(q));
  return { ...l, quantite, total: l.prixUnitaire !== null ? l.prixUnitaire * quantite : null, statut: 'a_confirmer' };
}

export function corrigerPrix(l: LigneProvisoire, prix: number, interpretation: 'unitaire' | 'total' = 'unitaire'): LigneProvisoire {
  const pu = interpretation === 'unitaire' ? Math.max(0, Math.round(prix)) : Math.max(0, Math.round(prix / l.quantite));
  return { ...l, interpretationPrix: interpretation, prixUnitaire: pu, total: pu * l.quantite, statut: 'a_confirmer' };
}

/** Confirmation : EXIGE un prix résolu — sinon la ligne reste à confirmer. */
export function confirmerLigne(l: LigneProvisoire): LigneProvisoire {
  if (l.prixUnitaire === null || l.total === null || l.interpretationPrix === 'a_confirmer') return l;
  return { ...l, statut: 'confirmee' };
}

// ── Ce que dit Tata (dialogues EXACTS de la spec §6) ───────────────────────

const enF = (n: number) => n.toLocaleString('fr-FR');

export function phraseRepetition(l: LigneProvisoire): string {
  if (l.prixUnitaire === null || l.total === null) return phraseQuestion(l);
  if (l.interpretationPrix === 'total') {
    return `J'ai compris : ${l.quantite} ${l.nomAffiche} pour ${enF(l.total)} francs. C'est bon ?`;
  }
  return `J'ai compris : ${l.quantite} ${l.nomAffiche} à ${enF(l.prixUnitaire)} francs. Total : ${enF(l.total)} francs. C'est bon ?`;
}

export function phraseQuestion(l: LigneProvisoire): string {
  if (l.prixUnitaire === null && l.interpretationPrix === 'a_confirmer' && l.total === null) {
    return `Et c'est à combien ?`; // prix manquant OU ambigu sans montant
  }
  return `C'est le prix d'un seul, ou de tous les ${l.quantite} ?`;
}

export function phraseQuestionPrix(l: LigneProvisoire, montantDit: number): string {
  return `${enF(montantDit)} francs, c'est le prix d'un seul, ou de tous les ${l.quantite} ?`;
}

// ── Grammaire de CORRECTION (spec §4) — prime sur « vendre » ───────────────

export type Correction =
  | { type: 'confirmer' }
  | { type: 'refus' }                    // « non » seul → ouvre la correction
  | { type: 'quantite'; quantite: number }
  | { type: 'prix'; prix: number }
  | { type: 'supprimer' }
  | { type: 'annuler' }
  | { type: 'inconnu' };

// Nombres en LETTRES (une marchande dit « deux », pas « 2 ») — petits
// nombres pour les corrections de quantité ; « mille »/« cent » pour les prix.
const MOTS_NOMBRES: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7,
  huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, quinze: 15, vingt: 20,
  cent: 100, 'deux cents': 200, 'cinq cents': 500, mille: 1000,
  'deux mille': 2000, 'cinq mille': 5000,
};

function extraireNombres(t: string): number[] {
  const out: number[] = [];
  for (const m of t.match(/\d[\d\s]*/g) || []) {
    const n = parseInt(m.replace(/\s/g, ''), 10);
    if (!isNaN(n)) out.push(n);
  }
  if (out.length === 0) {
    // composés d'abord (« deux mille » avant « deux »)
    for (const mot of Object.keys(MOTS_NOMBRES).sort((a, b) => b.length - a.length)) {
      if (new RegExp(`(^|\\s)${mot}(\\s|$)`).test(t)) { out.push(MOTS_NOMBRES[mot]); break; }
    }
  }
  return out;
}

export function interpreterCorrection(texte: string): Correction {
  const t = (texte || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  if (!t) return { type: 'inconnu' };
  if (/(^|\s)(annule|recommence|laisse tomber)(\s|$)/.test(t)) return { type: 'annuler' };
  if (/(^|\s)(enleve|supprime|retire)(\s|$)/.test(t)) return { type: 'supprimer' };
  if (/^(oui|c ?est bon|c ?est ca|d accord|ok|vas y)\b/.test(t)) return { type: 'confirmer' };
  const nombres = extraireNombres(t);
  // « le prix c'est mille » / « a 400 francs » → correction de PRIX
  if (/(prix|francs?|fcfa|\ba \d)/.test(t) && nombres.length) {
    return { type: 'prix', prix: nombres[nombres.length - 1] };
  }
  // « non, deux » / « c'est deux tas » → correction de QUANTITÉ (le nombre
  // PRIME sur le « non » : elle corrige, elle ne re-vend jamais)
  if (nombres.length) return { type: 'quantite', quantite: nombres[0] };
  if (/^(non|pas ca|c ?est pas ca)\b/.test(t)) return { type: 'refus' };
  return { type: 'inconnu' };
}

// ── Persistance : SEULE une ligne confirmée survit (spec §3) ───────────────

export function sauvegarderLigne(store: KVStore | null, l: LigneProvisoire | null): boolean {
  try {
    if (!l || l.statut !== 'confirmee') {
      if (store?.removeItem) store.removeItem(CLE_LIGNE_PROVISOIRE);
      else store?.setItem(CLE_LIGNE_PROVISOIRE, '');
      return true;
    }
    store?.setItem(CLE_LIGNE_PROVISOIRE, JSON.stringify(l));
    return true;
  } catch { return false; }
}

export function chargerLigne(store: KVStore | null): LigneProvisoire | null {
  try {
    const brut = store?.getItem(CLE_LIGNE_PROVISOIRE);
    if (!brut) return null;
    const l = JSON.parse(brut) as LigneProvisoire;
    if (l?.statut !== 'confirmee' || typeof l.quantite !== 'number' || typeof l.prixUnitaire !== 'number') return null;
    return l;
  } catch { return null; }
}
