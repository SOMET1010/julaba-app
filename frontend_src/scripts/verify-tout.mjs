#!/usr/bin/env node
/**
 * `verify` EXÉCUTE TOUS SES MAILLONS — VER-01, 03/10/2026.
 *
 * LE DÉFAUT QU'ON FERME, ET IL DURAIT DEPUIS DES SEMAINES. `verify` était une
 * chaîne de 129 `npm run … && …`. Le 59ᵉ maillon est `test:voix-trace-source`,
 * qui porte les 4 échecs VOICE-01 — des rouges PERMANENTS, voulus, documentés.
 * Un `&&` s'arrête au premier code de retour non nul : les 70 maillons
 * suivants n'étaient donc JAMAIS exécutés. Personne ne le savait.
 *
 * CE QUE LE COUVERCLE CACHAIT, mesuré le 03/10 sur un arbre propre, avant tout
 * correctif du jour : trois maillons étaient DÉJÀ rouges, et ce sont des
 * gardes d'argent —
 *
 *     test:i18n-source              inventaire 408 ≠ source 407
 *     test:i18n-empreintes-argent   « un comportement a changé » sur intentLocal
 *     test:garde-argent             empreinte des gardes
 *
 * Pire : une garde écrite après le 59ᵉ rang était verte à la main et morte
 * dans `verify`. C'est arrivé à `test:credit-hors-pilote`, et ça allait
 * arriver à `test:caisse-accueil-etat` (ACC-03) et `test:produit-dit`
 * (STK-23), écrites le jour même.
 *
 * UNE GARDE QUI NE S'EXÉCUTE PAS N'EST PAS UNE GARDE. Elle est pire qu'absente :
 * elle rassure.
 *
 * CE QUE FAIT CE RUNNER. Il lance les 129 maillons l'un après l'autre, SANS
 * s'arrêter, et rend à la fin la liste exacte des rouges. Il sort en 1 s'il en
 * reste au moins un — le signal d'échec n'est pas affaibli, il est simplement
 * donné APRÈS avoir tout regardé.
 *
 * SÉQUENTIEL, PAS PARALLÈLE. Des bancs écrivent des fichiers d'empreinte, et
 * la maison a déjà sa règle sur le sujet : jamais deux suites d'invariants en
 * même temps. Le temps gagné ne vaut pas un faux rouge.
 *
 * LA LISTE VIT DANS `scripts/maillons-verify.json`, PAS ICI. Une seule source
 * de vérité : `test:maillons-orphelins` refuse tout script `test:*` qui ne
 * serait ni dans `verify`, ni dans `test:ci`, ni déclaré hors-verify avec son
 * motif. C'est ce qui empêche de refaire l'erreur : le 03/10, six bancs
 * n'étaient dans AUCUNE chaîne.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { maillons } = JSON.parse(
  readFileSync(new URL('./maillons-verify.json', import.meta.url), 'utf8'),
);

/** Les rouges attendus, à l'identique du terrain. Ils ne sont PAS tolérés —
 *  `verify` sort quand même en 1 — ils sont seulement SIGNALÉS comme connus,
 *  pour qu'un rouge NOUVEAU se voie au premier coup d'œil. */
const CONNUS = new Map([
  ['test:voix-trace-source', 'VOICE-01 — 4 empreintes figées, refigeage réservé à Patrick'],
  ['test:garde-argent', 'état de référence 4 entrés / 14 perdues'],
  ['test:i18n-source', 'inventaire 408 ≠ source 407 — antérieur au 03/10'],
  ['test:i18n-empreintes-argent', 'empreinte intentLocal — antérieur au 03/10'],
]);

const t0 = Date.now();
const rouges = [];
let n = 0;

for (const maillon of maillons) {
  n++;
  const r = spawnSync('npm', ['run', '--silent', maillon], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    shell: false,
  });
  const vert = r.status === 0;
  if (!vert) rouges.push({ maillon, rang: n, sortie: `${r.stdout ?? ''}${r.stderr ?? ''}` });
  const marque = vert ? '✅' : (CONNUS.has(maillon) ? '🟠' : '❌');
  console.log(`${marque} ${String(n).padStart(3)}/${maillons.length}  ${maillon}`);
}

const nouveaux = rouges.filter(r => !CONNUS.has(r.maillon));
const connus = rouges.filter(r => CONNUS.has(r.maillon));

console.log(`\n${'─'.repeat(72)}`);
console.log(`VERIFY — ${maillons.length - rouges.length} vert(s) / ${rouges.length} rouge(s) sur ${maillons.length}  ·  ${Math.round((Date.now() - t0) / 1000)} s`);

if (connus.length) {
  console.log(`\n🟠 ROUGES CONNUS (${connus.length}) — documentés, pas nouveaux :`);
  for (const r of connus) console.log(`   ${String(r.rang).padStart(3)}. ${r.maillon} — ${CONNUS.get(r.maillon)}`);
}
if (nouveaux.length) {
  console.log(`\n❌ ROUGES NOUVEAUX (${nouveaux.length}) — à traiter :`);
  for (const r of nouveaux) {
    console.log(`   ${String(r.rang).padStart(3)}. ${r.maillon}`);
    const lignes = r.sortie.split('\n').filter(l => /✗|❌|échec|erreur|error|différent|refus/i.test(l)).slice(0, 4);
    for (const l of lignes) console.log(`        ${l.trim().slice(0, 150)}`);
  }
}
// UN RETARDATAIRE DÉCLARÉ RESTE UN RETARDATAIRE. Si un rouge connu redevient
// vert, on veut le savoir : la liste `CONNUS` doit maigrir, pas dormir.
const guerisSansMenage = [...CONNUS.keys()].filter(m => maillons.includes(m) && !rouges.some(r => r.maillon === m));
if (guerisSansMenage.length) {
  console.log(`\n💚 REDEVENUS VERTS — à retirer de CONNUS dans ${'scripts/verify-tout.mjs'} :`);
  for (const m of guerisSansMenage) console.log(`   · ${m}`);
}
console.log(rouges.length === 0 ? '\n✅ Les 129 maillons sont verts.\n' : '');

process.exit(rouges.length === 0 ? 0 : 1);
