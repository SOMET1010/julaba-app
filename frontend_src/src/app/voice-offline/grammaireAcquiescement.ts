/**
 * DIRE OUI, DIRE NON — une seule grammaire, déclarée, et par langue. VOIX-08.
 *
 * LE DÉFAUT QU'ON FERME, ET IL EST SUR L'ARGENT.
 *
 * `useVoiceCore.interpretYesNo` portait sa propre liste de mots, écrite en dur
 * dans le hook. Elle décidait seule de ce qui vaut OUI quand Tata demande
 * « c'est bien ça ? » — et un OUI appelle `confirmAction` : la vente part.
 *
 * Or le dépôt DÉCLARE déjà cette grammaire : `INT_LIGNE_CONFIRMATION` et
 * `INT_LIGNE_REFUS`, marquées `critiqueArgent`, déclinables par locale dans
 * `locales/<code>/intents.ts`. Deux vérités pour le même acte, et c'est la
 * non-déclarée qui tranchait. Une langue pouvait déclarer ses variantes : la
 * confirmation vocale ne les aurait jamais lues.
 *
 * ET LA LISTE EN DUR ÉTAIT FAUSSE. Elle acceptait « ca » et « ça » ISOLÉS.
 * Mesuré, en état de confirmation :
 *
 *     « ça fait combien ? »  →  OUI  →  la vente est validée
 *     « ça va »              →  OUI
 *     « bon alors »          →  OUI
 *
 * Elle pose une question, on encaisse. Le repli prévu (« Dis oui pour valider,
 * ou non pour annuler », deux fois, puis les boutons) est bien conçu — il ne
 * se déclenchait simplement jamais, parce que le doute était déjà compté OUI.
 *
 * LA RÈGLE QUI GOUVERNE CE MODULE : sur une confirmation d'argent, le doute ne
 * profite JAMAIS au oui. Un mot ambigu doit rendre `null` — « pas clair » — et
 * laisser le repli faire son travail. Rendre OUI par excès de zèle valide une
 * vente à sa place ; rendre `null` lui coûte une phrase.
 *
 * Le refus, lui, reste large : c'est déjà la doctrine de `localIntent`
 * (« l'annulation est large par choix : le doute profite au refus »).
 */
import { compilerMotif, localeActive, normaliserReference, variantesIntention }
  from '../i18n/voice/runtime';
import type { LocaleCode } from '../i18n/voice/types';

/** Une expression qui ne reconnaît rien — si une langue n'a aucune variante. */
const RIEN = /(?!)/;

type Normaliser = (texte: string) => string;
interface Reconnaisseur { motif: RegExp; normaliser: Normaliser }

function reconnaisseur(id: 'INT_LIGNE_CONFIRMATION' | 'INT_LIGNE_REFUS', locale: LocaleCode): Reconnaisseur {
  const v = variantesIntention(id, locale);
  return {
    motif: v && v.variantes.mode === 'motif' ? compilerMotif(v.variantes) : RIEN,
    normaliser: v?.normaliser ?? normaliserReference,
  };
}

/**
 * « oui », « non », ou `null` quand ce n'est pas clair.
 *
 * LE NON EST TESTÉ D'ABORD, et ce n'est pas un détail d'implémentation :
 * « ça c'est pas bon » contient de quoi être lu des deux côtés. Le refus gagne,
 * parce qu'un refus mal compris coûte une répétition et un oui mal compris
 * coûte une vente.
 */
export function acquiescement(texte: string, locale: LocaleCode = localeActive()): 'oui' | 'non' | null {
  const brut = (texte || '').trim();
  if (!brut) return null;
  const non = reconnaisseur('INT_LIGNE_REFUS', locale);
  if (non.motif.test(non.normaliser(brut))) return 'non';
  const oui = reconnaisseur('INT_LIGNE_CONFIRMATION', locale);
  if (oui.motif.test(oui.normaliser(brut))) return 'oui';
  return null;
}
