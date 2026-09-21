/**
 * OFF-01 (suite) — LE REÇU D'UNE VENTE PAS ENCORE PARTIE LE DIT.
 * Lancer : npm run test:recu-statut   (tsx, sans DOM)
 *
 * LA CONSIGNE DE PATRICK. On garde le bouton de partage du reçu même hors
 * ligne : la vente a réellement eu lieu devant la cliente, et il est utile de
 * lui remettre un reçu. Mais tant que le serveur n'a pas confirmé, le reçu
 * porte explicitement « Vente enregistrée sur ce téléphone — synchronisation
 * en attente. », et n'affiche ni ne suggère JAMAIS un état définitif côté
 * serveur. Après synchronisation, le reçu est le reçu normal.
 *
 * CE QUE CE TEST PROUVE, ET COMMENT. Trois lectures, qui doivent se rejoindre.
 *
 *   1. LE REÇU D'AVANT B2, EXÉCUTÉ. La version de `recu.utils.ts` figée à
 *      `4943ee8` (la base du lot) est relue DANS GIT, détypée par le
 *      compilateur TypeScript et exécutée. Le reçu d'une vente confirmée
 *      d'aujourd'hui doit lui être identique À L'OCTET. Aucune chaîne de
 *      référence n'est recopiée ici : c'est l'ancien code qui la produit.
 *      Même doctrine, et même dégradation, que `ci/garde-argent.mjs` qui relit
 *      la chaîne `test:ci` gelée dans git et se replie en clone superficiel.
 *
 *   2. LA DIFFÉRENCE, MESURÉE. Le reçu en attente doit être le reçu confirmé
 *      PLUS EXACTEMENT UNE LIGNE insérée — comparaison ligne à ligne, dans
 *      l'ordre. Montant, monnaie, lignes, unités, numéro de reçu, date, mode
 *      de paiement et identité sont donc verrouillés par construction, pas
 *      par une liste de champs qu'on aurait pu oublier de citer.
 *
 *   3. LA CHAÎNE RÉELLE DE LA CAISSE. L'objet que `POSCaisse.tsx` passe
 *      VRAIMENT à `partagerRecu` est extrait de son source, évalué avec une
 *      vente en attente, puis donné au VRAI `texteRecu`. Si l'écran cesse de
 *      transmettre le statut, ce test rougit.
 *
 * LE DÉFAUT QU'IL ATTRAPE : le reçu d'une vente qui dort dans la file est mot
 * pour mot celui d'une vente encaissée et confirmée.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { texteRecu } from './recu.utils.js';
import { ligneLisible } from './unite.utils.js';
import { STATUTS_ENREGISTREMENT } from '../types/statutEnregistrement.js';

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log('  ✅', label);
  else { console.log('  ❌', label); failures++; }
}

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..', '..', '..', '..');
const REL_RECU = 'frontend_src/src/app/utils/recu.utils.ts';
const F_ECRAN = join(RACINE, 'frontend_src/src/app/components/marchand/POSCaisse.tsx');
const F_VENTES_PASSEES = join(RACINE, 'frontend_src/src/app/components/marchand/VentesPassees.tsx');
const BASE_DU_LOT = '4943ee8';

/** La ligne EXIGÉE par Patrick, mot pour mot. C'est une exigence littérale de
 *  produit, pas une déduction : elle est donc écrite ici, et c'est le seul
 *  endroit de ce test où une phrase attendue est recopiée. */
const LIGNE_ATTENDUE = 'Vente enregistrée sur ce téléphone — synchronisation en attente.';

/** Ce qu'un reçu ne doit jamais laisser croire tant que le serveur n'a rien dit. */
const MOTS_INTERDITS = [/confirm/i, /synchronis[ée]e\b/i, /\bvalid[ée]e?\b/i, /\benvoy[ée]e?\b/i, /réussie/i];

// ═══════════════════════════════════════════════════════════════════════════
// 1. LE REÇU D'AVANT B2, RELU DANS GIT ET EXÉCUTÉ
// ═══════════════════════════════════════════════════════════════════════════

type Vente = Record<string, unknown>;
type FabriqueRecu = (tx: Vente, marchand: string) => string;

function transpiler(source: string): string {
  return ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  }).outputText;
}

/** Exécute un `recu.utils.ts` (n'importe quelle version) avec sa seule
 *  dépendance injectée, et rend son `texteRecu`. */
function chargerTexteRecu(source: string): FabriqueRecu {
  // Les `import` sont retirés : la seule dépendance réelle est `ligneLisible`,
  // fournie par le module d'unités d'aujourd'hui — on compare des REÇUS, pas
  // deux versions du formatage d'unité.
  const sansImports = source.replace(/^\s*import[^;]*;\s*$/gm, '');
  const js = transpiler(sansImports).replace(/^\s*export\s+/gm, '');
  const fabrique = new Function('deps', `const { ligneLisible } = deps;\n${js}\nreturn texteRecu;`);
  return fabrique({ ligneLisible }) as FabriqueRecu;
}

let texteRecuBase: FabriqueRecu | null = null;
let modeBase = '';
try {
  const source = execFileSync('git', ['-C', RACINE, 'show', `${BASE_DU_LOT}:${REL_RECU}`], { encoding: 'utf8' });
  texteRecuBase = chargerTexteRecu(source);
  modeBase = `code de ${BASE_DU_LOT}, relu dans git et exécuté`;
} catch {
  modeBase = `${BASE_DU_LOT} injoignable dans ce clone (checkout superficiel) — comparaison repliée sur le reçu SANS statut`;
}
console.log(`\nReçu de référence : ${modeBase}`);

/** Le reçu tel que toutes les appelantes d'avant B2 l'obtenaient. */
const recuDAvant: FabriqueRecu = texteRecuBase ?? ((tx, m) => texteRecu(tx as never, m));

// ── Corpus de ventes réelles, de formes variées ─────────────────────────────
const MARCHANDE = 'Awa Koné';
const CORPUS: Array<{ nom: string; vente: Vente }> = [
  {
    nom: 'panier à plusieurs lignes, avec unités',
    vente: {
      id: 'a1b2c3d4e5f6', montant: 4500, mode_paiement: 'Espèces',
      date: '2026-09-21T10:32:00.000Z',
      produits: [
        { nom: 'Tomate', quantite: 3, prix: 500, unite: 'tas' },
        { nom: 'Riz', quantite: 2, prix: 1500, unite: 'sac' },
      ],
    },
  },
  { nom: 'vente sans lignes, avec un libellé', vente: { id: 'zz99', montant: 1000, notes: 'Beignets', date: '2026-09-21T08:00:00.000Z' } },
  { nom: 'vente sans identifiant ni mode de paiement', vente: { montant: 750, date: '2026-09-20T19:05:00.000Z' } },
  { nom: 'vente mobile money, ligne sans unité', vente: { id: 'mm-7', montant: 12000, mode_paiement: 'Orange Money', date: '2026-09-19T12:00:00.000Z', produits: [{ nom: 'Pagne', quantite: 1, prix: 12000 }] } },
];

/** Les lignes ajoutées par `b` par rapport à `a`, si `a` est un sous-ensemble
 *  ORDONNÉ de `b` ; `null` si une ligne a été modifiée, retirée ou déplacée. */
function lignesInserees(a: string, b: string): string[] | null {
  const la = a.split('\n');
  const lb = b.split('\n');
  const ajouts: string[] = [];
  let i = 0;
  for (const ligne of lb) {
    if (i < la.length && ligne === la[i]) i++;
    else ajouts.push(ligne);
  }
  return i === la.length ? ajouts : null;
}

console.log('\n[1] Le reçu CONFIRMÉ ne change pas d’un octet');
for (const cas of CORPUS) {
  const avant = recuDAvant(cas.vente, MARCHANDE);
  const sansStatut = texteRecu(cas.vente as never, MARCHANDE);
  const confirme = texteRecu({ ...cas.vente, statutSynchronisation: 'confirmee' } as never, MARCHANDE);
  ok(sansStatut === avant, `R1 ${cas.nom} — sans statut : identique au reçu d’avant B2`);
  ok(confirme === avant, `R2 ${cas.nom} — statut « confirmee » : identique au reçu d’avant B2, à l’octet`);
}

console.log('\n[2] Le reçu EN ATTENTE le dit, et ne change rien d’autre');
for (const cas of CORPUS) {
  const confirme = texteRecu({ ...cas.vente, statutSynchronisation: 'confirmee' } as never, MARCHANDE);
  const attente = texteRecu({ ...cas.vente, statutSynchronisation: 'en_attente' } as never, MARCHANDE);
  const ajouts = lignesInserees(confirme, attente);
  ok(ajouts !== null && ajouts.length === 1,
    `R3 ${cas.nom} — exactement UNE ligne de plus, toutes les autres intactes et dans l’ordre (${ajouts === null ? 'une ligne a été modifiée ou retirée' : ajouts.length + ' ajout(s)'})`);
  ok(ajouts !== null && ajouts.length === 1 && ajouts[0] === LIGNE_ATTENDUE,
    `R4 ${cas.nom} — et c’est la phrase demandée par Patrick`);
  const fautif = MOTS_INTERDITS.filter((re) => re.test(attente));
  ok(fautif.length === 0,
    `R5 ${cas.nom} — aucun état définitif côté serveur n’est affiché ni suggéré${fautif.length ? ' (' + fautif.join(' ') + ')' : ''}`);
  ok(attente.includes(String(Number(cas.vente.montant).toLocaleString('fr-FR'))),
    `R6 ${cas.nom} — le montant est toujours là, inchangé`);
}

console.log('\n[3] Un seul vocabulaire de statut');
{
  const src = readFileSync(join(RACINE, REL_RECU), 'utf8');
  const litteraux = [...src.matchAll(/===\s*'([a-z_]+)'/g)].map((m) => m[1]);
  const etrangers = litteraux.filter((l) => !(STATUTS_ENREGISTREMENT as readonly string[]).includes(l));
  ok(litteraux.length > 0, 'R7 le reçu teste bien une valeur de statut');
  ok(etrangers.length === 0, `R7 et il n’en invente aucune autre${etrangers.length ? ' (' + etrangers.join(', ') + ')' : ''}`);
  ok(!/statut\s*[?:]|tx\.statut\b/.test(src),
    'R7 le reçu ne lit PAS le champ `statut` d’une transaction (validee/annulee) : deux sens, deux noms');
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. LA CHAÎNE RÉELLE DEPUIS L'ÉCRAN DE CAISSE
// ═══════════════════════════════════════════════════════════════════════════

const srcEcran = readFileSync(F_ECRAN, 'utf8');
const arbre = ts.createSourceFile('POSCaisse.tsx', srcEcran, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function trouver(n: ts.Node, pred: (x: ts.Node) => boolean, acc: ts.Node[] = []): ts.Node[] {
  if (pred(n)) acc.push(n);
  n.forEachChild((c) => { trouver(c, pred, acc); });
  return acc;
}

const appelPartage = trouver(arbre, (n) =>
  ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'partagerRecu') as ts.CallExpression[];

console.log('\n[4] Ce que l’écran de caisse donne VRAIMENT au reçu');
ok(appelPartage.length === 1, `R8 un seul appel à partagerRecu dans l’écran de caisse (${appelPartage.length})`);

if (appelPartage.length === 1) {
  const arg = appelPartage[0].arguments[0];
  const texteArg = arg.getText(arbre);
  /** Évalue l'objet RÉELLEMENT écrit dans l'écran, avec une vente donnée. */
  const fabriqueArg = new Function('lastSale', `return (${transpiler('(' + texteArg + ')').trim().replace(/;$/, '')});`) as (v: unknown) => Vente;
  const base = { montant: 3200, moyen: 'Espèces', monnaie: 0, produits: [{ nom: 'Attiéké', quantite: 2, prix: 1600, unite: 'portion' }] };

  const recuAttente = texteRecu(fabriqueArg({ ...base, statut: 'en_attente' }) as never, MARCHANDE);
  const recuConfirme = texteRecu(fabriqueArg({ ...base, statut: 'confirmee' }) as never, MARCHANDE);
  ok(recuAttente.includes(LIGNE_ATTENDUE), 'R9 vente en attente : l’objet réel de l’écran produit un reçu qui porte le statut');
  ok(!recuConfirme.includes(LIGNE_ATTENDUE), 'R9 vente confirmée : le même objet réel produit le reçu normal');
  const ajouts = lignesInserees(recuConfirme, recuAttente);
  ok(ajouts !== null && ajouts.length === 1, 'R9 et, de bout en bout, la seule différence reste cette ligne');
  ok(MOTS_INTERDITS.every((re) => !re.test(recuAttente)), 'R9 le reçu remis à la cliente ne suggère aucun état serveur définitif');
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. « MES VENTES » — constat vérifié dans le code, inscrit ici
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n[5] « Mes ventes » ne fabrique que des reçus de ventes déjà au serveur');
{
  const src = readFileSync(F_VENTES_PASSEES, 'utf8');
  ok(/getSalesHistory\(/.test(src),
    'R10 son historique vient de getSalesHistory (transactions rechargées depuis le serveur), pas d’une file locale');
  ok(!/statutSynchronisation/.test(src),
    'R10 elle ne passe donc aucun statut de synchronisation au reçu — et le reçu, sans statut, reste le reçu normal');
}

console.log(
  failures === 0
    ? '\nLe reçu d’une vente pas encore partie le dit, et ne change rien d’autre ✅'
    : `\n${failures} test(s) en échec ❌`,
);
process.exit(failures ? 1 : 0);
