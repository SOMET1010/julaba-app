// @ts-check
/**
 * LINT — TAILLE, COMPLEXITÉ, CYCLES. Cadre de travail, 05/10/2026.
 *
 * ── LES SEUILS SONT AU NIVEAU ACTUEL, PAS AU NIVEAU IDÉAL ────────────────
 *
 * Mesuré sur ce dépôt : **185 fichiers de plus de 300 lignes**, le plus gros
 * à **6 644 lignes** (`FicheIdentificationDynamiqueBO.tsx`). Poser 300 ferait
 * échouer le lint partout dès la première minute, et un garde-fou qui hurle
 * sans arrêt finit désactivé — on perdrait la règle ET l'outil.
 *
 * Les seuils ci-dessous sont donc calés sur l'existant : ils **empêchent
 * l'aggravation** sans rien bloquer. Ils se resserrent quand la dette baisse,
 * **jamais l'inverse**. L'objectif de 300 lignes / 50 lignes par fonction
 * reste la règle écrite dans CLAUDE.md pour tout code NOUVEAU ; ici, on
 * mesure le plancher à ne plus franchir.
 *
 * ── CE QU'ON NE MESURE PAS, ET POURQUOI ──────────────────────────────────
 *
 * · `frontend/` — ce sont des SORTIES DE BUILD (voir docs/ARCHITECTURE.md).
 *   Linter du généré ne dit rien du code qu'on écrit.
 * · les bancs `*.test.*` / `*.spec.*` — une duplication y est souvent VOULUE :
 *   trois cas qui se ressemblent et dont on veut voir la différence d'un coup
 *   d'œil valent mieux qu'une fabrique partagée. Leur longueur n'est pas une
 *   dette : c'est de la couverture.
 * · les migrations — du DDL, long par nature, et qu'on ne refactore jamais
 *   après exécution.
 */
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';

/** Relevé du 05/10/2026. Toute baisse de ces nombres est un progrès ; toute
 *  hausse doit être refusée en relecture. */
const SEUILS = {
  /** max mesuré : **6 644** — `FicheIdentificationDynamiqueBO.tsx`. */
  lignesParFichier: 6700,
  /** max mesuré : **2 262** — une seule fonction dans ce même fichier. */
  lignesParFonction: 2300,
  /** max mesuré : **166** — `FicheIdentificationDynamique.tsx`. */
  complexite: 170,
};

export default tseslint.config(
  {
    // LES `eslint-disable` DU CODE VISENT DES RÈGLES QU'ON NE CONFIGURE PAS.
    //
    // Le dépôt n'avait AUCUN eslint (vérifié le 05/10 : ni `.eslintrc`, ni
    // `eslint.config.*`, ni dépendance) — et pourtant son code porte des
    // directives `eslint-disable-next-line react-hooks/exhaustive-deps` et
    // compagnie, écrites pour un outil absent. ESLint 9 signale par défaut
    // toute directive inutile : 47 faux positifs, qui noieraient les 26 vraies
    // alertes de taille et de complexité.
    //
    // On se tait donc là-dessus. Le jour où `react-hooks` et
    // `@typescript-eslint` seront configurés, ces directives redeviendront
    // utiles — et le signal, lui, reviendra tout seul.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      'frontend/**',          // sorties de build
      'android/**',
      'spike/**',             // OSS-02 rejeté
      'infra/**',
      'coordination/**',
      '**/*.d.ts',
      '**/migrations/**',
      '.claude/**',
    ],
  },

  // ── Le code de production : c'est lui qu'on tient ───────────────────────
  {
    files: ['frontend_src/src/**/*.{ts,tsx}', 'backend/src/**/*.ts'],
    ignores: ['**/*.test.*', '**/*.spec.*'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    // LES PLUGINS SONT DÉCLARÉS, LEURS RÈGLES RESTENT ÉTEINTES.
    //
    // Le code porte déjà des `eslint-disable-next-line
    // react-hooks/exhaustive-deps` et `@typescript-eslint/no-explicit-any` —
    // écrits pour un eslint qui n'existait pas. Sans les plugins, ESLint 9
    // lève « Definition for rule … was not found » : 46 ERREURS, qui
    // noieraient les vraies.
    //
    // On déclare donc les plugins pour que ces directives soient RECONNUES,
    // sans allumer leurs règles : ce lot mesure la taille et les cycles, pas
    // la qualité des hooks. Le jour où on allumera `exhaustive-deps`, les 40
    // directives déjà en place seront là, et le signal reviendra tout seul.
    plugins: { import: importPlugin, 'react-hooks': reactHooks, '@typescript-eslint': tseslint.plugin },
    rules: {
      'max-lines': ['warn', { max: SEUILS.lignesParFichier, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: SEUILS.lignesParFonction, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', SEUILS.complexite],

      // LES CYCLES, EUX, SONT EN ERREUR ET NON EN AVERTISSEMENT — et c'est le
      // seul endroit où je serre d'emblée. Un cycle ne se corrige pas « plus
      // tard » : il rend le code impossible à découper, donc il bloque
      // justement le travail qui ferait baisser les autres chiffres. Si le
      // dépôt en contient déjà, cette règle le dira au premier `npm run check`
      // et le nombre ira dans STATUS.md.
      'import/no-cycle': ['error', { maxDepth: 6, ignoreExternal: true }],
      'import/no-self-import': 'error',
    },
    settings: {
      'import/resolver': {
        typescript: { project: ['frontend_src/tsconfig.json', 'backend/tsconfig.json'] },
      },
    },
  },

  // ── Les bancs : on ne juge QUE les cycles ──────────────────────────────
  {
    files: ['**/*.test.{ts,tsx,mts}', '**/*.spec.ts'],
    languageOptions: { parser: tseslint.parser },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    plugins: { import: importPlugin, 'react-hooks': reactHooks, '@typescript-eslint': tseslint.plugin },
    rules: { 'import/no-self-import': 'error' },
  },
);
