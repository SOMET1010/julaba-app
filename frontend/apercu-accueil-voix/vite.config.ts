/** Banc visuel jetable : hors de l'entrée et des composants de production. */
import { defineConfig, mergeConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import base from '../vite.config';

const ici = dirname(fileURLToPath(import.meta.url));

export default defineConfig(async (env) => {
  const config = typeof base === 'function' ? await base(env) : base;
  return mergeConfig(config, {
    root: ici,
    server: { host: '127.0.0.1', port: 5201, strictPort: true },
    resolve: { alias: { '@preview': resolve(ici) } },
  });
});
