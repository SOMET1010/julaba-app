/**
 * bci — BAOULÉ (ISO 639-3 `bci`, code à confirmer). SQUELETTE : aucun contenu,
 * tout retombe sur fr-ci, tracé. Manus remplit `messages`, `intents`,
 * `lexique` et `voix` (docs/langues/AJOUTER-UNE-LANGUE.md).
 */
import type { ManifestLocale } from '../../types';

export const BCI: ManifestLocale = {
  code: 'bci',
  nom: 'Baoulé',
  iso639_3: 'bci',
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
