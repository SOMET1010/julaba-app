// Configuration de build pour la RECETTE NAVIGATEUR.
//
// Elle ne diffère de la configuration de production que par UN alias : le
// module de transcription sherpa-onnx, qui n'existe que dans l'APK, est
// remplacé par un stub piloté par le script de recette. Tout le reste du
// bundle est celui de production — mêmes écrans, mêmes règles, même argent.
//
// Aucun fichier de `src/` n'est modifié : la recette ne déforme pas ce qu'elle
// mesure.
import { defineConfig, mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import base from '../vite.config';

export default defineConfig(async (env) => {
  const b = typeof base === 'function' ? await base(env) : base;
  return mergeConfig(b, {
    resolve: {
      alias: [{
        find: /.*\/voice-offline\/offlineStt$/,
        replacement: fileURLToPath(new URL('./stub/offlineStt.ts', import.meta.url)),
      }],
    },
    build: { outDir: fileURLToPath(new URL('../../frontend/dist-recette', import.meta.url)), emptyOutDir: true },
  });
});
