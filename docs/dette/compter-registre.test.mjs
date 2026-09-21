#!/usr/bin/env node
/**
 * LE COMPTEUR DU REGISTRE RECONNAÎT-IL TOUS LES IDENTIFIANTS ?
 * Lancer : npm run test:compter-registre -w frontend_src
 *
 * POURQUOI CE FICHIER EXISTE. Le compte du registre est lu comme un fait
 * (« 113 lignes — 47 / 5 / 61 ») et sert à juger l'avancement. Un identifiant
 * que le motif ne reconnaît pas n'est pas signalé comme mal formé : il est
 * **ignoré en silence**. Une dette peut donc exister, être écrite, et ne
 * jamais être comptée — c'est ce qui est arrivé au lot B7 : une ligne nommée
 * `I18N-01` n'aurait jamais compté, parce que le motif exigeait des LETTRES
 * avant le numéro et que « I18N » contient des chiffres.
 *
 * Ce test vérifie le MOTIF sur des identifiants choisis, et le compte réel du
 * registre sur un fichier jetable — jamais sur le registre du jour, qui bouge
 * à chaque lot.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const COMPTEUR = join(ICI, 'compter-registre.mjs');

let echecs = 0;
const verifier = (quoi, ok, pourquoi) => {
  if (ok) { console.log(`  ✓ ${quoi}`); return; }
  echecs++;
  console.log(`  ✗ ${quoi}`);
  if (pourquoi) console.log(`      ${pourquoi}`);
};

const bacs = [];
/** Compte un registre jetable ; rend la sortie du VRAI script. */
function compter(lignes) {
  const dir = mkdtempSync(join(tmpdir(), 'registre-'));
  bacs.push(dir);
  const f = join(dir, 'REGISTRE.md');
  writeFileSync(f, [
    '# Registre jetable',
    '',
    '| ID | Gravité | Statut | Constat | Correctif | Reste |',
    '|---|---|---|---|---|---|',
    ...lignes,
    '',
  ].join('\n'));
  return execFileSync('node', [COMPTEUR, f], { encoding: 'utf8' });
}

const ligne = (id, statut) => `| **${id}** | P1 | **${statut}** | constat | correctif | reste |`;
const nombre = (sortie, statut) => {
  const m = sortie.match(new RegExp(`^\\s*(\\d+)\\s+${statut}$`, 'm'));
  return m ? Number(m[1]) : null;
};
const total = (sortie) => {
  const m = sortie.match(/^\s*(\d+)\s+LIGNES AU TOTAL$/m);
  return m ? Number(m[1]) : null;
};

console.log('\nCOMPTEUR DU REGISTRE — quels identifiants sont vus\n');

console.log('[1] Un identifiant qui contient des chiffres DANS son préfixe');
{
  // Le cas réel : I18N-01 et I18N-02, que le registre décrit depuis la
  // révision 26 et qu'une ligne de tableau n'a jamais pu porter.
  const s = compter([ligne('I18N-01', 'OUVERT'), ligne('I18N-02', 'OUVERT')]);
  verifier('`I18N-01` et `I18N-02` sont comptées', total(s) === 2, s);
  verifier('et elles comptent comme OUVERT', nombre(s, 'OUVERT') === 2, s);
  verifier('sans être signalées mal formées', !/MAL FORMÉE/.test(s) || !/I18N/.test(s), s);
}

console.log('\n[2] Ce que le motif reconnaissait déjà, et doit continuer à reconnaître');
{
  const s = compter([
    ligne('ARG-11', 'OUVERT'),
    ligne('OFF-01', 'FERMÉ'),
    ligne('AUTH-RECOVERY-01', 'OUVERT'),
    ligne('SEC-08b', 'OUVERT'),
    ligne('SCHEMA-05', 'HORS PÉRIMÈTRE JUSTIFIÉ'),
  ]);
  verifier('les identifiants simples, composés et suffixés sont comptés', total(s) === 5, s);
  verifier('répartis sur les trois statuts',
    nombre(s, 'OUVERT') === 3 && nombre(s, 'FERMÉ') === 1 && nombre(s, 'HORS PÉRIMÈTRE JUSTIFIÉ') === 1, s);
}

console.log('\n[3] Les trois identifiants composites historiques, comptés par tolérance');
{
  const s = compter([
    '| **ARG-01 / B3** | P1 | **OUVERT** | constat | correctif | reste |',
    '| **ARG-02 / B2** | P1 | **FERMÉ** | constat | correctif | reste |',
    '| **ARG-12 / I5 réel** | P1 | **OUVERT** | constat | correctif | reste |',
  ]);
  verifier('les trois composites restent comptés', total(s) === 3, s);
  verifier('et restent signalés comme mal formés, pas ignorés',
    (s.match(/identifiant composite/g) || []).length === 3, s);
}

console.log('\n[4] Ce qui ne doit PAS devenir une ligne de dette');
{
  // Une ligne de tableau ordinaire (annexe, sujet, en-tête) ne porte pas
  // d'identifiant : l'élargissement du motif ne doit pas se mettre à l'attraper.
  const s = compter([
    '| Lot B2 | P1 | **OUVERT** | une annexe, pas une dette | — | — |',
    '| 2026-09-21 | P1 | **OUVERT** | une date | — | — |',
    '| frontend_src/src | P1 | **FERMÉ** | un chemin | — | — |',
    ligne('OFF-02', 'OUVERT'),
  ]);
  verifier('seule la vraie ligne de dette est comptée', total(s) === 1, s);
}

for (const d of bacs) { try { rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ } }

console.log(echecs === 0
  ? '\nLe compteur voit tous les identifiants, et rien de plus ✅\n'
  : `\n${echecs} échec(s) ❌\n`);
process.exit(echecs ? 1 : 0);
