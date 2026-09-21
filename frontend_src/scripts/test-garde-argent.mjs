#!/usr/bin/env node
/**
 * GARDE-ARGENT — les scénarios qui prouvent que le garde-fou du chemin d'argent
 * fait bien ce qu'il promet. Lancer : npm run test:garde-argent -w frontend_src
 *
 * POURQUOI CE FICHIER EXISTE. Une refonte d'interface a modifié `handlePay`,
 * réécrit `enregistrerVente`, touché le contrôleur de caisse backend, et
 * AFFAIBLI un garde-fou existant (`caisseUnSeulMicro.test.mts`, assertion
 * remplacée par un OR) pour passer. Un garde-fou qui se contente d'une liste de
 * chemins n'aurait rien vu : la liste aurait dérivé en silence. Ces scénarios
 * rejouent exactement ces gestes et EXIGENT le rouge.
 *
 * MÉTHODE — bac à sable, pas le dépôt. Chaque scénario construit un DÉPÔT GIT
 * JETABLE minuscule (une caisse, un contexte, un contrôleur, deux gardes) dans
 * un répertoire temporaire, y fige le périmètre, puis y joue UN commit et
 * appelle `ci/garde-argent.mjs --racine <bac à sable>`. On teste le MÉCANISME,
 * pas le contenu du jour : le jour où POSCaisse.tsx sera réécrit, ces scénarios
 * resteront vrais. Aucun réseau, aucune base, aucun `npm install`.
 *
 * Ce fichier n'entre PAS dans `test:ci` (chaîne GELÉE). Il vit dans `verify`.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE_DEPOT = join(ICI, '..', '..');
const GATE = join(RACINE_DEPOT, 'ci', 'garde-argent.mjs');

let echecs = 0;
const verifier = (quoi, ok, pourquoi) => {
  if (ok) { console.log(`  ✓ ${quoi}`); return; }
  echecs++;
  console.log(`  ✗ ${quoi}`);
  if (pourquoi) console.log(`      ${pourquoi}`);
};

// ── Bac à sable ────────────────────────────────────────────────────────────
const bacs = [];
function ecrire(racine, rel, contenu) {
  const cible = join(racine, rel);
  mkdirSync(dirname(cible), { recursive: true });
  writeFileSync(cible, contenu);
}
function git(racine, ...args) {
  return execFileSync('git', args, { cwd: racine, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Un dépôt jetable qui ressemble à JULABA en miniature, périmètre déjà figé. */
function bacASable() {
  const racine = mkdtempSync(join(tmpdir(), 'garde-argent-'));
  bacs.push(racine);

  // — Le chemin d'argent en miniature —
  ecrire(racine, 'frontend_src/src/app/contexts/CaisseContext.tsx', `
import { enregistrerVente } from '../services/api/caisse-api';
export const CaisseContext = createContext(null);
export function CaisseProvider() {
  // file d'attente hors ligne : offlineCaisse, rejeu par idempotency_key
  const cle = crypto.randomUUID(); // idempotency_key
  return enregistrerVente({ idempotency_key: cle });
}
`);
  ecrire(racine, 'frontend_src/src/app/services/api/caisse-api.ts', `
// module caisse-api : le seul chemin vers le serveur d'argent
export async function enregistrerVente(data) { return post('/caisse/vente', data); }
export async function enregistrerDepense(data) { return post('/caisse/depense', data); }
`);
  ecrire(racine, 'frontend_src/src/app/components/marchand/POSCaisse.tsx', `
import { CaisseContext } from '../../contexts/CaisseContext';
import { decomposerMonnaie } from '../../utils/fcfa';
export function POSCaisse() {
  const handlePay = async () => {
    const rendu = decomposerMonnaie(1000);
    await enregistrerVente({ mode_paiement: 'especes', rendu });
  };
  return null;
}
`);
  ecrire(racine, 'frontend_src/src/app/utils/fcfa.ts', `
export function decomposerMonnaie(montant) { return [montant]; }
`);
  ecrire(racine, 'backend/src/caisse-rest/caisse-rest.controller.ts', `
// écrit dans caisse_transactions et rend la marchandise via restituerStock
export class CaisseRestController {
  async enregistrerVente() {}
  async annulerVente() { return restituerStock(); }
}
`);
  // — Un fichier d'interface SANS argent : il doit laisser le gate silencieux —
  ecrire(racine, 'frontend_src/src/app/components/marchand/Bandeau.tsx', `
export function Bandeau() {
  return <div className="rounded-xl bg-white p-4 shadow">Bonjour</div>;
}
`);
  // — Deux gardes, de deux familles différentes —
  ecrire(racine, 'frontend_src/src/app/components/marchand/caisseUnSeulMicro.test.mts', `
let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label); else { console.log("  ❌", label); failures++; }
}
const barre = "ROUTES_SANS_TATA = ['/marchand/caisse']";
ok(/ROUTES_SANS_TATA/.test(barre), "la BottomBar porte une liste ROUTES_SANS_TATA");
ok(/'\\/marchand\\/caisse'/.test(barre), "qui contient '/marchand/caisse'");
ok(barre.length > 0, "le bouton Tata est rendu sous la garde !tataMasquee");
ok(!barre.includes("return null"), "la barre elle-même n'est PAS retirée");
if (failures > 0) process.exit(1);
`);
  ecrire(racine, 'frontend_src/scripts/test-paiement.mjs', `
let echecs = 0;
const verifier = (quoi, ok, pourquoi) => {
  if (ok) { console.log('  ✓ ' + quoi); return; }
  echecs++; console.log('  ✗ ' + quoi); if (pourquoi) console.log('      ' + pourquoi);
};
verifier('le paiement passe par une seule fonction', true, 'sinon deux caisses.');
verifier('le rendu de monnaie est calculé une seule fois', true);
if (echecs > 0) process.exit(1);
`);
  ecrire(racine, 'backend/test/invariants/i2-idempotence-vente.spec.ts', `
describe('Invariant I2 — idempotence de la vente', () => {
  it('même idempotency_key rejoué ⇒ UNE transaction ET UN seul décrément', async () => {
    expect(1).toBe(1);
    expect(2).toBe(2);
  });
  it.failing('deux marchandes, même clé brute ⇒ pas de 409', async () => {
    expect(3).toBe(3);
  });
});
`);
  ecrire(racine, 'frontend_src/package.json', JSON.stringify({
    name: 'fixture-frontend',
    scripts: {
      verify: 'npm run test:caisse-un-seul-micro && npm run test:paiement-fixture',
      'test:caisse-un-seul-micro': 'tsx src/app/components/marchand/caisseUnSeulMicro.test.mts',
      'test:paiement-fixture': 'node scripts/test-paiement.mjs',
      'test:ci': 'npm run test:a && npm run test:b',
      'test:a': 'true',
      'test:b': 'true',
    },
  }, null, 2) + '\n');

  // — Le périmètre écrit à la main (symboles + invariants + chaîne gelée) —
  ecrire(racine, 'ci/PERIMETRE-ARGENT.json', JSON.stringify({
    zones: {
      paiement: 'Le geste qui prend l’argent.',
      'enregistrement-vente': 'Ce qui grave la vente.',
      'caisse-context': 'La source de vérité de la caisse.',
      'api-caisse': 'Le seul chemin vers le serveur d’argent.',
      stock: 'La marchandise qui part et qui revient.',
      idempotence: 'Ce qui empêche de compter deux fois.',
      'offline-synchronisation': 'L’argent encaissé sans réseau.',
      'calcul-financier': 'Toute arithmétique de monnaie.',
    },
    racinesScannees: ['frontend_src/src', 'backend/src'],
    symboles: [
      { symbole: 'handlePay', zone: 'paiement', argent: 'Le geste qui prend l’argent.' },
      { symbole: 'mode_paiement', zone: 'paiement', argent: 'Le mode de règlement.' },
      { symbole: 'enregistrerVente', zone: 'enregistrement-vente', argent: 'Grave la vente.' },
      { symbole: 'enregistrerDepense', zone: 'enregistrement-vente', argent: 'Grave la dépense.' },
      { symbole: 'caisse_transactions', zone: 'enregistrement-vente', argent: 'Le registre.' },
      { symbole: 'CaisseContext', zone: 'caisse-context', argent: 'La source de vérité.' },
      { symbole: 'caisse-api', zone: 'api-caisse', argent: 'Le seul chemin serveur.' },
      { symbole: 'restituerStock', zone: 'stock', argent: 'Rend la marchandise.' },
      { symbole: 'idempotency_key', zone: 'idempotence', argent: 'Empêche le double compte.' },
      { symbole: 'offlineCaisse', zone: 'offline-synchronisation', argent: 'File hors ligne.' },
      { symbole: 'decomposerMonnaie', zone: 'calcul-financier', argent: 'Rendu de monnaie.' },
    ],
    invariants: {
      paiement: [{ commande: 'npm run test:caisse-un-seul-micro -w frontend_src', script: 'test:caisse-un-seul-micro' }],
      'enregistrement-vente': [{ commande: 'npm run test:paiement-fixture -w frontend_src', script: 'test:paiement-fixture' }],
      'caisse-context': [{ commande: 'npm run test:paiement-fixture -w frontend_src', script: 'test:paiement-fixture' }],
      'api-caisse': [{ commande: 'npm run test:paiement-fixture -w frontend_src', script: 'test:paiement-fixture' }],
      stock: [{ commande: 'npm run test:paiement-fixture -w frontend_src', script: 'test:paiement-fixture' }],
      idempotence: [{ commande: 'npm run test:paiement-fixture -w frontend_src', script: 'test:paiement-fixture' }],
      'offline-synchronisation': [{ commande: 'npm run test:paiement-fixture -w frontend_src', script: 'test:paiement-fixture' }],
      'calcul-financier': [{ commande: 'npm run test:caisse-un-seul-micro -w frontend_src', script: 'test:caisse-un-seul-micro' }],
    },
    chaineTestCiGelee: { ref: 'fixture', valeur: 'npm run test:a && npm run test:b' },
    noyau: {},
  }, null, 2) + '\n');
  ecrire(racine, 'ci/EMPREINTE-GARDES.json', JSON.stringify({ gardes: {} }, null, 2) + '\n');

  git(racine, 'init', '-q', '-b', 'main');
  git(racine, 'config', 'user.email', 'bac@julaba.test');
  git(racine, 'config', 'user.name', 'Bac a sable');
  git(racine, 'add', '-A');
  git(racine, 'commit', '-q', '-m', 'fixture: chemin d’argent en miniature');

  // Gel initial — autorisé hors du dépôt réel (bac à sable jetable).
  for (const arg of ['--figer-perimetre', '--figer-gardes']) {
    const g = gateVerbeux(racine, [arg]);
    if (g.code !== 0) verifier(`le gel ${arg} réussit dans le bac à sable`, false, g.sortie.slice(0, 600));
  }
  git(racine, 'add', '-A');
  git(racine, 'commit', '-q', '--allow-empty', '-m', 'fixture: périmètre et empreinte des gardes figés');
  return racine;
}

/**
 * Lance le gate sur un bac à sable. Rend { code, sortie }.
 * `GARDE_ARGENT_VERBEUX=1` imprime la sortie brute du gate : c'est ce qu'on
 * colle dans un rapport de contre-audit pour montrer ce que le gate DIT.
 */
function gate(racine, args) {
  try {
    const sortie = execFileSync(process.execPath, [GATE, '--racine', racine, ...args], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: 'true' },
    });
    return { code: 0, sortie };
  } catch (e) {
    if (e.code === 'ENOENT' || /Cannot find module/.test(String(e.message))) {
      return { code: 127, sortie: `GATE ABSENT : ${GATE}\n${e.message}` };
    }
    return { code: e.status ?? 1, sortie: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}
const gateOrig = gate;
function gateVerbeux(racine, args) {
  const r = gateOrig(racine, args);
  if (process.env.GARDE_ARGENT_VERBEUX) console.log(`\n--- gate ${args.join(' ')} → sortie ${r.code}\n${r.sortie}---\n`);
  return r;
}

function commit(racine, message) {
  git(racine, 'add', '-A');
  git(racine, 'commit', '-q', '--allow-empty', '-m', message);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\nGARDE-ARGENT — quatre gestes rejoués sur un dépôt jetable\n');

// ── Scénario 1 — du style, rien que du style ───────────────────────────────
console.log('[1] Un commit qui ne touche que du style');
{
  const r = bacASable();
  ecrire(r, 'frontend_src/src/app/components/marchand/Bandeau.tsx', `
export function Bandeau() {
  return <div className="rounded-2xl bg-slate-50 p-6 shadow-lg">Bonjour</div>;
}
`);
  commit(r, 'ui: arrondir le bandeau');
  const { code, sortie } = gateVerbeux(r, ['--base', 'HEAD~1']);
  verifier('le garde-fou reste silencieux (sortie 0)', code === 0, `sortie ${code} :\n${sortie}`);
  verifier('et il le dit : aucun fichier du chemin d’argent',
    /aucun fichier du chemin d’argent/i.test(sortie), sortie);
  verifier('il n’exige aucun invariant', !/INVARIANTS EXIGÉS/.test(sortie), sortie);
}

// ── Scénario 2 — handlePay ─────────────────────────────────────────────────
console.log('\n[2] Un commit qui modifie `handlePay` dans POSCaisse.tsx');
{
  const r = bacASable();
  const p = 'frontend_src/src/app/components/marchand/POSCaisse.tsx';
  ecrire(r, p, readFileSync(join(r, p), 'utf8').replace(
    'const rendu = decomposerMonnaie(1000);',
    'const rendu = decomposerMonnaie(1000); /* reçu obligatoire */ imprimerRecu();'));
  commit(r, 'ui: repenser l’écran de paiement');
  const { code, sortie } = gateVerbeux(r, ['--base', 'HEAD~1']);
  verifier('le chemin d’argent est détecté', /CHEMIN D’ARGENT TOUCHÉ/.test(sortie), sortie);
  verifier('POSCaisse.tsx est nommé', /POSCaisse\.tsx/.test(sortie), sortie);
  verifier('la zone « paiement » est nommée', /\bpaiement\b/.test(sortie), sortie);
  verifier('les invariants exigés sont nommés',
    /INVARIANTS EXIGÉS/.test(sortie) && /test:caisse-un-seul-micro/.test(sortie), sortie);
  verifier('sans preuve d’exécution, la sortie est 1', code === 1, `sortie ${code}`);
  const liste = gateVerbeux(r, ['--base', 'HEAD~1', '--liste-invariants']);
  verifier('--liste-invariants n’imprime que des commandes',
    liste.sortie.trim().split('\n').every((l) => l.startsWith('npm run ')), liste.sortie);
  // Avec la preuve, la sortie redevient 0. Depuis GARDE-03, une preuve est un
  // JOURNAL D'EXECUTION — arbre prouve, codes de sortie — et non une liste de
  // commandes redigee : voir le scenario 9, qui refuse l'ancienne forme.
  const preuve = join(r, 'preuve.json');
  const teteScenario2 = execFileSync('git', ['-C', r, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  writeFileSync(preuve, JSON.stringify({
    version: 1, arbre: teteScenario2, propre: true, base: 'HEAD~1',
    commandes: liste.sortie.trim().split('\n').filter((l) => l.startsWith('npm run '))
      .map((commande) => ({ commande, code: 0, debut: new Date().toISOString(), fin: new Date().toISOString(), dureeMs: 1 })),
  }, null, 2));
  const avec = gateVerbeux(r, ['--base', 'HEAD~1', '--preuve', preuve]);
  verifier('avec la preuve que les invariants ont tourné, la sortie est 0',
    avec.code === 0, `sortie ${avec.code} :\n${avec.sortie}`);
}

// ── Scénario 3 — une assertion retirée d'un garde ──────────────────────────
console.log('\n[3] Un commit qui retire une assertion de caisseUnSeulMicro.test.mts');
{
  const r = bacASable();
  const p = 'frontend_src/src/app/components/marchand/caisseUnSeulMicro.test.mts';
  ecrire(r, p, readFileSync(join(r, p), 'utf8')
    .replace(/ok\(!barre\.includes\("return null"\), "la barre elle-même n'est PAS retirée"\);\n/, ''));
  commit(r, 'ui: simplifier le garde-fou de la barre');
  const { code, sortie } = gateVerbeux(r, ['--base', 'HEAD~1']);
  verifier('le gate échoue (sortie 1)', code === 1, `sortie ${code} :\n${sortie}`);
  verifier('il parle d’assouplissement', /ASSOUPLI/i.test(sortie), sortie);
  verifier('il nomme le garde touché', /caisseUnSeulMicro\.test\.mts/.test(sortie), sortie);
  verifier('il cite l’assertion disparue',
    /la barre elle-même n’est PAS retirée|la barre elle-même n'est PAS retirée/.test(sortie), sortie);
}

// ── Scénario 4 — un fichier neuf qui écrit dans caisse_transactions ────────
console.log('\n[4] Un fichier neuf qui écrit dans `caisse_transactions`, non déclaré');
{
  const r = bacASable();
  ecrire(r, 'backend/src/ledger/journal-ventes.ts', `
export async function graver(m) {
  await m.query("INSERT INTO caisse_transactions (montant) VALUES ($1)", [m.montant]);
}
`);
  commit(r, 'feat: journal des ventes');
  const { code, sortie } = gateVerbeux(r, ['--base', 'HEAD~1']);
  verifier('le gate échoue (sortie 1)', code === 1, `sortie ${code} :\n${sortie}`);
  verifier('il dit que le périmètre a bougé sans déclaration',
    /entré dans le périmètre|PÉRIMÈTRE A BOUGÉ/i.test(sortie), sortie);
  verifier('il nomme le fichier entrant', /backend\/src\/ledger\/journal-ventes\.ts/.test(sortie), sortie);
  verifier('il nomme le symbole qui l’y fait entrer', /caisse_transactions/.test(sortie), sortie);
}

// ── Scénario 5 — it.failing promu en it : une INTRODUCTION, pas un recul ───
console.log('\n[5] `it.failing(...)` promu en `it(...)` — introduction, pas affaiblissement');
{
  const r = bacASable();
  const p = 'backend/test/invariants/i2-idempotence-vente.spec.ts';
  ecrire(r, p, readFileSync(join(r, p), 'utf8').replace('it.failing(', 'it('));
  commit(r, 'fix: la clé brute inter-marchandes ne fait plus 409');
  const { code, sortie } = gateVerbeux(r, ['--base', 'HEAD~1']);
  verifier('la promotion est acceptée (sortie 0)', code === 0, `sortie ${code} :\n${sortie}`);
  verifier('et elle est dite comme telle', /promu|PROMOTION/i.test(sortie), sortie);
}

// ── Scénario 6 — GARDE-ASSOUPLIE : autorisé seul, refusé avec l'argent ─────
console.log('\n[6] `GARDE-ASSOUPLIE:` — jamais dans le commit qui change l’argent');
{
  const r = bacASable();
  const p = 'frontend_src/src/app/components/marchand/caisseUnSeulMicro.test.mts';
  const sansAssertion = readFileSync(join(r, p), 'utf8')
    .replace(/ok\(!barre\.includes\("return null"\), "la barre elle-même n'est PAS retirée"\);\n/, '');
  ecrire(r, p, sansAssertion);
  commit(r, 'test: retirer une garde devenue fausse\n\nGARDE-ASSOUPLIE: la BottomBar ne peut plus se retirer, la règle est ailleurs.');
  const seul = gateVerbeux(r, ['--base', 'HEAD~1']);
  verifier('assouplissement déclaré SEUL : accepté', seul.code === 0, `sortie ${seul.code} :\n${seul.sortie}`);
  verifier('mais l’alerte est imprimée en évidence', /GARDE-ASSOUPLIE/.test(seul.sortie), seul.sortie);

  const r2 = bacASable();
  const p2 = 'frontend_src/src/app/components/marchand/POSCaisse.tsx';
  ecrire(r2, p, readFileSync(join(r2, p), 'utf8')
    .replace(/ok\(!barre\.includes\("return null"\), "la barre elle-même n'est PAS retirée"\);\n/, ''));
  ecrire(r2, p2, readFileSync(join(r2, p2), 'utf8').replace('handlePay', 'handlePayer'));
  commit(r2, 'refonte: caisse\n\nGARDE-ASSOUPLIE: la garde gênait la refonte.');
  const ensemble = gateVerbeux(r2, ['--base', 'HEAD~1']);
  verifier('assouplissement + argent dans le MÊME commit : refusé', ensemble.code === 1,
    `sortie ${ensemble.code} :\n${ensemble.sortie}`);
  verifier('et le refus dit pourquoi',
    /même commit|ne se desserre pas/i.test(ensemble.sortie), ensemble.sortie);
}

// ── Scénario 7 — la chaîne test:ci est gelée ───────────────────────────────
console.log('\n[7] La chaîne `test:ci` est gelée, valeur contre valeur');
{
  const r = bacASable();
  const pkg = JSON.parse(readFileSync(join(r, 'frontend_src/package.json'), 'utf8'));
  pkg.scripts['test:ci'] = 'npm run test:a && npm run test:b && npm run test:nouveau';
  ecrire(r, 'frontend_src/package.json', JSON.stringify(pkg, null, 2) + '\n');
  commit(r, 'test: ajouter un test à la CI');
  const { code, sortie } = gateVerbeux(r, ['--base', 'HEAD~1']);
  verifier('le gate échoue (sortie 1)', code === 1, `sortie ${code} :\n${sortie}`);
  verifier('il nomme le maillon ajouté', /test:nouveau/.test(sortie), sortie);
}

// ── Scénario 9 — une preuve d'argent doit avoir TOURNÉ (GARDE-03) ─────────
//
// Constat du contre-audit du lot B2 : le garde lisait le fichier `--preuve` et
// vérifiait SEULEMENT qu'il contenait les chaînes de commande exigées. Jamais
// qu'elles avaient tourné, ni qu'elles étaient vertes, ni sur quel arbre. Un
// `printf` suffisait à lui faire dire « les invariants exigés ont tourné ».
console.log('\n[9] Une preuve d’argent rédigée à la main est refusée');
{
  const r = bacASable();
  const p = 'frontend_src/src/app/components/marchand/POSCaisse.tsx';
  ecrire(r, p, readFileSync(join(r, p), 'utf8').replace(
    'const rendu = decomposerMonnaie(1000);',
    'const rendu = decomposerMonnaie(1000); /* arrondi */'));
  commit(r, 'ui: retoucher l’écran de paiement');

  const exigees = gateVerbeux(r, ['--base', 'HEAD~1', '--liste-invariants']).sortie;
  const tete = execFileSync('git', ['-C', r, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const lignes = exigees.trim().split('\n').filter((l) => l.startsWith('npm run '));
  const journal = (sur) => lignes.map((commande) => ({
    commande, code: 0, debut: new Date().toISOString(), fin: new Date().toISOString(), dureeMs: 1,
  })).map((c) => ({ ...c, ...sur }));
  const ecrirePreuve = (nom, objet) => {
    const f = join(r, nom);
    writeFileSync(f, typeof objet === 'string' ? objet : JSON.stringify(objet, null, 2));
    return f;
  };

  // (a) LE DÉFAUT HISTORIQUE : la liste de commandes, écrite à la main.
  const aLaMain = ecrirePreuve('preuve-main.txt', exigees);
  const rMain = gateVerbeux(r, ['--base', 'HEAD~1', '--preuve', aLaMain]);
  verifier('une preuve rédigée à la main est REFUSÉE', rMain.code === 1, rMain.sortie);
  verifier('et le garde dit qu’il attend un journal d’exécution',
    /journal d’exécution|journal d'exécution/i.test(rMain.sortie), rMain.sortie);

  // (b) UN JOURNAL VALIDE, produit sur CET arbre, tout vert.
  const bon = ecrirePreuve('preuve-bonne.json', { version: 1, arbre: tete, propre: true, base: 'HEAD~1', commandes: journal({}) });
  const rBon = gateVerbeux(r, ['--base', 'HEAD~1', '--preuve', bon]);
  verifier('un journal d’exécution vert, sur le bon arbre, est accepté', rBon.code === 0, rBon.sortie);

  // (c) UN JOURNAL PÉRIMÉ : produit sur un autre arbre.
  const perime = ecrirePreuve('preuve-perimee.json', { version: 1, arbre: '0'.repeat(40), propre: true, base: 'HEAD~1', commandes: journal({}) });
  const rPerime = gateVerbeux(r, ['--base', 'HEAD~1', '--preuve', perime]);
  verifier('un journal produit sur un AUTRE arbre est refusé', rPerime.code === 1, rPerime.sortie);
  verifier('et le garde nomme l’arbre attendu', /arbre/i.test(rPerime.sortie), rPerime.sortie);

  // (d) UN INVARIANT ROUGE NE PEUT PAS ENTRER DANS LA PREUVE.
  const rouge = journal({});
  rouge[0] = { ...rouge[0], code: 1 };
  const avecRouge = ecrirePreuve('preuve-rouge.json', { version: 1, arbre: tete, propre: true, base: 'HEAD~1', commandes: rouge });
  const rRouge = gateVerbeux(r, ['--base', 'HEAD~1', '--preuve', avecRouge]);
  verifier('un journal qui porte un invariant en échec est refusé', rRouge.code === 1, rRouge.sortie);
  verifier('et le garde nomme la commande rouge',
    rRouge.sortie.includes(rouge[0].commande.split(' ')[2] ?? 'npm'), rRouge.sortie);

  // (e) UN ARBRE SALE NE DÉSIGNE RIEN DE NOMMABLE.
  const sale = ecrirePreuve('preuve-sale.json', { version: 1, arbre: tete, propre: false, base: 'HEAD~1', commandes: journal({}) });
  const rSale = gateVerbeux(r, ['--base', 'HEAD~1', '--preuve', sale]);
  verifier('un journal produit sur un arbre non commité est refusé', rSale.code === 1, rSale.sortie);
}

// ── Scénario 8 — le dépôt réel : périmètre et empreintes à jour ────────────
console.log('\n[8] Le dépôt réel : périmètre figé et empreintes des gardes à jour');
{
  const { code, sortie } = (() => {
    try {
      const s = execFileSync(process.execPath, [GATE], {
        cwd: RACINE_DEPOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, CI: 'true' },
      });
      return { code: 0, sortie: s };
    } catch (e) { return { code: e.status ?? 1, sortie: `${e.stdout ?? ''}${e.stderr ?? ''}` }; }
  })();
  verifier('`node ci/garde-argent.mjs` est vert sur le dépôt', code === 0, sortie);
}

for (const b of bacs) rmSync(b, { recursive: true, force: true });

console.log(echecs === 0
  ? '\n✓ garde-argent — les neuf scénarios tiennent\n'
  : `\n✗ garde-argent — ${echecs} échec(s)\n`);
if (echecs > 0) process.exit(1);
