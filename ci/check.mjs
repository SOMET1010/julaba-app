#!/usr/bin/env node
/**
 * LE SCRIPT « CHECK » — cadre de travail, 05/10/2026.
 *
 * Un seul point d'entrée avant chaque push, et branché sur la CI.
 *
 * ── CE QUI GUIDE SA FORME ────────────────────────────────────────────────
 *
 * 1. IL EXÉCUTE TOUT, PUIS CONCLUT. Pas de `&&` en chaîne. La leçon est
 *    récente et chère : `verify` était une chaîne de 129 `&&`, elle s'arrêtait
 *    au 59ᵉ maillon sur des rouges permanents, et 70 gardes ne tournaient
 *    jamais — dont trois gardes d'argent déjà rouges que personne n'avait
 *    vues (VER-01, 03/10/2026). Un contrôle qui s'arrête au premier échec
 *    cache tout ce qui suit.
 *
 * 2. UN OUTIL ABSENT N'EST PAS UN SUCCÈS. C'est le piège symétrique : un
 *    check qui passe parce qu'il n'a rien pu vérifier est pire qu'un check
 *    rouge, parce qu'il rassure. Une catégorie sans outil est marquée
 *    « ABSENT » et fait échouer le script, avec la commande pour l'installer.
 *
 * 3. LES SEUILS SONT AU NIVEAU ACTUEL DU DÉPÔT, PAS AU NIVEAU IDÉAL. Le but
 *    de ce lot est d'empêcher l'AGGRAVATION, pas de corriger 873 fichiers
 *    d'un coup. Les seuils se resserrent quand la dette baisse — jamais
 *    l'inverse.
 *
 * Usage :  npm run check
 *          npm run check -- --rapide   (saute les contrôles lents)
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RAPIDE = process.argv.includes('--rapide');

/** `npx --no-install` : on ne télécharge RIEN au vol. Un outil se déclare en
 *  dépendance, sinon la CI et la machine d'un développeur ne contrôlent pas
 *  la même chose. */
function dispo(binaire) {
  const r = spawnSync('npx', ['--no-install', binaire, '--version'], {
    cwd: RACINE, stdio: 'ignore', shell: false,
  });
  return r.status === 0;
}

const resultats = [];

function etape({ nom, cwd = RACINE, commande, args, outil, lent = false, obligatoire = true }) {
  if (lent && RAPIDE) {
    resultats.push({ nom, etat: 'saute', detail: '--rapide' });
    console.log(`⏭  ${nom} — sauté (--rapide)`);
    return;
  }
  if (outil && !dispo(outil)) {
    resultats.push({ nom, etat: 'absent', detail: `outil « ${outil} » non installé`, obligatoire });
    console.log(`⚠️  ${nom} — OUTIL ABSENT (${outil})`);
    return;
  }
  const t0 = Date.now();
  const r = spawnSync(commande, args, { cwd, stdio: 'inherit', shell: false });
  const s = Math.round((Date.now() - t0) / 1000);
  if (r.status === 0) {
    resultats.push({ nom, etat: 'vert' });
    console.log(`✅ ${nom} (${s} s)`);
  } else {
    resultats.push({ nom, etat: 'rouge', detail: `code ${r.status}`, obligatoire });
    console.log(`❌ ${nom} — code ${r.status} (${s} s)`);
  }
}

console.log('\n══ CHECK ══════════════════════════════════════════════════════\n');

// ── Typage ────────────────────────────────────────────────────────────────
etape({ nom: 'typecheck · frontend_src', cwd: join(RACINE, 'frontend_src'),
        commande: 'npx', args: ['tsc', '--noEmit'] });
etape({ nom: 'typecheck · backend', cwd: join(RACINE, 'backend'),
        commande: 'npx', args: ['tsc', '--noEmit', '-p', 'tsconfig.json'] });

// ── Lint : taille, complexité, imports circulaires ────────────────────────
if (existsSync(join(RACINE, 'eslint.config.mjs'))) {
  etape({ nom: 'lint · taille, complexité, cycles', outil: 'eslint',
          commande: 'npx', args: ['eslint', '.', '--max-warnings', '0'] });
} else {
  resultats.push({ nom: 'lint', etat: 'absent', detail: 'eslint.config.mjs manquant', obligatoire: true });
  console.log('⚠️  lint — eslint.config.mjs manquant');
}

// ── Code mort et dépendances inutilisées ──────────────────────────────────
// MESURÉ LE 05/10 : 396 problèmes — 41 fichiers non utilisés, 55 dépendances
// inutilisées, 239 exports non lus, 28 exports en double. Le plafond est à 400,
// juste au-dessus : il empêche l'aggravation sans rien bloquer, et se resserre
// quand la dette baisse. Le détail est dans STATUS.md.
etape({ nom: 'code mort · knip (plafond 400)', outil: 'knip', lent: true,
        commande: 'npx', args: ['knip', '--no-progress', '--max-issues', '400'] });

// ── Duplication ───────────────────────────────────────────────────────────
etape({ nom: 'duplication · jscpd', outil: 'jscpd', lent: true,
        commande: 'npx', args: ['jscpd', '--config', '.jscpd.json'] });

// ── Les gardes du produit, qui existaient avant ce cadre ──────────────────
etape({ nom: 'tests unitaires · backend', cwd: join(RACINE, 'backend'), lent: true,
        commande: 'npx', args: ['jest', '-c', 'jest-unit.config.cjs', '--silent'] });

// `garde-argent` sort en 1 sur l'état de référence CONNU (empreintes figées en
// attente d'un arbitrage du propriétaire). On l'exécute pour le VOIR, et on ne
// le compte pas comme bloquant : son rôle est de signaler un ÉCART, et l'écart
// courant est documenté dans STATUS.md.
etape({ nom: 'garde-argent (informatif)', obligatoire: false,
        commande: 'node', args: ['ci/garde-argent.mjs'] });

// ── Bilan ─────────────────────────────────────────────────────────────────
const rouges = resultats.filter((r) => r.etat === 'rouge' && r.obligatoire !== false);
const absents = resultats.filter((r) => r.etat === 'absent' && r.obligatoire !== false);
const informatifs = resultats.filter((r) => r.etat === 'rouge' && r.obligatoire === false);

console.log('\n' + '─'.repeat(64));
console.log(`CHECK — ${resultats.filter((r) => r.etat === 'vert').length} vert(s), ` +
            `${rouges.length} rouge(s), ${absents.length} absent(s), ` +
            `${resultats.filter((r) => r.etat === 'saute').length} sauté(s)`);

if (informatifs.length) {
  console.log('\n🟠 INFORMATIF — écart connu, documenté dans STATUS.md :');
  for (const r of informatifs) console.log(`   · ${r.nom}`);
}
if (absents.length) {
  console.log('\n⚠️  OUTILS ABSENTS — un contrôle qu’on ne peut pas faire n’est pas un contrôle :');
  for (const r of absents) console.log(`   · ${r.nom} — ${r.detail}`);
  console.log('\n   npm install  (à la racine) installe les outils déclarés.');
}
if (rouges.length) {
  console.log('\n❌ À CORRIGER :');
  for (const r of rouges) console.log(`   · ${r.nom} — ${r.detail}`);
}
if (!rouges.length && !absents.length) console.log('\n✅ Tout est vert.\n');

process.exit(rouges.length + absents.length === 0 ? 0 : 1);
