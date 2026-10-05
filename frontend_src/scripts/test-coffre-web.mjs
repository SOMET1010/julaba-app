/**
 * AUTH-06 / ADR-002 (audit UI auth 05/10/2026) — le coffre des jetons.
 *
 * LE DÉFAUT QU'ON EMPÊCHE DE REVENIR. Sur WEB, écrire les jetons JWT en
 * localStorage offrait à n'importe quel XSS le refresh token de 7 jours —
 * rejouable, il donne la session entière. La décision ADR-002 tranche la voie
 * duelle : sur web la session vit dans les cookies httpOnly du backend, et
 * l'écriture localStorage n'existe QUE pour l'APK natif (cookies cross-domaine
 * bloqués), concentrée dans UN SEUL module.
 *
 * CE QUE LA GARDE VÉRIFIE :
 *   1. le coffre utils/stockerJetonsSiMobile.ts existe, exporte
 *      stockerJetonsSiMobile + estMobileNatif, et ne pose les clés QUE si
 *      Capacitor.isNativePlatform() répond vrai ;
 *   2. AUCUN autre fichier du frontend n'écrit ces deux clés (setItem) ;
 *   3. LoginPassword ne stocke plus en direct : il appelle le coffre ×2 et
 *      cite l'ADR ;
 *   4. les lectures (api-client) restent en place : c'est le chemin APK et la
 *      tolérance héritée — la garde les exige encore.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
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

const COFFRE = 'src/app/utils/stockerJetonsSiMobile.ts';
const CLE1 = 'julaba_access_token';
const CLE2 = 'julaba_refresh_token';

console.log('\ncoffre des jetons : sur web rien ne s\'écrit, l\'APK seul pose les clés');

// 1. Le coffre existe et porte la décision.
let coffreBrut = '';
try { coffreBrut = readFileSync(join(ICI, '..', COFFRE), 'utf8'); } catch { /* absent */ }
const coffrePresent = coffreBrut.length > 0;
verifier(`le coffre ${COFFRE} existe`, coffrePresent,
  'sans coffre unique, l\'écriture des jetons se disperse et la voie web rouvre.');

if (coffrePresent) {
  verifier(
    'le coffre exporte stockerJetonsSiMobile et estMobileNatif',
    /export function stockerJetonsSiMobile/.test(coffreBrut) && /export function estMobileNatif/.test(coffreBrut),
  );
  verifier(
    'le coffre ne pose les clés QUE si Capacitor.isNativePlatform() répond vrai',
    /isNativePlatform/.test(coffreBrut) && coffreBrut.indexOf('if (!estMobileNatif()) return;') !== -1,
    'sans la porte native, le coffre écrirait sur web aussi.',
  );
  verifier(
    'le coffre cite ADR-002 (la décision doit se lire là où elle vit)',
    /ADR-002/.test(coffreBrut),
  );
}

// 2. Balayage : AUCUN setItem des clés hors du coffre. On ignore les tests
// (ils simulent le stockage pour documenter le chemin APK) et node_modules.
const coupables = [];
const marcher = (dossier) => {
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree);
    const stat = statSync(chemin);
    if (stat.isDirectory()) {
      if (entree === 'node_modules' || entree === 'dist') continue;
      marcher(chemin);
      continue;
    }
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(extname(entree))) continue;
    if (/\.test\.(m?ts|m?tsx)$/.test(entree)) continue;
    let contenu = '';
    try { contenu = readFileSync(chemin, 'utf8'); } catch { continue; }
    const relatif = chemin.replace(SRC, 'src');
    const ecrit = new RegExp(`setItem\\((['"\`])(${CLE1}|${CLE2})\\1`).test(contenu);
    if (ecrit && !relatif.includes('utils/stockerJetonsSiMobile.ts')) coupables.push(relatif);
  }
};
marcher(SRC);
verifier(
  'aucun setItem des clés jetons hors du coffre',
  coupables.length === 0,
  coupables.length ? `écriture(s) hors coffre : ${coupables.join(', ')}` : '',
);

// 3. LoginPassword passe par le coffre.
const loginEcran = readFileSync(join(ICI, '..', 'src/app/components/auth/LoginPassword.tsx'), 'utf8');
const appels = (loginEcran.match(/stockerJetonsSiMobile\(/g) || []).length;
verifier(
  'LoginPassword appelle le coffre exactement 2 fois (connexion vocale + connexion par code)',
  appels === 2,
  `trouvé : ${appels}. Chaque nouvelle voie de connexion doit passer par le coffre.`,
);
verifier(
  'plus aucun setItem direct des clés dans LoginPassword',
  !new RegExp(`setItem\\((['"\`])(${CLE1}|${CLE2})`).test(loginEcran),
);
verifier(
  'LoginPassword cite ADR-002 (l\'escalation raconte la décision)',
  /ADR-002/.test(loginEcran),
);

// 4. Les lectures restent : chemin APK + tolérance héritée.
const apiClient = readFileSync(join(ICI, '..', 'src/app/services/api/api-client.ts'), 'utf8');
verifier(
  'api-client lit toujours les clés (chemin APK + jetons hérités)',
  apiClient.includes(`'${CLE1}'`) && apiClient.includes(`'${CLE2}'`) && /lireStockage\(CLE_RAFRAICHISSEMENT\)/.test(apiClient),
  'sans lecture, l\'APK perd sa session et les gardes de convergence mentent.',
);

if (echecs > 0) {
  console.log('\n✗ coffre des jetons — échec');
  process.exit(1);
}
console.log('\n✓ coffre des jetons : écriture APK seule, session web en cookies httpOnly');
