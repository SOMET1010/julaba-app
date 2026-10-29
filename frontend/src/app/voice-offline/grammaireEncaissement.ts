// ──────────────────────────────────────────────────────────────────────────
// GRAMMAIRE D'ENCAISSEMENT — VOIX-01, lot C. Module PUR, hors ligne d'abord.
//
// CE QU'ON OUVRE. Jusqu'ici, « encaisse » ne voulait rien dire pour JULABA :
// mesuré sur `cc26647`, les phrases « encaisse », « on encaisse »,
// « combien elle doit », « oui valide » renvoyaient TOUTES `null` — c'est-à-dire
// « Je n'ai pas bien compris ». La voix savait remplir un panier, pas le
// terminer.
//
// CE QUE CE MODULE NE FAIT PAS, ET NE DOIT JAMAIS FAIRE. Il ne décide de rien.
// Il ne connaît ni le panier, ni le total, ni le montant reçu. Reconnaître
// « oui valide » n'autorise AUCUN paiement : c'est `machineEncaissement.ts`
// qui détient la seule porte vers l'argent, et elle exige de retrouver
// exactement l'état financier que Tata vient de relire.
//
// LA SÉVÉRITÉ EST LE SUJET, PAS UN DÉTAIL. Au marché, il y a du bruit, des
// clientes qui parlent, et la reconnaissance vocale se trompe. Les interdits
// suivants sont donc des règles, pas des préférences :
//
//   « oui » seul            → rien
//   « d'accord »            → rien
//   « valide » seul         → rien
//   « oui valide » AU MILIEU D'AUTRE CHOSE → rien
//
// LA VALIDATION EST UNE LISTE BLANCHE FERMÉE (VOIX-02, décision de Patrick
// du 20/09/2026). La première version cherchait « oui … valide » quelque
// part dans la phrase : « oui je valide pas » devenait une validation, et
// après relecture, un REFUS écrivait de l'argent — le montant était bien
// celui relu, l'esprit du critère était contredit. On n'a pas rajouté « pas »
// à une liste de négations : il y aurait toujours eu la phrase suivante
// (« oui valide la dépense », « ma cliente a dit oui valide », « oui je
// valide mon panier plus tard »). Une phrase qui écrit de l'argent se
// reconnaît par sa FORME EXACTE, pas par des mots qui traînent : la phrase
// ENTIÈRE, normalisée, doit être l'une des réponses autonomes ci-dessous —
// rien avant, rien après. La liste est courte, faite de ce qui se dit
// réellement, et on s'arrête là : l'agrandir, c'est agrandir la surface
// par laquelle un bruit peut payer.
//
// MONTANT REÇU : HORS PÉRIMÈTRE DU PILOTE (arbitrage du 20/09/2026). « Il m'a
// donné cinq mille » n'est volontairement PAS reconnu. Le montant reçu se
// saisit en billets, au doigt, parce qu'un chiffre financier dicté dans le
// bruit est exactement le genre d'erreur qu'on ne veut pas découvrir le soir.
// ──────────────────────────────────────────────────────────────────────────

import { compilerMotif, localeActive, normaliserReference, variantesIntention } from '../i18n/voice/runtime';
import type { LocaleCode } from '../i18n/voice/types';

export type IntentionEncaissement =
  /** « encaisse » — PRÉPARE l'encaissement. N'écrit jamais d'argent. */
  | 'encaisser'
  /** « combien elle doit » — lecture seule, à voix haute. */
  | 'combien_doit'
  /** « oui, valide » — la SECONDE phrase, celle qui peut confirmer. */
  | 'oui_valide'
  /** « non », « annule » — abandonne la confirmation en cours. */
  | 'annuler_validation';

/**
 * LA LISTE DE RÉFÉRENCE, en un seul endroit. Le micro de la caisse doit
 * déclarer ces quatre intentions dans DEUX listes du moteur vocal (dispense de
 * confirmation orale, exécution immédiate hors ligne) : une intention oubliée
 * dans l'une des deux ne casserait rien de visible — elle serait juste mise
 * en file ou parlée deux fois. On les écrit ici, et nulle part ailleurs.
 */
export const INTENTIONS_ENCAISSEMENT: readonly IntentionEncaissement[] =
  ['encaisser', 'combien_doit', 'oui_valide', 'annuler_validation'];

/** Vrai si `type` (un `action.type` du moteur vocal) est une intention d'encaissement. */
export function estIntentionEncaissement(type: string): type is IntentionEncaissement {
  return (INTENTIONS_ENCAISSEMENT as readonly string[]).includes(type);
}

// ── LES VARIANTES SONT DES DONNÉES DE LANGUE (lot langues, 20/09/2026) ────
// Les quatre listes qui vivaient ici (liste blanche de validation, annulation,
// préparation, question) ont DÉMÉNAGÉ, à l'identique, dans
// i18n/voice/locales/fr-ci/intents.ts. Ce module garde la LOGIQUE — l'ordre
// des tests, la phrase entière ou rien, le doute qui profite au refus — et la
// lit pour la langue demandée. Une langue sans variantes validées pour
// l'argent retombe sur celles de fr-ci, tracé (runtime.variantesIntention).
// Preuve que rien n'a bougé pour le français : empreintesArgent.mts
// (empreinte `grammaire` identique à 576fd62 sur ~900 phrases).
//
// Normalisation : celle de la locale (fr-ci : minuscules, sans accents,
// ponctuation aplatie, bordée d'espaces — la reconnaissance vocale est
// irrégulière sur les accents, la détection ne doit jamais en dépendre).

type Normaliser = (texte: string) => string;

/**
 * Chaque intention porte SA normalisation : celle de la locale qui a servi ses
 * variantes (I18N-01, contre-audit du 20/09/2026). Avec la préférence
 * « dioula » et une locale dyu-ci sans intentions validées, les variantes
 * viennent de fr-ci — et doivent être comparées avec la normalisation de
 * fr-ci, pas avec celle de dyu-ci (qui remplace tout [^a-z0-9] par un espace
 * et cassait « oui c'est bon valide »). La normalisation n'est jamais celle de
 * la locale DEMANDÉE ; en fr-ci, les quatre sont la référence : comportement
 * identique à 576fd62 (empreinte `grammaire`, calculée par locale).
 */
interface Reconnaisseurs {
  /** Liste blanche FERMÉE : la phrase entière normalisée, ou rien. */
  validation: { liste: ReadonlySet<string>; normaliser: Normaliser };
  annulation: { motif: RegExp; normaliser: Normaliser };
  encaisser: { motif: RegExp; normaliser: Normaliser };
  combienDoit: { motif: RegExp; normaliser: Normaliser };
}

/** Une expression qui ne reconnaît rien : ce qu'on obtient si une langue n'a AUCUNE variante, même en repli. */
const RIEN = /(?!)/;

function reconnaisseurs(locale: LocaleCode): Reconnaisseurs {
  const motif = (id: 'INT_ANNULER_VALIDATION' | 'INT_ENCAISSER' | 'INT_COMBIEN_DOIT') => {
    const v = variantesIntention(id, locale);
    return {
      motif: v && v.variantes.mode === 'motif' ? compilerMotif(v.variantes) : RIEN,
      normaliser: v?.normaliser ?? normaliserReference,
    };
  };
  const v = variantesIntention('INT_OUI_VALIDE', locale);
  return {
    // Une liste blanche est OBLIGATOIREMENT en mode phrase entière : tout autre
    // mode ne valide rien (validateCriticalMessages l'interdit en amont).
    validation: {
      liste: v && v.variantes.mode === 'phrase_entiere' ? new Set(v.variantes.phrases) : new Set<string>(),
      normaliser: v?.normaliser ?? normaliserReference,
    },
    annulation: motif('INT_ANNULER_VALIDATION'),
    encaisser: motif('INT_ENCAISSER'),
    combienDoit: motif('INT_COMBIEN_DOIT'),
  };
}

/**
 * Reconnaît une intention d'encaissement dans une phrase dictée.
 * `null` = ce n'est pas une phrase d'encaissement ; l'appelant continue son
 * parcours normal (vente, dépense, question…).
 */
export function detecterEncaissement(texte: string, locale: LocaleCode = localeActive()): IntentionEncaissement | null {
  if (!texte || !texte.trim()) return null;
  const r = reconnaisseurs(locale);

  // L'ANNULATION PASSE AVANT TOUT. « non, pas valide » contient « valid » :
  // si la validation était testée d'abord, un refus deviendrait un paiement.
  // C'est l'ordre de ces deux blocs qui rend ce module sûr.
  if (r.annulation.motif.test(r.annulation.normaliser(texte))) return 'annuler_validation';

  // La phrase ENTIÈRE, ou rien. « oui je valide pas », « oui valide la
  // dépense », « ma cliente a dit oui valide » ne sont dans aucune liste :
  // elles ne valent rien ici, et retombent en « je n'ai pas compris ».
  if (r.validation.liste.has(r.validation.normaliser(texte).trim())) return 'oui_valide';

  if (r.encaisser.motif.test(r.encaisser.normaliser(texte))) return 'encaisser';

  if (r.combienDoit.motif.test(r.combienDoit.normaliser(texte))) return 'combien_doit';

  return null;
}
