// ──────────────────────────────────────────────────────────────────────────
// POST-FILTRE STRICT du vocal financier (durcissement anti-hallucination).
//
// Le STT hors-ligne (Vosk) est généraliste : il peut « halluciner » des chiffres.
// Avant, un simple nombre nu suffisait à devenir un MONTANT enregistré (extraction
// Étape D). Ici on refuse toute opération financière dont le montant n'est pas
// PROPRE et ANCRÉ dans une vraie tournure de commande. En cas de doute -> on
// redemande, on n'enregistre RIEN. L'argent est sacré (Constitution §7).
// ──────────────────────────────────────────────────────────────────────────

import { extraire } from './extraction';

// Bornes de sécurité d'un montant vocal (FCFA).
export const MONTANT_MIN = 5;
export const MONTANT_MAX = 10_000_000;

// Marqueurs qui ANCRENT un nombre comme un montant PARLÉ : « à 2500 »,
// « 2500 francs », « pour 1000 », « … cfa ». Sans marqueur, un nombre nu est
// probablement une hallucination du STT -> on ne l'enregistre pas.
const MARQUEUR_MONTANT = /(^|\s)(à|a|pour|francs?|cfa)(\s|$)/i;

export interface OperationVocaleValide {
  intention: 'vente' | 'depense';
  montant: number;
  produit?: string;
  quantite?: number;
}

/**
 * Valide (ou rejette) une opération financière dictée.
 * Renvoie l'opération SEULEMENT si :
 *   1. l'intention est financière (vente / dépense) ;
 *   2. un montant a été extrait ;
 *   3. le montant est propre : fini, borné [MONTANT_MIN..MONTANT_MAX], ET
 *      multiple de 5 (même règle que la saisie manuelle de l'app) ;
 *   4. le montant est ancré par un marqueur parlé (« à », « pour », « francs »…).
 * Sinon -> null (l'appelant redemande). Aucun montant halluciné ne passe.
 */
export function validerOperationVocale(transcript: string): OperationVocaleValide | null {
  if (!transcript || transcript.trim().split(/\s+/).length < 2) return null; // trop court / garbled
  const r = extraire(transcript);
  if (r.intention !== 'vente' && r.intention !== 'depense') return null;
  if (r.montant == null) return null;
  if (!Number.isFinite(r.montant) || r.montant < MONTANT_MIN || r.montant > MONTANT_MAX) return null;
  if (r.montant % 5 !== 0) return null;
  if (!MARQUEUR_MONTANT.test(transcript)) return null;
  return {
    intention: r.intention,
    montant: r.montant,
    produit: r.produit ?? undefined,
    quantite: r.quantite ?? undefined,
  };
}
