/**
 * detecterIntention(transcript, locale) — l'entrée STT générique.
 *
 * Rend l'intention du CATALOGUE (`INT_*`) reconnue dans une phrase dictée,
 * avec le résultat local complet (même forme que le moteur vocal). La
 * reconnaissance elle-même reste dans voice-offline/localIntent.ts (grammaire
 * d'encaissement en premier, puis extraction) : ce module ne fait que lui
 * passer la langue et nommer le résultat. Aucun composant n'a besoin de
 * connaître `dyu-ci` ou `bci` : il passe la langue active, ou rien.
 */
import { intentLocal, type LocalVoiceResult } from '../../voice-offline/localIntent';
import { INTENTIONS_STT } from './catalog';
import { localeActive } from './runtime';
import type { IntentId, LocaleCode } from './types';

/** action.type du moteur → identifiant d'intention du catalogue. */
const ID_PAR_ACTION: ReadonlyMap<string, IntentId> = new Map(
  INTENTIONS_STT
    .filter((i) => ['encaisser', 'combien_doit', 'oui_valide', 'annuler_validation', 'vendre', 'depense'].includes(i.action))
    .map((i) => [i.action, i.id]),
);

export interface IntentionDetectee {
  id: IntentId;
  action: string;
  resultat: LocalVoiceResult;
}

export function detecterIntention(transcript: string, locale: LocaleCode = localeActive()): IntentionDetectee | null {
  const resultat = intentLocal(transcript, locale);
  if (!resultat) return null;
  const id = ID_PAR_ACTION.get(resultat.action.type);
  if (!id) return null;
  return { id, action: resultat.action.type, resultat };
}
