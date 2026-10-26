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
