/**
 * Config Vite JETABLE — banc de capture de la caisse (VOIX-01, lot F).
 *
 * Reprend la config de l'application et REMPLACE, par alias, les cinq
 * contextes que la caisse consomme par des stubs sans réseau (./stubs).
 * Utilisée UNIQUEMENT par `node apercu-caisse/capture.mjs` (serveur de dev
 * sur un port dédié). `npm run build` continue de lire ../vite.config.ts :
 * ni cette config ni ce dossier n'entrent dans le bundle de production.
 */
import { mergeConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import base from '../vite.config';

const ici = dirname(fileURLToPath(import.meta.url));
const stub = (nom: string) => resolve(ici, 'stubs', `${nom}.tsx`);

export default mergeConfig(base, {
  resolve: {
    alias: [
      // Le motif couvre le SPÉCIFICATEUR ENTIER (l'alias remplace la partie
      // reconnue) : `../../contexts/AppContext` comme `./AppContext` depuis un
      // autre contexte — jamais `useAppContext` ni un homonyme sans « / ».
      { find: /^(.*\/)?CaisseContext$/, replacement: stub('CaisseContext') },
      { find: /^(.*\/)?AppContext$/, replacement: stub('AppContext') },
      { find: /^(.*\/)?StockContext$/, replacement: stub('StockContext') },
      { find: /^(.*\/)?RaccourcisContext$/, replacement: stub('RaccourcisContext') },
      { find: /^(.*\/)?ObjectifContext$/, replacement: stub('ObjectifContext') },
    ],
  },
  server: { port: 5199, strictPort: true, host: '127.0.0.1' },
});
