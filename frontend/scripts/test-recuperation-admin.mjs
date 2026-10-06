/**
 * Garde BO-0 — plus de récupération super_admin côté client.
 *
 * LE DÉFAUT QU'ON EMPÊCHE DE REVENIR (audit écosystème 10/2026, bo-b §2.4).
 * Une page publique `/admin-recovery`, liée depuis l'écran de connexion du
 * back-office, embarquait une clé de récupération EN DUR dans le bundle et
 * l'envoyait en `secretKey` à des routes de réinitialisation du super_admin.
 * Le bundle est public : la clé l'était aussi. Le jour où une version du
 * serveur l'accepte, n'importe qui réinitialise le super_admin.
 *
 * RÈGLE : toute récupération passe par le serveur et par une vérification
 * réelle. Le client ne porte ni page, ni lien, ni clé, ni appel à ces routes.
 *
 * Cette garde ne recopie pas la clé : elle cherche les MÉCANISMES (page,
 * route, lien, constante, champ `secretKey`, routes serveur visées).
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const SRC = join(ICI, '..', 'src');

let echecs = 0;
const verifier = (quoi, ok, pourquoi) => {
  if (ok) { console.log(`  ✓ ${quoi}`); return; }
  echecs++;
  console.log(`  ✗ ${quoi}`);
  if (pourquoi) console.log(`      ${pourquoi}`);
};

const fichiers = [];
const parcourir = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) { if (n !== 'node_modules') parcourir(p); continue; }
    if (/\.(tsx?|mts|jsx?|mjs)$/.test(n) && !/\.test\.m?ts$/.test(n)) fichiers.push(p);
  }
};
parcourir(SRC);

// Le code, sans les commentaires qui racontent l'incident.
const code = (p) => readFileSync(p, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const trouver = (re) => fichiers.filter((p) => re.test(code(p))).map((p) => relative(SRC, p));

console.log('\nAucune récupération super_admin côté client (BO-0)');

verifier(
  'la page AdminRecovery n\'existe plus',
  !existsSync(join(SRC, 'app', 'pages', 'AdminRecovery.tsx')),
  'src/app/pages/AdminRecovery.tsx est encore présent',
);

const routes = trouver(/["'`]\/admin-recovery["'`]/);
verifier('aucune route ni aucun lien vers /admin-recovery', routes.length === 0, routes.join(', '));

const cle = trouver(/\bRECOVERY_KEY\b|\bsecretKey\b/);
verifier('aucune clé de récupération ni champ secretKey dans le bundle', cle.length === 0, cle.join(', '));

const appels = trouver(/recover-super-admin|reset-super-admin-password/);
verifier('aucun appel aux routes de réinitialisation du super_admin', appels.length === 0, appels.join(', '));

if (echecs > 0) {
  console.log(`\n${echecs} échec(s).`);
  process.exit(1);
}
console.log('\nOK');
