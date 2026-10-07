/**
 * INSTITUTION — le profil institution ne lit que les routes qui lui répondent.
 *
 * LE DÉFAUT QU'ON EMPÊCHE DE REVENIR. `InstitutionContext` appelait
 * `/admin/analytics/*`, `/admin/config` et `/audit` : routes réservées aux
 * administrateurs. Pour un compte institution, 403 → `catch` → zéros, affichés
 * comme de vrais chiffres. Les écrans Acteurs et Supervision tentaient aussi
 * des écritures (`PATCH /acteurs/:id`, `PATCH /transactions/:id`) que le
 * serveur refuse par conception au rôle institution.
 *
 * CE QUE LA GARDE VÉRIFIE :
 *   1. aucun fichier du profil institution n'appelle une route ADMIN
 *      (`/admin/...`, `/audit`), ni directement ni via `useAudit()` ;
 *   2. aucune écriture (`PATCH`/`POST`/`DELETE`) vers `/acteurs/` ou
 *      `/transactions/` depuis le profil institution ;
 *   3. le module « Audit » porte la même clé partout (`audit`, pas
 *      `audit-trail`), sinon le menu disparaît en silence ;
 *   4. le profil ne montre plus de courbe inventée (`DATA_EVOLUTION`).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const APP = join(ICI, '..', 'src', 'app');
const lire = (rel) => readFileSync(join(APP, rel), 'utf8');

let echecs = 0;
const verifier = (quoi, ok, pourquoi) => {
  if (ok) { console.log(`  ✓ ${quoi}`); return; }
  echecs++;
  console.log(`  ✗ ${quoi}`);
  if (pourquoi) console.log(`      ${pourquoi}`);
};

const sansCommentaires = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  .join('\n');

const fichiers = [
  'contexts/InstitutionContext.tsx',
  'contexts/InstitutionAccessContext.tsx',
  'hooks/useInstitutionData.ts',
  'hooks/useInstitutionPermissions.ts',
  ...readdirSync(join(APP, 'components', 'institution'))
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => `components/institution/${f}`),
];

console.log('\nLe profil institution ne lit que /institution/*');

for (const f of fichiers) {
  const code = sansCommentaires(lire(f));
  const admin = code.match(/['"`]\/(admin\/[^'"`]*|audit)['"`?]/g) ?? [];
  verifier(`${f} : aucune route ADMIN`, admin.length === 0, `trouvé : ${admin.join(', ')}`);
  verifier(`${f} : pas de journal ADMIN via useAudit()`, !/\buseAudit\(/.test(code),
    'AuditContext lit /audit, réservé aux administrateurs : 403 → liste vide prise pour « aucune action ».');
  const ecriture = /\/(acteurs|transactions)\/\$\{[^}]+\}`\s*,\s*\{[^}]*method:\s*['"](PATCH|POST|DELETE|PUT)/s.test(code);
  verifier(`${f} : aucune écriture refusée au rôle institution`, !ecriture,
    'PATCH /acteurs/:id et /transactions/:id sont réservés aux administrateurs.');
}

const acces = sansCommentaires(lire('contexts/InstitutionAccessContext.tsx'));
const layout = sansCommentaires(lire('components/institution/InstitutionLayout.tsx'));
verifier('le module Audit s\'appelle « audit » dans le contexte d\'accès',
  /'audit'/.test(acces) && !/'audit-trail'/.test(acces),
  'InstitutionLayout filtre le menu sur la clé `audit` (ModuleAcces).');
verifier('le menu Audit de InstitutionLayout filtre sur « audit »', /module:\s*'audit'/.test(layout));

const donnees = sansCommentaires(lire('hooks/useInstitutionData.ts'));
verifier('plus de courbe d\'évolution inventée (DATA_EVOLUTION)', !/DATA_EVOLUTION/.test(donnees),
  'Une courbe sans source doit dire « indisponible », pas montrer des chiffres écrits en dur.');

if (echecs) {
  console.log(`\n✗ ${echecs} défaut(s) — profil institution`);
  process.exit(1);
}
console.log('\n✓ profil institution : routes /institution/* seulement');
