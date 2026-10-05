/**
 * AUTH-14 (audit UI auth 05/10/2026) — le diagnostic auth se tait en prod.
 *
 * LE DÉFAUT QU'ON EMPÊCHE DE REVENIR. Treize `console.warn` éparssaient
 * leurs avertissements techniques dans la console du build livré. L'audit a
 * vérifié qu'aucun ne porte de PIN, de mot de passe ni de montant (conforme
 * §8.7), mais un avertissement qu'on ne peut pas lire en prod n'est plus un
 * diagnostic : c'est du bruit — et un indice pour qui sonde.
 *
 * LE CANAL QUI REMPPLACE. `utils/warnDev.ts` : un robinet DEV — `console.warn`
 * en développement, no-op dans le build livré (`import.meta.env.DEV` est
 * résolu AU BUILD, le branchement disparaît du bundle).
 *
 * CE QUE LA GARDE VÉRIFIE :
 *   1. le robinet existe et dépend bien de import.meta.env.DEV ;
 *   2. plus AUCUN `console.warn` brut dans le périmètre auth (les écrans
 *      d'entrée et leurs supports) — tout passe par warnDev.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const AUTH = join(ICI, '..', 'src', 'app', 'components', 'auth');
const lire = (rel) => readFileSync(join(ICI, '..', rel), 'utf8');

let echecs = 0;
const verifier = (quoi, ok, pourquoi) => {
  if (ok) { console.log(`  ✓ ${quoi}`); return; }
  echecs++;
  console.log(`  ✗ ${quoi}`);
  if (pourquoi) console.log(`      ${pourquoi}`);
};

console.log('\nLe diagnostic auth ne parle qu\'en développement');

const robinet = 'src/app/utils/warnDev.ts';
const robinetExiste = existsSync(join(ICI, '..', robinet));
verifier('le robinet utils/warnDev.ts existe', robinetExiste);

if (robinetExiste) {
  verifier(
    'le robinet dépend de import.meta.env.DEV',
    /import\.meta\.env\.DEV/.test(lire(robinet)),
    'un robinet toujours ouvert remettrait le bruit en production.',
  );
}

// 2. Zéro console.warn brut dans le périmètre auth (fichiers .tsx/.ts du dossier).
const fichiers = readdirSync(AUTH).filter((f) => /\.(tsx|ts)$/.test(f));
for (const f of fichiers) {
  const texte = readFileSync(join(AUTH, f), 'utf8');
  // On cherche du CODE, pas les commentaires qui racontent l'incident.
  const sansCommentaires = texte
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
  const brut = sansCommentaires.includes('console.warn');
  verifier(
    `${f} : aucun console.warn brut`,
    !brut,
    'remplacer par warnDev(...) — console.warn ressort dans le build livré.',
  );
}

if (echecs > 0) {
  console.log('\n✗ robinet diagnostic — échec');
  process.exit(1);
}
console.log('\n✓ diagnostic auth : DEV seulement, silencieux dans le build livré');
