/**
 * dyu-ci — DIOULA (code provisoire, ISO 639-3 `dyu`). SQUELETTE.
 *
 * Aucune traduction ici : le contenu linguistique appartient à Manus
 * (docs/langues/AJOUTER-UNE-LANGUE.md). Tant que `messages` et `intents` sont
 * vides, tout retombe sur fr-ci — tracé à chaque fois (I18N_FALLBACK).
 *
 * Le parseur de nombres bambara existant (voice-offline/nombresMandingue.ts)
 * annonce lui-même qu'il « servira de base au dioula » (langues mandingues
 * très proches). Il est DÉCLARÉ ici comme référence, pas activé : aucune
 * vente ne le lit tant que cette locale n'est pas validée pour l'argent.
 *
 * Une traduction dioula DE TRAVAIL, non validée, existe dans
 * services/loginVoiceScript.ts (`texteDyu`). Elle n'est pas reprise dans un
 * build LIVRABLE : Manus tranche ce qu'il en fait.
 *
 * ── SAUF DANS UN BUILD D'ESSAI, ET SEULEMENT LÀ ────────────────────────────
 *
 * Sur `JULABA_VOIX_DYU=1` — un drapeau de CONSTRUCTION, absent de tout
 * processus Node, donc absent de `verify` et de `test:ci` — ce squelette se
 * remplit du décor de travail (`decorDeTest.ts`). Pourquoi c'est légitime, et
 * pourquoi ça ne défait pas le lot B7 :
 *
 *   le garde B7 interdit de LIVRER une demi-langue, pas de la TESTER.
 *
 * La configuration livrée est celle où aucun `define` n'est posé : c'est celle
 * que voient les tests, et `dyu-ci` y reste un squelette vide, littéralement.
 * Ce que le drapeau produit n'est jamais écrit sur disque et n'est jamais
 * committé : c'est un build, pas une livraison. Le jour où Manus livrera un
 * vrai décor validé, il s'écrira ICI, en dur, et ce chemin d'essai n'aura plus
 * de raison d'être.
 */
import { extraireNombreBambara, normaliserBambara } from '../../../../voice-offline/nombresMandingue';
import type { ManifestLocale } from '../../types';
import { DYU_ARGENT_DE_TEST, VOIX_DYU_EMBARQUEE } from '../../drapeauxDeTest';
import { decorDioula } from './decorDeTest';

export const DYU_CI: ManifestLocale = {
  code: 'dyu-ci',
  nom: 'Dioula',
  iso639_3: 'dyu',
  provisoire: true,
  formatNombre: 'fr-FR',
  fallback: 'fr-ci',
  // Le TERNAIRE est nécessaire, un simple appel ne suffirait pas : sans lui,
  // le bundler garde l'appel (il ne peut pas savoir qu'il est sans effet) et
  // embarque avec lui les 56 phrases du script de travail — ~12 Ko dans le
  // chunk principal d'un build ordinaire. MESURÉ. Avec le ternaire, la
  // constante se replie sur `false`, la branche disparaît, et l'import aussi.
  messages: VOIX_DYU_EMBARQUEE ? decorDioula(VOIX_DYU_EMBARQUEE, DYU_ARGENT_DE_TEST).messages : {},
  // Les INTENTIONS (ce que la marchande DIT) restent vides dans tous les cas :
  // ce lot fait PARLER Tantie, il ne lui fait pas mieux ENTENDRE. Peupler les
  // intentions depuis un corpus non validé changerait la reconnaissance
  // vocale, donc la caisse — c'est un autre lot, et une autre preuve.
  intents: {},
  lexique: null,
  // ɛ → e, ɔ → o, ŋ → n, sans accents ni ponctuation — la normalisation du
  // parseur bambara, bordée d'espaces comme la référence.
  normaliser: (texte) => ` ${normaliserBambara(texte)} `,
  parseurNombres: extraireNombreBambara,
  voix: null,
};
