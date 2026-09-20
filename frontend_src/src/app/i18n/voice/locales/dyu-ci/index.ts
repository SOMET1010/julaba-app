/**
 * dyu-ci — DIOULA (code provisoire, ISO 639-3 `dyu`). SQUELETTE.
 *
 * Aucune traduction ici : le contenu linguistique appartient à Manus
 * (docs/langues/AJOUTER-UNE-LANGUE.md). Tant que `messages` et `intents` sont
 * vides, tout retombe sur fr-ci — tracé à chaque fois (I18N_FALLBACK).
 *
 * Le parseur de nombres bambara existant (voice-offline/nombresBambara.ts)
 * annonce lui-même qu'il « servira de base au dioula » (langues mandingues
 * très proches). Il est DÉCLARÉ ici comme référence, pas activé : aucune
 * vente ne le lit tant que cette locale n'est pas validée pour l'argent.
 *
 * Une traduction dioula DE TRAVAIL, non validée, existe dans
 * services/loginVoiceScript.ts (`texteDyu`). Elle n'est pas reprise : Manus
 * tranche ce qu'il en fait.
 */
import { extraireNombreBambara, normaliserBambara } from '../../../../voice-offline/nombresBambara';
import type { ManifestLocale } from '../../types';

export const DYU_CI: ManifestLocale = {
  code: 'dyu-ci',
  nom: 'Dioula',
  iso639_3: 'dyu',
  provisoire: true,
  formatNombre: 'fr-FR',
  fallback: 'fr-ci',
  messages: {},
  intents: {},
  lexique: null,
  // ɛ → e, ɔ → o, ŋ → n, sans accents ni ponctuation — la normalisation du
  // parseur bambara, bordée d'espaces comme la référence.
  normaliser: (texte) => ` ${normaliserBambara(texte)} `,
  parseurNombres: extraireNombreBambara,
  voix: null,
};
