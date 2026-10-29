// ──────────────────────────────────────────────────────────────────────────
// LES COMMANDES DE LA CONFIRMATION DU NUMÉRO — parcours « voix seule ».
//
// L'AUDIT QUI OUVRE CE FICHIER (rapport remis par Patrick, 26/10) : le
// parcours audio est cohérent jusqu'à la dictée, MAIS « après la dictée du
// numéro, la confirmation demande encore de toucher "C'est mon numéro" » et
// « il n'existe pas encore de reconnaissance de commandes vocales comme
// "oui", "c'est mon numéro" ou "utiliser les chiffres" ». Pour celle qui ne
// sait ni lire ni écrire, un bouton nommé uniquement par un clignotement
// reste une impasse si la voix ne peut pas y répondre.
//
// LA DÉCISION : après le rappel de confirmation, l'écran ÉCOUTE. Cette
// fonction est la grammaire de CETTE écoute — pure, sans React, sans micro.
// Le mécanisme (moteur, anti-écho, fenêtre) vit dans
// `hooks/useCommandesVocales` ; la politique (clips, actions) reste dans
// l'écran — même frontière que `useDicteeLive`.
//
// LA GRAMMAIRE DÉCLARÉE D'ABORD. Le oui/non ne se réinvente PAS ici : le
// dépôt déclare déjà `INT_LIGNE_CONFIRMATION` / `INT_LIGNE_REFUS` par locale
// (`grammaireAcquiescement.acquiescement`), avec la doctrine VOIX-08 — le
// doute ne profite jamais au oui. On branche dessus, puis on ajoute SEULEMENT
// les phrases propres à CET acte : « c'est mon numéro » (le nom du bouton,
// dit à voix haute), le redit (« recommence »), et le pavé nommé (« les
// chiffres »). Toute phrase ambiguë rend `null` — l'écoute continue, le
// bouton clignotant reste le filet.
// ──────────────────────────────────────────────────────────────────────────

import { acquiescement } from './grammaireAcquiescement';
import type { LocaleCode } from '../i18n/voice/types';

/** Ce que l'écran peut faire quand la réponse est comprise. */
export type CommandeNumero = 'confirmer' | 'redire' | 'clavier';

/** Même normalisation que `entreeVoix` (minuscules, sans accents ni ponctuation). */
function normaliser(texte: string): string {
  return (texte || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Le redit, LARGE : « recommence », « refais », « redis » — et leurs infinitifs.
// C'est le même parti pris que le refus de `grammaireCorrection` : se tromper
// de côté ici coûte une dictée de plus, jamais une confirmation fausse.
const REDIRE = /\b(recommence|recommencer|refais|refaire|redis|redire|redisons|encore une fois)\b/;

// Les phrases propres au numéro — le nom du bouton dit à voix haute.
// « c'est pas mon numéro » est déjà attrapé PLUS HAUT par le refus déclaré
// (« pas »), qui est testé en premier : l'ordre ci-dessous ne peut pas le
// transformer en confirmation.
const CONFIRMER_NUMERO = /\b(mon numero|je confirme|confirme[rz]?|vas y|valide[rz]?|on avance|on continue)\b/;

// Le pavé, nommé par la voix — « utiliser les chiffres » de l'audit.
const CLAVIER = /\b(chiffres?|clavier|taper|tapes|tape)\b/;

/**
 * « oui » → `confirmer` ; « non » / « recommence » → `redire` ; « les
 * chiffres » → `clavier` ; `null` quand ce n'est pas clair.
 *
 * L'ORDRE ENCODE LA DOCTRINE (même fil que `acquiescement`, VOIX-08) :
 *   1. le refus déclaré (« non », « pas », « c'est pas bon »…) — il gagne sur
 *      tout, car « c'est pas mon numéro » contient aussi « mon numéro » ;
 *   2. le redit explicite — « oui mais recommence » veut dire REFAIRE ;
 *   3. l'acquittement déclaré (« oui », « ouais », « c'est bon », « d'accord »…) ;
 *   4. les phrases du numéro (« c'est mon numéro », « je confirme »…) ;
 *   5. le pavé (« chiffres », « clavier », « tape »).
 * Une dictée parasite (« zéro sept zéro… ») ne matche rien : `null`, l'écoute
 * continue.
 */
export function intentionConfirmationNumero(
  texte: string,
  locale?: LocaleCode,
): CommandeNumero | null {
  const brut = (texte || '').trim();
  if (!brut) return null;
  const reponse = acquiescement(brut, locale);
  if (reponse === 'non') return 'redire';
  const t = normaliser(brut);
  if (REDIRE.test(t)) return 'redire';
  if (reponse === 'oui') return 'confirmer';
  if (CONFIRMER_NUMERO.test(t)) return 'confirmer';
  if (CLAVIER.test(t)) return 'clavier';
  return null;
}

// ──────────────────────────────────────────────────────────────────────────
// LES COMMANDES DE L'ENTRÉE — écrans 1 et 2 du parcours (Akwaba, présentation
// de Tantie). Le second volet du même audit (rapport Patrick, 26/10) : « il
// n'existe pas de commande vocale du type "Entrer", "Commencer", "Continuer" »
// — l'accueil se disait mais ne S'ÉCOUTAIT pas ; une personne qui ne sait pas
// lire devait deviner quel bouton toucher. L'écran d'entrée ne connaît que
// DEUX réponses : AVANCER (entrer/commencer/continuer — et « oui » déclaré,
// l'acquiescement faisant déjà foi) et FAIRE REJOUER (répète/réécouter).
// « Non » ne mène nulle part ici : elle ne veut pas encore avancer — l'écoute
// se poursuit jusqu'au bout de la fenêtre, le bouton reste là.
// ──────────────────────────────────────────────────────────────────────────

/** Ce que l'écran d'entrée peut faire quand la réponse est comprise. */
export type CommandeEntree = 'entrer' | 'repeter';

// Avancer — large mais SANS ambiguïté : les verbes de l'action nommée dans
// le clip (« entrer »), les variantes naturelles de la même intention.
const AVANCER = /\b(entree?|entrer|commence[rz]?|continue[rz]?|avancer?|avance|on y va|c est parti|cest parti|aller y|allons y|d ?accord|d ?ac)\b/;

// Faire rejouer — le même parti pris que REDIRE : se tromper de côté coûte
// une écoute de plus, jamais une avancée fausse. « encore » seul → rejouer,
// MAIS « pas encore » ne rejoue RIEN (le refus déclaré gagne — même fil que
// « c'est pas mon numéro ») : le lookbehind retire ce piège-là seul.
const REJOUER = /\b(repete[rz]?|repete|reecoute[rz]?|rejoue[rz]?|(?<!pas )encore|redis|redire|refais|refaire|recommence[rz]?)\b/;

/**
 * « entrer » / « continuer » / « oui » → `entrer` ; « répète » / « réécouter »
 * → `repeter` ; le doute (une phrase du marché, un « non » seul) → `null`,
 * l'écoute continue. L'ORDRE ENCODE LA DOCTRINE : rejouer d'abord —
 * « non, répète » veut dire REJOUER, jamais avancer.
 */
export function intentionEntree(texte: string, locale?: LocaleCode): CommandeEntree | null {
  const brut = (texte || '').trim();
  if (!brut) return null;
  const t = normaliser(brut);
  if (REJOUER.test(t)) return 'repeter';
  const reponse = acquiescement(brut, locale);
  if (reponse === 'oui') return 'entrer';
  if (AVANCER.test(t)) return 'entrer';
  return null;
}

// ──────────────────────────────────────────────────────────────────────────
// LA RÉPONSE À UNE QUESTION FERMÉE — la proposition de reconnaissance
// (« Veux-tu que ton téléphone te reconnaisse la prochaine fois ? »). La
// question se DIT (accueil marchand) ; la réponse doit pouvoir se DIRE aussi.
// ICI LE DOUTE NE PROFITE NI AU OUI NI AU NON : un faux « oui » ouvre un
// enrôlement inutile ; un faux « non » mémorise un refus DÉFINITIF
// (`propositionRefusee`) — le pire des deux. Seule une réponse claire passe.
// ──────────────────────────────────────────────────────────────────────────

/** La réponse claire à une question fermée. */
export type ReponseOuiNon = 'oui' | 'non';

// Le refus, dit avec des mots — même fil que le lot A : « pas maintenant »,
// « jamais », une annulation. Vérifié AVANT le oui (« oui mais pas
// maintenant » ne doit pas enrôler).
const REFUS_MOTS = /\b(non|jamais|pas maintenant|pas besoin|pas envie|pas aujourd hui|annule[rz]?|arrete[rz]?)\b/;

export function intentionOuiNon(texte: string, locale?: LocaleCode): ReponseOuiNon | null {
  const brut = (texte || '').trim();
  if (!brut) return null;
  const reponse = acquiescement(brut, locale);
  if (reponse === 'non') return 'non';
  const t = normaliser(brut);
  const refusClair = REFUS_MOTS.test(t);
  if (reponse === 'oui') return refusClair ? null : 'oui';
  if (refusClair) return 'non';
  return null;
}
