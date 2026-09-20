/**
 * fr-ci — MANIFEST. Français du marché ivoirien : la locale de RÉFÉRENCE et
 * de REPLI de toutes les autres. Aucun `fallback` (le registre le refuse).
 *
 * `voix` reste vide : le rendu actuel est le chemin `speak` existant
 * (contrat-audio.ts, RENDU_PAR_DEFAUT) ; l'association langue → voix est une
 * donnée que Manus posera ici.
 */
import type { ManifestLocale } from '../../types';
import { MESSAGES_FR_CI } from './messages';
import { INTENTS_FR_CI } from './intents';
import { LEXIQUE_FR_CI } from './lexicon';

export const FR_CI: ManifestLocale = {
  code: 'fr-ci',
  nom: 'Français (marché ivoirien)',
  iso639_3: 'fra',
  provisoire: false,
  formatNombre: 'fr-FR',
  fallback: null,
  messages: MESSAGES_FR_CI,
  intents: INTENTS_FR_CI,
  lexique: LEXIQUE_FR_CI,
  normaliser: null,
  parseurNombres: null,
  voix: null,
};
