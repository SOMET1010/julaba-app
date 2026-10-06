// ──────────────────────────────────────────────────────────────────────────
// Studio v1 (collecte terrain) — file de consignes d'élicitation, module PUR.
//
// « Élicitation par image/consigne audio » (docs/PACKS_VOIX_COLLECTE.md §5) :
// on montre une image, Tata dit la consigne, la locutrice répète — aucune
// lecture requise, l'étiquette est la consigne elle-même (pas de transcription
// à faire ensuite). Le vocabulaire visé est délibérément restreint (chiffres,
// quelques produits, oui/non) : c'est le profil idéal du keyword spotting
// (voir le document de design des 3 chantiers, §1).
//
// ⚠️ CONTENU PLACEHOLDER : ces consignes sont en français, uniquement pour
// prouver le mécanisme de bout en bout (queue, qualité, stockage). Le contenu
// RÉEL dioula/baoulé — les mots, leur prononciation, leur ordre — est une
// dépendance humaine (locuteur natif) hors du périmètre de ce lot. Remplacer
// ce tableau (ou le charger depuis un fichier de config) avant toute vraie
// campagne de terrain.
// ──────────────────────────────────────────────────────────────────────────

export interface PromptCollecte {
  prompt_id: string;
  /** Image affichée (emoji en attendant de vraies illustrations). */
  image: string;
  /** Consigne dite par Tata — jamais écrite à l'écran (public non-lecteur). */
  consigne: string;
  categorie: 'chiffre' | 'produit' | 'confirmation';
}

export const PROMPTS_PLACEHOLDER_FR: readonly PromptCollecte[] = Object.freeze([
  { prompt_id: 'chiffre_0', image: '0️⃣', consigne: 'Dis : zéro.', categorie: 'chiffre' },
  { prompt_id: 'chiffre_1', image: '1️⃣', consigne: 'Dis : un.', categorie: 'chiffre' },
  { prompt_id: 'chiffre_2', image: '2️⃣', consigne: 'Dis : deux.', categorie: 'chiffre' },
  { prompt_id: 'chiffre_3', image: '3️⃣', consigne: 'Dis : trois.', categorie: 'chiffre' },
  { prompt_id: 'chiffre_5', image: '5️⃣', consigne: 'Dis : cinq.', categorie: 'chiffre' },
  { prompt_id: 'produit_tomate', image: '🍅', consigne: 'Dis : tomate.', categorie: 'produit' },
  { prompt_id: 'produit_mais', image: '🌽', consigne: 'Dis : maïs.', categorie: 'produit' },
  { prompt_id: 'produit_banane', image: '🍌', consigne: 'Dis : banane.', categorie: 'produit' },
  { prompt_id: 'oui', image: '👍', consigne: 'Dis : oui.', categorie: 'confirmation' },
  { prompt_id: 'non', image: '👎', consigne: 'Dis : non.', categorie: 'confirmation' },
]);

/**
 * Prochaine consigne à proposer : la première du référentiel qui n'a pas
 * encore de clip ACCEPTÉ pour cette session, dans l'ordre. Boucle à la fin
 * (une session peut redemander la même consigne pour plusieurs répétitions
 * — utile, on veut plusieurs locuteurs/prises par mot).
 */
export function prochainPrompt(
  dejaFaits: readonly string[],
  referentiel: readonly PromptCollecte[] = PROMPTS_PLACEHOLDER_FR,
): PromptCollecte | null {
  if (referentiel.length === 0) return null;
  const restants = referentiel.filter((p) => !dejaFaits.includes(p.prompt_id));
  if (restants.length > 0) return restants[0];
  // Tout fait au moins une fois dans cette session → on reboucle depuis le début.
  return referentiel[0];
}
