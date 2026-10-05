/**
 * any — AGNI (ISO 639-3 `any`, code à confirmer). SQUELETTE : aucun contenu,
 * tout retombe sur fr-ci, tracé. Manus remplit `messages`, `intents`,
 * `lexique` et `voix` (docs/langues/AJOUTER-UNE-LANGUE.md).
 */
import type { ManifestLocale } from '../../types';

export const ANY: ManifestLocale = {
  code: 'any',
  nom: 'Agni',
  iso639_3: 'any',
  provisoire: true,
  formatNombre: 'fr-FR',
  fallback: 'fr-ci',
  messages: {},
  intents: {},
  lexique: null,
  normaliser: null,
  parseurNombres: null,
  voix: null,
};
