/**
 * Config Vite du BANC TERRAIN — jetable, hors production.
 *
 * Différence capitale avec `apercu-caisse/vite.config.ts` (banc de capture du
 * lot F) : ici on ne bouchonne RIEN. Aucun alias, aucun stub, aucune donnée de
 * démonstration. On sert l'application RÉELLE (`frontend_src/index.html` →
 * `src/main.tsx` → le vrai `App` et son vrai routeur), sur un port dédié.
 *
 * La seule chose ajoutée à la page est un module d'OBSERVATION
 * (`journal.ts`) : il s'enregistre comme rendu vocal PAR-DESSUS celui de
 * l'application et délègue aussitôt — il n'altère aucun texte, aucune décision,
 * aucun son. Il expose `window.__banc` pour que le banc lise le journal de voix
 * existant (`src/app/utils/voiceTrace.ts`).
 *
 * Ce fichier n'entre ni dans `npm run build` (l'entrée de production reste
 * ../../vite.config.ts), ni dans `tsc -b` (tsconfig n'inclut que `src`).
 */
import { mergeConfig, type Plugin } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import base from '../../vite.config';

const ici = dirname(fileURLToPath(import.meta.url));
// Les paquets sont hissés à la racine du workspace npm, qui est HORS de
// `frontend_src` (et hors du worktree quand on travaille dans un worktree) :
// on le retrouve par résolution, jamais par un chemin deviné.
const nodeModules = resolve(
  dirname(createRequire(import.meta.url).resolve('@fontsource/inter/package.json')),
  '..', '..',
);

const observation = (): Plugin => ({
  name: 'banc-terrain-observation',
  apply: 'serve',
  transformIndexHtml() {
    return [{
      tag: 'script',
      attrs: { type: 'module', src: '/apercu-caisse/banc-terrain/journal.ts' },
      injectTo: 'head',
    }];
  },
});

export default mergeConfig(base, {
  plugins: [observation()],
  server: {
    port: 5197,
    strictPort: true,
    host: '127.0.0.1',
    // Sans cette autorisation, les polices Inter ne sont pas servies et le banc
    // jugerait la mise en page dans la police de repli du système — donc pas
    // celle du téléphone. Ce sont les MÊMES polices que le build embarque.
    fs: { allow: [resolve(ici, '..', '..'), nodeModules] },
  },
});
