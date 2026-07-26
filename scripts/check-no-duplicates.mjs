#!/usr/bin/env node
/**
 * GARDE-FOU CONSTITUTION §1 & §4 — Interdiction de duplication.
 *
 * Échoue (exit 1) si un fichier source introduit un doublon versionné :
 * suffixes `V2/V3…`, `New`, `Bis`, `Old`, `Copy`, `_new`, `_old`, ou un chiffre
 * de version en fin de nom (ex. `FinancialSummary2`, `HomeBis`, `MarchandAccueilV2`).
 *
 * Une seule version. Toujours. Un doublon légitime temporaire s'ajoute à
 * ALLOWLIST avec un lien vers la dette qui le résorbe — jamais en silence.
 *
 * Usage : node scripts/check-no-duplicates.mjs
 */
import { execSync } from 'node:child_process';
import path from 'node:path';

const ALLOWLIST = new Set([
  // 'ExempleV2',  // → DETTE.md #N (résorption prévue)
]);

const FORBIDDEN = [
  /(?:V\d+)$/,          // MonEcranV2, ServiceV3
  /(?:New|Bis|Old|Copy)$/i,
  /_(?:new|old|copy|v\d+)$/i,
  /(?<=[A-Za-z])[2-9]$/, // FinancialSummary2, Home2
];

// --cached (suivis) + --others --exclude-standard (nouveaux fichiers non encore
// commités, hors .gitignore) : on attrape aussi ce qu'un dev vient d'ajouter.
const files = execSync('git ls-files --cached --others --exclude-standard "frontend_src/*.ts" "frontend_src/*.tsx" "backend/*.ts"', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((f) => !f.includes('node_modules') && !f.endsWith('.d.ts') && !f.endsWith('.spec.ts') && !f.endsWith('.test.ts'));

const offenders = [];
for (const f of files) {
  const base = path.basename(f).replace(/\.(tsx?|jsx?)$/, '');
  if (ALLOWLIST.has(base)) continue;
  if (FORBIDDEN.some((re) => re.test(base))) offenders.push(f);
}

if (offenders.length) {
  console.error('\n❌ GARDE-FOU ANTI-DOUBLON — Constitution §1/§4 violée.\n');
  console.error('Ces fichiers portent un nom de doublon versionné (interdit) :');
  for (const o of offenders) console.error('   • ' + o);
  console.error('\nUne fonctionnalité = une implémentation. Fusionne dans la version');
  console.error('unique et supprime le doublon (ou, exceptionnellement, ajoute-le à');
  console.error('ALLOWLIST avec un lien vers la dette qui le résorbe).\n');
  process.exit(1);
}

console.log(`✅ Anti-doublon : ${files.length} fichiers scannés, aucun doublon versionné.`);
