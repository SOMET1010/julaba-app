#!/usr/bin/env node
/**
 * LE TABLEAU DE BORD DU BACK-OFFICE PARLE À LA BONNE API — démo 12/10/2026.
 *
 * LE DÉFAUT. `hooks/useRealtime.ts` lisait `/admin/stats`, `/activity`,
 * `/health` et `/timeline` par `fetch('/api/v1' + path)` : un chemin RELATIF,
 * qui ignore `VITE_API_URL`. Sur deux domaines (julaba-web ↔ julaba-api) ou en
 * local, les quatre lectures partaient vers l'hôte du FRONT, recevaient une
 * erreur, et le tableau de bord restait vide — sans jeton BO en prime.
 *
 * LA RÈGLE. Le hook lit par le client du back-office (`boLire`), qui part de
 * `API_URL` et porte le jeton BO. Aucun `fetch` direct, aucun `/api/v1` écrit.
 *
 * Lancer : npm run test:base-api-temps-reel
 */
import { readFileSync } from 'node:fs';

let echecs = 0;
const ok = (c, quoi) => { console.log(`  ${c ? '✓' : '✗'} ${quoi}`); if (!c) echecs++; };
const lire = (rel) => readFileSync(new URL(`../src/app/${rel}`, import.meta.url), 'utf8');
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

console.log('\nLe tableau de bord BO lit par la base d\'API configurée\n');

const hook = sansCommentaires(lire('hooks/useRealtime.ts'));
ok(!/\bfetch\s*\(/.test(hook), 'useRealtime.ts ne fait aucun fetch() direct');
ok(!/['"`]\/api\/v1/.test(hook), 'useRealtime.ts n\'écrit aucune base « /api/v1 » relative');
ok(/import\s*\{[^}]*\bboLire\b[^}]*\}\s*from\s*'\.\.\/services\/backoffice-api'/.test(hook),
  'useRealtime.ts lit par boLire (client du back-office)');
for (const route of ['/admin/stats', '/admin/activity', '/admin/health', '/admin/timeline']) {
  ok(new RegExp(`boLire<[^>]+>\\('${route.replace(/\//g, '\\/')}`).test(hook), `${route} passe par boLire`);
}

const client = sansCommentaires(lire('services/backoffice-api.ts'));
ok(/export function boLire<T>\(path: string\): Promise<T> \{\s*return apiGet\(path\)/.test(client),
  'boLire délègue à apiGet');
ok(/async function apiGet\(path: string\)[^{]*\{\s*const res = await fetch\(API_URL \+ path, \{ headers: authHeaders\(\)/.test(client),
  'apiGet part de API_URL et porte le jeton BO (authHeaders)');

console.log(echecs === 0 ? '\n✓ base d\'API respectée\n' : `\n✗ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
