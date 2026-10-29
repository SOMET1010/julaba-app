/**
 * LE DÉCOR DIOULA D'UN BUILD D'ESSAI — construit, jamais écrit.
 *
 * D'OÙ VIENNENT LES PHRASES. D'UNE SEULE SOURCE, déjà dans le dépôt :
 * `texteDyu` de services/loginVoiceScript.ts — une traduction DE TRAVAIL,
 * non validée par une locutrice native, gardée pour préparer un futur
 * enregistrement. Aucune phrase n'est écrite ici, aucune n'est complétée au
 * jugé, aucune n'est inventée. Si une phrase manque en dioula, elle manque :
 * la clé retombe sur fr-ci, et le repli est tracé comme n'importe quel autre.
 * « On dit qu'il manque, on ne comble pas » — la règle du projet sur les
 * langues, appliquée telle quelle.
 *
 * LE FILTRE EST LE SUJET. Ce que ce module ÉCARTE compte plus que ce qu'il
 * garde, et l'ordre des exclusions est la spécification que Manus devra tenir
 * le jour où il livrera le vrai décor :
 *
 *   1. la catégorie CHIFFRES (NUM_0 … NUM_9) — ce SONT les nombres dioula non
 *      validés, la matière même du risque. Écartés NOMMÉMENT, jamais par
 *      accident, et même quand le second drapeau est allumé : un build d'essai
 *      peut vouloir écouter une phrase d'argent, il n'a aucune raison de
 *      vouloir écouter un chiffre nu, qui est justement ce qu'on ne sait pas
 *      encore dire sans ambiguïté (francs ou dɔrɔmɛ) ;
 *   2. les clés `critiqueArgent` — écartées SAUF si le build a explicitement
 *      allumé la dérogation d'essai (voir `DYU_ARGENT_DE_TEST`) ;
 *   3. les clés absentes du catalogue, et les gabarits À VARIABLES : un
 *      gabarit dioula doit porter toutes ses variables et personne ne les a
 *      vérifiées — et une variable de montant ramènerait un nombre dans une
 *      phrase dioula par la porte de derrière.
 *
 * LA VALIDATION RESTE VRAIE. Chaque message produit ici est étiqueté
 * `{ linguistique: 'draft', finance: false }`, y compris sous le second
 * drapeau. C'est la vérité : personne n'a validé ces phrases. On ne maquille
 * pas une donnée pour faire passer un essai — la dérogation est écrite là où
 * elle s'exerce (runtime.ts, voixParLocale.ts), elle se voit, et elle crie.
 */
import { entreeTts } from '../../catalog';
import type { MessageId, MessageLocalise } from '../../types';
import { SCRIPT_TATA } from '../../../../services/loginVoiceScript';

/** Une phrase écartée, et pourquoi — pour que le diagnostic puisse le dire. */
export interface PhraseEcartee { id: string; raison: string }

export interface DecorDioula {
  messages: Record<MessageId, MessageLocalise>;
  ecartees: PhraseEcartee[];
}

/**
 * Le décor dioula servable par un build.
 *
 * @param embarquee  le premier drapeau : sans lui, rien du tout — `dyu-ci`
 *                   reste le squelette vide du lot B7.
 * @param avecArgent le second : les clés `critiqueArgent` qui ont une
 *                   traduction dioula entrent aussi. Les chiffres, jamais.
 */
export function decorDioula(embarquee: boolean, avecArgent: boolean): DecorDioula {
  const messages: Record<MessageId, MessageLocalise> = {};
  const ecartees: PhraseEcartee[] = [];
  if (!embarquee) return { messages, ecartees };
  for (const phrase of SCRIPT_TATA) {
    if (phrase.categorie === 'CHIFFRES') { ecartees.push({ id: phrase.id, raison: 'nombre dioula non validé' }); continue; }
    const texte = phrase.texteDyu?.trim();
    if (!texte) { ecartees.push({ id: phrase.id, raison: 'pas de traduction dioula' }); continue; }
    const entree = entreeTts(phrase.id);
    if (!entree) { ecartees.push({ id: phrase.id, raison: 'absente du catalogue' }); continue; }
    if (entree.critiqueArgent && !avecArgent) { ecartees.push({ id: phrase.id, raison: 'critiqueArgent' }); continue; }
    if (entree.variables.length > 0) { ecartees.push({ id: phrase.id, raison: 'gabarit à variables' }); continue; }
    messages[phrase.id] = { template: texte, validation: { linguistique: 'draft', finance: false } };
  }
  return { messages, ecartees };
}
