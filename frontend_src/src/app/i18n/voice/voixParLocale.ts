/**
 * QUELLE VOIX DIT CE MESSAGE — et pourquoi l'argent reste en français.
 *
 * LA RÈGLE, EN UNE PHRASE : la voix suit la locale RÉELLEMENT SERVIE
 * (`message.locale`), jamais la locale demandée (`message.localeDemandee`).
 *
 * C'est tout, et c'est suffisant. Le runtime i18n refuse déjà de servir une
 * clé `critiqueArgent` depuis une locale dont la validation n'est pas
 * `finance: true` : il replie sur fr-ci et le trace. Un message d'argent
 * arrive donc ici DÉJÀ étiqueté `locale: 'fr-ci'`, et la voix française suit
 * mécaniquement. On ne réimplémente pas la règle d'argent, on s'appuie
 * dessus — une deuxième règle serait une deuxième occasion de diverger, et
 * c'est exactement ce que la doctrine du projet interdit sur l'argent.
 *
 * ET POURTANT IL Y A UNE SECONDE BARRIÈRE, `voixPeutDireArgent`. Elle ne
 * duplique pas la règle : elle en REFUSE LE CONTOURNEMENT. Si un jour du code
 * fabrique un `MessageVocal` à la main (un rejeu, un cache, une
 * « optimisation » qui garde la locale demandée), la voix dioula ne partira
 * quand même pas sur un montant. On préfère un filet inutile à un montant faux
 * dit avec autorité à une femme qui ne peut pas le relire.
 *
 * COMMENT ON SAIT QU'UNE LANGUE EST VALIDÉE SUR L'ARGENT : on le DEMANDE au
 * moteur, on ne le déclare pas. Une langue peut dire l'argent quand le moteur
 * lui sert TOUTES les clés critiques du catalogue depuis elle-même. Tant
 * qu'une seule retombe sur fr-ci, la langue n'est pas prête, et sa voix ne
 * touche pas à l'argent. Le jour où deux locutrices auront validé les 110
 * nombres et que Manus aura posé les gabarits, ce fichier n'aura pas une
 * ligne à changer : la réponse basculera toute seule.
 *
 * CE QUE CE MODULE NE FAIT PAS : il ne produit aucun son et ne connaît ni
 * clip, ni pack, ni prosodie — ce chemin appartient à Manus
 * (`contrat-audio.ts`). Il rend un NOM de voix, que le plugin natif Android
 * sait résoudre en un dossier d'assets (SherpaTtsPlugin.VOIX).
 */
import { entreeTts, MESSAGES_CRITIQUES } from './catalog';
import { resoudreMessage, type MessageVocal } from './runtime';
import { LOCALE_REFERENCE, type LocaleCode } from './types';

/** Une voix de synthèse installable sur le téléphone. */
export interface VoixSynthese {
  /** Nom passé au plugin natif. Doit exister dans SherpaTtsPlugin.VOIX. */
  id: string;
  /** La langue que cette voix parle. */
  locale: LocaleCode;
}

/** Le français : la voix de référence, la seule qui dise l'argent aujourd'hui. */
export const VOIX_REFERENCE: VoixSynthese = { id: 'fr', locale: LOCALE_REFERENCE };

/** Le dioula (MMS). Absent d'un build ordinaire — voir JULABA_VOIX_DYU. */
export const VOIX_DYU: VoixSynthese = { id: 'dyu', locale: 'dyu-ci' };

const VOIX_PAR_LOCALE: Readonly<Record<LocaleCode, VoixSynthese>> = Object.freeze({
  [LOCALE_REFERENCE]: VOIX_REFERENCE,
  'dyu-ci': VOIX_DYU,
});

/** La voix installée pour une locale, ou la référence si la langue n'en a pas. */
export function voixPourLocale(locale: LocaleCode): VoixSynthese {
  return VOIX_PAR_LOCALE[locale] ?? VOIX_REFERENCE;
}

// La réponse ne change pas tant que les données ne changent pas ; on ne
// reparcourt pas le catalogue à chaque phrase dite.
const memoireArgent = new Map<LocaleCode, boolean>();

/**
 * Cette voix a-t-elle le droit de prononcer un MONTANT ?
 * Oui seulement si le moteur sert TOUTES les clés critiques argent depuis la
 * langue de cette voix. Le français est la référence : il les sert par
 * construction.
 */
export function voixPeutDireArgent(voix: VoixSynthese): boolean {
  const connu = memoireArgent.get(voix.locale);
  if (connu !== undefined) return connu;
  const reponse = MESSAGES_CRITIQUES.every(
    (id) => resoudreMessage(id, {}, voix.locale).locale === voix.locale,
  );
  memoireArgent.set(voix.locale, reponse);
  return reponse;
}

/** Réarme le cache. Réservé aux tests — aucun appel en production. */
export function __oublierValidationsArgent(): void {
  memoireArgent.clear();
}

/** Pourquoi la voix n'est pas celle de la langue demandée. */
export type RaisonVoix = 'langue' | 'repli-i18n' | 'argent-non-valide';

export interface ChoixVoix {
  voix: VoixSynthese;
  /**
   * `langue` : la voix de la langue demandée ;
   * `repli-i18n` : le moteur avait déjà replié le message (clé absente) ;
   * `argent-non-valide` : la clé est un cas d'argent et la langue n'est pas
   *   validée dessus — le filet a joué, et il faut le TRACER, pas le taire.
   */
  raison: RaisonVoix;
}

/**
 * La voix qui doit dire ce message, et pourquoi.
 * Ne jette jamais : une clé inconnue est du décor par défaut, et une voix
 * absente du téléphone retombe sur le français côté plugin.
 */
export function choisirVoix(message: MessageVocal): ChoixVoix {
  const voix = voixPourLocale(message.locale);
  const critique = entreeTts(message.id)?.critiqueArgent ?? false;
  if (critique && !voixPeutDireArgent(voix)) {
    return { voix: VOIX_REFERENCE, raison: 'argent-non-valide' };
  }
  if (message.locale !== message.localeDemandee) return { voix, raison: 'repli-i18n' };
  return { voix, raison: 'langue' };
}

/** La voix, tout simplement. */
export function voixPourMessage(message: MessageVocal): VoixSynthese {
  return choisirVoix(message).voix;
}
