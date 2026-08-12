#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Gate TypeScript à baseline — CLIQUET (ne monte jamais).
//
// Compte les erreurs `tsc` du frontend et les compare à la baseline committée
// (ci/tsc-baseline.txt). Politique de gouvernance :
//   - erreurs  >  baseline  → RÉGRESSION → échec (une PR a introduit du neuf).
//   - erreurs  <  baseline  → PROGRÈS non entériné → échec : abaisse la baseline
//                              (idéalement 0) DANS LA MÊME PR. La baseline est un
//                              plafond TEMPORAIRE, pas un niveau acceptable.
//   - erreurs  == baseline  → OK.
//
// La baseline actuelle (10) = types manquants `leaflet` + `qrcode` (dette connue,
// hors périmètre du filet CI). À corriger séparément, puis abaisser ici.
//
// N'installe rien, ne déploie rien, ne modifie aucun fichier.
// ─────────────────────────────────────────────────────────────────────────────

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CI_DIR = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(CI_DIR, '..', 'frontend_src');
const BASELINE_FILE = join(CI_DIR, 'tsc-baseline.txt');

const baseline = parseInt(readFileSync(BASELINE_FILE, 'utf8').trim(), 10);
if (!Number.isInteger(baseline) || baseline < 0) {
  console.error(`✗ Baseline invalide dans ${BASELINE_FILE}`);
  process.exit(2);
}

// `tsc -b --force` : rebuild complet → décompte déterministe (pas de cache).
let out = '';
try {
  out = execSync('npx tsc -b --force', { cwd: FRONTEND, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  // tsc sort en code ≠ 0 quand il y a des erreurs : c'est attendu, on lit sa sortie.
  out = `${e.stdout || ''}${e.stderr || ''}`;
}

const erreurs = (out.match(/error TS\d+/g) || []).length;

console.log(`── Gate TypeScript (cliquet) ─────────────────────────────`);
console.log(`  baseline (plafond temporaire) : ${baseline}`);
console.log(`  erreurs mesurées .............. : ${erreurs}`);

if (erreurs > baseline) {
  console.error(`✗ RÉGRESSION : ${erreurs} > ${baseline}. Cette PR ajoute des erreurs TypeScript. Corrige-les avant de merger.`);
  process.exit(1);
}
if (erreurs < baseline) {
  console.error(`✗ PROGRÈS À ENTÉRINER : ${erreurs} < ${baseline}. Abaisse la baseline à ${erreurs} dans ci/tsc-baseline.txt (même PR).`);
  process.exit(1);
}
console.log(`✓ OK : ${erreurs} = baseline. Aucune nouvelle erreur.`);
