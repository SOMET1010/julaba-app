#!/usr/bin/env node
/**
 * SCHEMA-PILOTE — le gate de sortie du schéma pour l'APK terrain.
 *
 * POURQUOI. SCHEMA-01/02/03 décrivent une doctrine de schéma multiple —
 * migrations TypeORM, `DbInitService`, `synchronize` depuis les entités. Ce
 * mécanisme a produit TROIS défauts distincts :
 *   • B1       — `stock_mouvements.type` absent    ⇒ toute annulation échouait ;
 *   • STK-01   — `stock_operation_idempotency`     ⇒ toute modification de stock ;
 *   • SCHEMA-07 — cinq colonnes de `bpay_transactions` ⇒ tout paiement B-Pay.
 * Les deux premiers ont été trouvés à l'usage. Le troisième a été trouvé par le
 * garde-fou au niveau COLONNE que ce gate a introduit — c'est-à-dire par ce
 * gate, avant le terrain. C'est exactement ce à quoi il sert.
 *
 * CE QUE CE GATE PROUVE, et rien d'autre :
 *   1. un seul chemin construit la base du pilote (entités → synchronize → DbInit) ;
 *   2. tout ce que le code écrit en SQL brut — tables ET colonnes — existe après ;
 *   3. un second démarrage ne modifie ni ne casse le schéma ;
 *   4. les invariants complets passent sur cette base reconstruite ;
 *   5. le schéma est FIGÉ : le modifier sans rejouer ce gate fait échouer la suite.
 *
 * CE QU'IL NE PROUVE PAS. Il ne referme pas SCHEMA-01/02/03 : la doctrine reste
 * multiple. Il rend le risque NON ATTEIGNABLE pour cette sortie par un chemin
 * figé et vérifié. La dette architecturale, elle, reste ouverte au registre.
 *
 * USAGE
 *   node scripts/schema-pilote.mjs           vérifie (échoue si le schéma a bougé)
 *   node scripts/schema-pilote.mjs --figer   reconstruit, vérifie, PUIS gèle
 */
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const EMPREINTE = join(RACINE, 'docs', 'schema', 'EMPREINTE-PILOTE.json');
const figer = process.argv.includes('--figer');

const titre = (n, t) => console.log(`\n\u001b[1m[${n}/5] ${t}\u001b[0m`);
const ok = (m) => console.log(`  ✓ ${m}`);
const ko = (m) => { console.error(`  ✗ ${m}`); process.exit(1); };

function courir(cmd, cwd = RACINE) {
  return execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}

console.log('\u001b[1mSCHEMA-PILOTE — gate de sortie du schéma\u001b[0m');
if (figer) console.log('Mode : RECONSTRUCTION + GEL');

// ── 1. Base jetable reconstruite par le SEUL chemin autorisé ───────────────
titre(1, 'Reconstruction d’une base vierge par le seul chemin autorisé');
try {
  courir('./scripts/pg-test-local.sh start');
  ok('PostgreSQL de test disponible');
} catch (e) {
  ko(`PostgreSQL de test indisponible : ${e.message}`);
}
// `globalSetup` des invariants fait DROP + CREATE : la base est réellement
// vierge, et chaque spec la bâtit par `synchronize` + `DbInit` — sans jamais
// appliquer de migration. C'est le chemin du pilote, pas une imitation.
ok('base recréée à chaque exécution (DROP + CREATE), sans migration');

// ── 2 & 3. Garde-fou exhaustif + second démarrage ──────────────────────────
titre(2, 'Garde-fou tables ET colonnes, puis second démarrage');
let sortie;
try {
  sortie = courir('npm run test:invariants -w backend -- schema-pilote');
} catch (e) {
  sortie = (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? '');
  if (!figer) {
    console.error(sortie.split('\n').filter((l) => /✕|Error|schéma a changé/.test(l)).join('\n'));
    ko('le gate de schéma échoue — voir ci-dessus');
  }
  // En mode --figer, l'échec attendu est celui de l'empreinte : on continue
  // pour la (re)produire, mais on refuse si autre chose a échoué.
  const autres = sortie.split('\n').filter((l) => l.includes('✕') && !l.includes('empreinte figée'));
  if (autres.length) {
    console.error(autres.join('\n'));
    ko('des vérifications autres que l’empreinte ont échoué — on ne gèle pas un schéma non prouvé');
  }
  ok('seule l’empreinte manque ou diffère : c’est ce que --figer va produire');
}
if (sortie.includes('✕') === false) ok('tables, colonnes et second démarrage : vérifiés');

// ── 4. Le gel ──────────────────────────────────────────────────────────────
if (figer) {
  titre(3, 'Gel de l’empreinte du schéma');
  const lire = `
    const { DataSource } = require('typeorm');
    const { TEST_DB } = require('./test/invariants/test-db');
    (async () => {
      const ds = new DataSource({ type: 'postgres', host: TEST_DB.host, port: TEST_DB.port,
        username: TEST_DB.user, password: TEST_DB.password, database: TEST_DB.name });
      await ds.initialize();
      const lignes = await ds.query(
        "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, column_name");
      const parTable = {};
      for (const l of lignes) (parTable[l.table_name] ||= []).push(l.column_name);
      console.log(JSON.stringify({
        genereLe: new Date().toISOString().slice(0, 10),
        tables: Object.keys(parTable).length,
        colonnes: lignes.length,
        parTable,
      }, null, 2));
      await ds.destroy();
    })();`;
  writeFileSync(join(RACINE, 'backend', '.schema-pilote-lecture.cjs'), lire);
  let json;
  try {
    json = courir('npx ts-node -T --compiler-options \'{"module":"commonjs"}\' -e "require(\'./.schema-pilote-lecture.cjs\')"', join(RACINE, 'backend'));
  } catch (e) {
    ko(`lecture du schéma impossible : ${(e.stderr || e.stdout || e).toString().slice(0, 400)}`);
  }
  const debut = json.indexOf('{');
  mkdirSync(dirname(EMPREINTE), { recursive: true });
  writeFileSync(EMPREINTE, json.slice(debut).trim() + '\n');
  const e = JSON.parse(json.slice(debut));
  ok(`empreinte gelée : ${e.tables} tables, ${e.colonnes} colonnes → docs/schema/EMPREINTE-PILOTE.json`);
  courir('rm -f backend/.schema-pilote-lecture.cjs');
}

// ── 5. Les invariants complets sur cette base ──────────────────────────────
titre(figer ? 4 : 3, 'Invariants complets sur la base reconstruite');
try {
  const inv = courir('npm run test:invariants -w backend');
  const m = inv.match(/Tests:\s+(\d+) passed, (\d+) total/);
  ok(m ? `${m[1]}/${m[2]} invariants verts` : 'invariants verts');
} catch (e) {
  console.error(((e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? ''))
    .split('\n').filter((l) => /✕|^FAIL|Tests:/.test(l)).join('\n'));
  ko('les invariants échouent sur la base reconstruite');
}

// ── 6. Le gel tient ────────────────────────────────────────────────────────
titre(figer ? 5 : 4, 'Le schéma figé tient');
try {
  courir('npm run test:invariants -w backend -- schema-pilote');
  ok('le schéma correspond à l’empreinte figée');
} catch (e) {
  console.error(((e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? ''))
    .split('\n').filter((l) => /✕|schéma a changé/.test(l)).join('\n'));
  ko('le schéma ne correspond pas à l’empreinte figée');
}

console.log('\n\u001b[32m\u001b[1m✓ SCHEMA-PILOTE : le chemin de déploiement du pilote est prouvé et figé.\u001b[0m');
console.log('  Toute évolution de DbInit ou des migrations doit rejouer ce gate :');
console.log('    node scripts/schema-pilote.mjs --figer\n');
