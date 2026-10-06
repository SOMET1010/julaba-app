/**
 * bm — BAMBARA (ISO 639-3 `bam`). SQUELETTE : aucun contenu, tout retombe sur
 * fr-ci, tracé. Enregistré parce que la préférence « bambara » est déjà
 * sélectionnable dans l'application (hooks/useLangPref.ts, Paramètres) : sans
 * manifest, chaque appel traçait `locale_inconnue` (I18N-02). Hors de la liste
 * ivoirienne de Patrick — Manus décide de son avenir. Le parseur de nombres
 * bambara existant (voice-offline/nombresMandingue.ts) est DÉCLARÉ, pas activé :
 * rien ne le lit tant que cette locale n'est pas validée pour l'argent.
 */
import { extraireNombreBambara, normaliserBambara } from '../../../../voice-offline/nombresMandingue';
import type { ManifestLocale } from '../../types';

export const BM: ManifestLocale = {
  code: 'bm',
  nom: 'Bambara',
  iso639_3: 'bam',
  provisoire: true,
  formatNombre: 'fr-FR',
  fallback: 'fr-ci',
  messages: {},
  intents: {},
  lexique: null,
  normaliser: (texte) => ` ${normaliserBambara(texte)} `,
  parseurNombres: extraireNombreBambara,
  voix: null,
};
