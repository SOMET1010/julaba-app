/**
 * Vente guidée — GRAMMAIRE DE RÉPONSE (module PUR, sans React ni DOM).
 *
 * Interprète ce que dit la marchande QUAND une ligne provisoire attend sa
 * confirmation ou sa correction (cf. docs/SPEC_VENTE_VOCALE.md §4).
 *
 * Règle NON négociable (§4) : dans cet état, le vocabulaire de correction PRIME
 * sur l'interprétation « vendre ». « Non » n'est JAMAIS une nouvelle vente — il
 * ouvre la correction. « Annule » annule l'ÉTAPE (la ligne provisoire), pas le
 * panier. Ce module ne renvoie donc jamais « vendre » : il ne produit que des
 * intentions de réponse. La détection d'une nouvelle vente (état PRÊT) reste le
 * rôle de `extraction.extraire`.
 *
 * Réutilise le parseur de nombres français de `voice-offline/extraction`.
 * Testé au tsx (`npm run test:correction`), sans micro ni navigateur.
 */
import { extraire } from '../voice-offline/extraction.js';

export type IntentionReponse =
  | { type: 'confirmation' }                                   // « oui », « c'est bon », « c'est ça »
  | { type: 'refus' }                                          // « non » seul → ouvre la correction
  | { type: 'annulation' }                                     // « annule » → oublie la ligne (pas le panier)
  | { type: 'suppression' }                                    // « enlève [les tomates] »
  | { type: 'article-suivant' }                                // « j'ajoute », « autre chose »
  | { type: 'encaisser' }                                      // « encaisse », « c'est tout »
  | { type: 'correction-quantite'; quantite: number }         // « non, deux », « c'est deux tas »
  | { type: 'correction-prix'; montant: number; mode: 'unitaire' | 'total' } // « à 400 », « le tout à 1000 »
  | { type: 'ambigu' };                                        // hors grammaire → question ciblée, jamais d'action

function normaliser(texte: string): string {
  return (texte || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, "'")
    .replace(/[.,!?;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function contientMot(texte: string, mots: string[]): boolean {
  return mots.some(m => new RegExp(`(^| )${m}( |$)`).test(texte));
}
function contient(texte: string, fragments: string[]): boolean {
  return fragments.some(f => texte.includes(f));
}

const MOTS_ANNULE = ['annule', 'annuler', 'recommence', 'recommencer', 'oublie', 'oublier', 'laisse tomber'];
const MOTS_SUPPRIME = ['enleve', 'enlever', 'retire', 'retirer', 'supprime', 'supprimer', 'jette', 'jeter'];
const MOTS_ENCAISSE = ['encaisse', 'encaisser', 'termine', 'terminer', 'fini', 'finir', "c'est tout", "c'est fini", 'termine la'];
const MOTS_SUIVANT = ["j'ajoute", 'autre chose', 'autre article', 'encore un', 'un autre', 'aussi', 'et aussi', 'ajoute autre'];
const MOTS_REFUS = ['non', 'pas ca', "c'est pas ca", "c'est faux", 'faux', 'pas bon', "c'est pas bon", 'errone', 'erreur'];
const MOTS_CONFIRME = ['oui', "c'est bon", "c'est ca", "c'est exact", 'voila', 'exact', 'ok', 'okay', "d'accord", 'daccord', 'parfait', 'bon'];
const MOTS_TOTAL = ['le tout', 'au total', 'en tout', 'tout ca', 'ensemble', 'pour les', 'les deux', 'les trois'];

/**
 * Interprète une réponse en état « confirmation attendue / correction ».
 * L'ordre des tests encode la priorité §4 : intentions explicites d'abord, puis
 * corrections chiffrées, puis refus/confirmation, sinon ambigu.
 */
export function interpreterReponse(texteBrut: string): IntentionReponse {
  const t = normaliser(texteBrut);
  if (!t) return { type: 'ambigu' };

  // 1. Intentions explicites (priment sur tout, y compris un « non » en tête).
  if (contientMot(t, MOTS_ANNULE) || contient(t, ['laisse tomber'])) return { type: 'annulation' };
  if (contientMot(t, MOTS_SUPPRIME)) return { type: 'suppression' };
  if (contientMot(t, MOTS_ENCAISSE) || contient(t, ["c'est tout", "c'est fini"])) return { type: 'encaisser' };
  if (contient(t, MOTS_SUIVANT)) return { type: 'article-suivant' };

  // 2. Corrections chiffrées — le parseur français fait foi pour le nombre.
  const ex = extraire(t);
  const aMarqueurPrix = contient(t, ['prix']) || contientMot(t, ['francs', 'franc', 'cfa']) || /(^| )a \d/.test(t) || / a (un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|cent|mille)/.test(t);

  // `extraire` range un nombre NU (sans marqueur) dans `montant` faute de produit.
  // On récupère donc le nombre où qu'il soit ; c'est le MARQUEUR PRIX qui décide
  // du sens, pas l'emplacement.
  const nombre = ex.quantite ?? ex.montant;

  // Prix : « à 400 [francs] », « le prix c'est mille », « le tout à 1000 ».
  if (aMarqueurPrix && nombre != null && nombre > 0) {
    const mode: 'unitaire' | 'total' = contient(t, MOTS_TOTAL) ? 'total' : 'unitaire';
    return { type: 'correction-prix', montant: nombre, mode };
  }

  // Sans marqueur de prix, un nombre nu est une QUANTITÉ (« non, deux » = 2 unités).
  if (nombre != null && nombre > 0) {
    return { type: 'correction-quantite', quantite: nombre };
  }

  // 3. Refus sans nombre → ouvre la correction (JAMAIS une vente).
  if (contientMot(t, MOTS_REFUS) || contient(t, ["c'est pas ca", "c'est pas bon", 'pas ca'])) {
    return { type: 'refus' };
  }
  // 4. Confirmation.
  if (contientMot(t, MOTS_CONFIRME) || contient(t, ["c'est bon", "c'est ca", "c'est exact", "d'accord"])) {
    return { type: 'confirmation' };
  }
  // 5. Hors grammaire.
  return { type: 'ambigu' };
}
