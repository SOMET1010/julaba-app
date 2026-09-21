/**
 * OFF-01 — UNE VENTE SEULEMENT MISE EN FILE NE DOIT PAS ÊTRE ANNONCÉE CONFIRMÉE.
 * Lancer : npm run test:vente-hors-ligne-statut   (tsx, store mémoire, sans IndexedDB)
 *
 * CE QUE CE TEST PROUVE, ET COMMENT
 * ---------------------------------
 * Il ne relit pas une chaîne attendue : il fait TRAVERSER la preuve par le
 * code réel, en deux lectures qui doivent se rejoindre.
 *
 *   1. LE VRAI `enregistrerVente`. Le corps de la fonction est EXTRAIT de
 *      `contexts/CaisseContext.tsx` (avec ses deux aides privées `genererCle`
 *      et `doitEnfiler`), détypé par le compilateur TypeScript, puis EXÉCUTÉ
 *      avec la VRAIE file hors ligne (`enfilerOperation` + `synchroniser`,
 *      store mémoire). Ses trois issues sont jouées pour de bon : téléphone
 *      hors ligne, serveur qui accuse réception, et le cas traître — le
 *      navigateur se croit en ligne mais l'envoi tombe. On regarde ce que
 *      l'appelante peut LIRE, et on vérifie au passage que la vente est
 *      réellement en file et repart avec la MÊME clé d'idempotence.
 *
 *   2. LE VRAI `handlePay`. L'écran `components/marchand/POSCaisse.tsx` est lu
 *      par son ARBRE SYNTAXIQUE (pas par regex) : quelle variable reçoit le
 *      résultat, quelles valeurs de statut ses branches comparent, et quels
 *      effets (vibration de succès, message de succès) restent atteignables
 *      sous chaque statut.
 *
 * LA JONCTION : les valeurs de statut que l'écran teste doivent être
 * EXACTEMENT celles que la fonction exécutée rend. Aucune des deux n'est
 * écrite à la main ici. Si l'une bouge sans l'autre, ce test rougit.
 *
 * LE DÉFAUT QU'IL ATTRAPE (OFF-01) : les trois issues rendent `undefined`,
 * l'appelante ne lit rien, et l'écran / la vibration / la voix annoncent
 * « Vente réussie » sur une vente qui dort dans la file.
 *
 * CE QU'IL NE PROUVE PAS : que la vente finisse par être acceptée par le
 * serveur après synchronisation — voir la dette résiduelle au registre.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as oc from './offlineCaisse.js';
import { entreeTts } from '../i18n/voice/catalog.js';

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log('  ✅', label);
  else { console.log('  ❌', label); failures++; }
}

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..', '..', '..', '..');
const F_CONTEXTE = join(RACINE, 'frontend_src/src/app/contexts/CaisseContext.tsx');
const F_ECRAN = join(RACINE, 'frontend_src/src/app/components/marchand/POSCaisse.tsx');

// ═══════════════════════════════════════════════════════════════════════════
// 1. EXTRAIRE ET EXÉCUTER LE VRAI `enregistrerVente`
// ═══════════════════════════════════════════════════════════════════════════

/** Avance d'un caractère de code : saute chaînes, gabarits et commentaires. */
function sauter(src: string, i: number): number {
  const c = src[i];
  if (c === '/' && src[i + 1] === '/') { const j = src.indexOf('\n', i); return j === -1 ? src.length : j + 1; }
  if (c === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i + 2); return j === -1 ? src.length : j + 2; }
  if (c === '"' || c === "'" || c === '`') {
    let j = i + 1;
    while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; j++; }
    return j + 1;
  }
  return i + 1;
}

/** Le bloc de code qui commence à `ancre` et se termine à l'accolade qui
 *  ferme la PREMIÈRE accolade ouverte après elle — chaînes et commentaires
 *  ignorés. C'est ainsi qu'on prend le corps réel, sans le recopier. */
function blocDepuis(src: string, ancre: string): string {
  const debut = src.indexOf(ancre);
  if (debut === -1) throw new Error(`ancre introuvable dans le source : ${ancre}`);
  let i = debut, profondeur = 0, entre = false;
  while (i < src.length) {
    const j = sauter(src, i);
    if (j === i + 1) {
      if (src[i] === '{') { profondeur++; entre = true; }
      else if (src[i] === '}') { profondeur--; if (entre && profondeur === 0) return src.slice(debut, i + 1); }
    }
    i = j;
  }
  throw new Error(`bloc non refermé pour l'ancre : ${ancre}`);
}

const srcContexte = readFileSync(F_CONTEXTE, 'utf8');
const morceaux = [
  blocDepuis(srcContexte, 'function genererCle('),
  blocDepuis(srcContexte, 'function doitEnfiler('),
  blocDepuis(srcContexte, 'const enregistrerVente = async ('),
];
const codeReel = ts.transpileModule(morceaux.join('\n\n'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;

type Deps = {
  caisseApi: { enregistrerVente: (p: unknown) => Promise<unknown> };
  enfilerOperation: (e: string, p: unknown, u: string | undefined) => Promise<string>;
  eventBus: { emit: (...a: unknown[]) => void };
  EVENTS: Record<string, string>;
  appUser: { id: string } | null;
  loadTransactions: () => Promise<void>;
};
const fabrique = new Function(
  'deps',
  'const { caisseApi, enfilerOperation, eventBus, EVENTS, appUser, loadTransactions } = deps;\n'
  + codeReel + '\nreturn enregistrerVente;',
) as (d: Deps) => (m: number, p?: unknown, mp?: string, n?: string, s?: string) => Promise<unknown>;

const UID = 'marchande-awa';

function poserNavigateur(enLigne: boolean) {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: enLigne } });
}

type Scenario = { enLigne: boolean; reponseServeur?: () => Promise<unknown> };

/** Joue une vente RÉELLE par le code extrait, sur la VRAIE file (store mémoire). */
async function vendre(montant: number, sc: Scenario) {
  const store = oc.memoryOutboxStore();
  poserNavigateur(sc.enLigne);
  const vente = fabrique({
    caisseApi: { enregistrerVente: sc.reponseServeur ?? (async () => undefined) },
    enfilerOperation: (e, p, u) => oc.enfilerOperation(e as oc.OfflineEndpoint, p, u, store),
    eventBus: { emit: () => {} },
    EVENTS: { CAISSE_VENTE: 'caisse:vente' },
    appUser: { id: UID },
    loadTransactions: async () => {},
  });
  let leve: unknown = null;
  let resultat: unknown = undefined;
  try { resultat = await vente(montant, [], 'Espèces', undefined, 'kassa'); }
  catch (e) { leve = e; }
  const enFile = await oc.operationsEnAttente(UID, store);
  return { resultat, leve, enFile, store };
}

/** Le statut LISIBLE par l'appelante, sans présumer d'un nom de valeur :
 *  un objet qui porte `statut`, ou une chaîne rendue telle quelle. */
function lireStatut(v: unknown): string | null {
  if (typeof v === 'string' && v.length > 0) return v;
  if (v && typeof v === 'object' && typeof (v as { statut?: unknown }).statut === 'string') {
    return (v as { statut: string }).statut;
  }
  return null;
}

class ErreurHttp extends Error { status: number; constructor(s: number) { super('http ' + s); this.status = s; } }

console.log('\nCe que le VRAI enregistrerVente rend, joué pour de bon :');

// ── T1 · hors ligne : la vente dort dans la file ────────────────────────────
const horsLigne = await vendre(1500, { enLigne: false });
const sHorsLigne = lireStatut(horsLigne.resultat);
console.log(`  hors ligne            → ${JSON.stringify(horsLigne.resultat)} (file : ${horsLigne.enFile.length})`);
ok(horsLigne.leve === null && horsLigne.enFile.length === 1, 'T1 hors ligne : la vente est mise en file, sans erreur (elle n’est jamais perdue)');
ok(sHorsLigne !== null, 'T1 hors ligne : l’appelante peut LIRE un statut (aujourd’hui : rien du tout — OFF-01)');

// ── T2 · le serveur accuse réception ────────────────────────────────────────
const confirmee = await vendre(2000, { enLigne: true, reponseServeur: async () => undefined });
const sConfirmee = lireStatut(confirmee.resultat);
console.log(`  serveur d’accord      → ${JSON.stringify(confirmee.resultat)} (file : ${confirmee.enFile.length})`);
ok(confirmee.leve === null && confirmee.enFile.length === 0, 'T2 serveur d’accord : rien en file');
ok(sConfirmee !== null, 'T2 serveur d’accord : l’appelante peut LIRE un statut');

// ── T3 · LE CAS TRAÎTRE : le navigateur se croit en ligne, l’envoi tombe ────
const panne = await vendre(3000, { enLigne: true, reponseServeur: async () => { throw new Error('Failed to fetch'); } });
const sPanne = lireStatut(panne.resultat);
console.log(`  panne réseau (onLine) → ${JSON.stringify(panne.resultat)} (file : ${panne.enFile.length})`);
ok(panne.leve === null && panne.enFile.length === 1, 'T3 panne réseau alors que navigator.onLine dit vrai : la vente est mise en file');
ok(sPanne !== null, 'T3 panne réseau : l’appelante peut LIRE un statut');
ok(sPanne !== null && sPanne === sHorsLigne, 'T3 panne réseau et hors ligne rendent le MÊME statut (l’attente est l’attente)');

// ── T4 · les deux statuts sont vraiment deux ────────────────────────────────
ok(sHorsLigne !== null && sConfirmee !== null && sHorsLigne !== sConfirmee,
  'T4 « en file » et « confirmée par le serveur » ne se disent pas de la même façon');

// ── T5 · l’erreur métier 4xx reste une erreur, pas un statut ────────────────
const metier = await vendre(4000, { enLigne: true, reponseServeur: async () => { throw new ErreurHttp(422); } });
ok(metier.leve instanceof Error && metier.enFile.length === 0, 'T5 une erreur métier 4xx remonte toujours (jamais enfilée, jamais transformée en statut)');

// ── T6 · la vente mise en file repart entière, avec sa clé ──────────────────
{
  const posts: Array<Record<string, unknown>> = [];
  const res = await oc.synchroniser(async (_e, p) => { posts.push(p as Record<string, unknown>); }, UID, horsLigne.store);
  ok(res.ok === 1 && posts.length === 1, 'T6 la vente enfilée hors ligne est bien rejouée à la synchronisation');
  ok(posts.length === 1 && posts[0].montant === 1500, 'T6 elle repart avec son montant');
  ok(posts.length === 1 && typeof posts[0].idempotency_key === 'string' && (posts[0].idempotency_key as string).length > 0,
    'T6 elle repart avec sa clé d’idempotence (aucun double compte)');
}

// ── T7 · le contrat déclaré dit la même chose que le code ───────────────────
{
  const decl = srcContexte.match(/enregistrerVente:\s*\([^)]*\)\s*=>\s*Promise<([^;]*)>;/);
  ok(!!decl && decl[1].trim() !== 'void',
    `T7 CaisseContextType.enregistrerVente ne promet plus void (aujourd’hui : Promise<${decl ? decl[1].trim() : '?'}>)`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LIRE LE VRAI `handlePay` PAR SON ARBRE SYNTAXIQUE
// ═══════════════════════════════════════════════════════════════════════════

const srcEcran = readFileSync(F_ECRAN, 'utf8');
const arbre = ts.createSourceFile('POSCaisse.tsx', srcEcran, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function trouver(n: ts.Node, pred: (x: ts.Node) => boolean, acc: ts.Node[] = []): ts.Node[] {
  if (pred(n)) acc.push(n);
  // `forEachChild` s'ARRÊTE dès que le rappel rend une valeur truthy : le corps
  // doit donc être une instruction, jamais l'expression `trouver(...)`.
  n.forEachChild((c) => { trouver(c, pred, acc); });
  return acc;
}

const declHandlePay = trouver(arbre, (n) =>
  ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'handlePay')[0] as ts.VariableDeclaration | undefined;
if (!declHandlePay) throw new Error('handlePay introuvable dans POSCaisse.tsx');
const corpsHandlePay = declHandlePay.initializer!;

console.log('\nCe que le VRAI handlePay fait du résultat :');

// Quelle variable reçoit le résultat d'`enregistrerVente` ?
const appelVente = trouver(corpsHandlePay, (n) =>
  ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'enregistrerVente')[0] as ts.CallExpression | undefined;
let nomResultat: string | null = null;
if (appelVente) {
  let p: ts.Node = appelVente;
  while (p.parent && !ts.isVariableDeclaration(p.parent) && !ts.isExpressionStatement(p.parent)) p = p.parent;
  if (p.parent && ts.isVariableDeclaration(p.parent) && ts.isIdentifier(p.parent.name)) nomResultat = p.parent.name.text;
}
console.log(`  résultat d’enregistrerVente : ${nomResultat ? '« ' + nomResultat + ' »' : 'JETÉ (aucune variable)'}`);
ok(nomResultat !== null, 'T8 handlePay LIT le résultat d’enregistrerVente (aujourd’hui il le jette — OFF-01)');

/** Les alias locaux : `const enAttente = resultat.statut === '…'`. */
const alias = new Map<string, ts.Expression>();
for (const n of trouver(corpsHandlePay, ts.isVariableDeclaration) as ts.VariableDeclaration[]) {
  if (ts.isIdentifier(n.name) && n.initializer) alias.set(n.name.text, n.initializer);
}

/** L'expression lit-elle le statut rendu par `enregistrerVente` ? */
function estLectureDuStatut(e: ts.Node): boolean {
  return nomResultat !== null
    && ts.isPropertyAccessExpression(e)
    && e.name.text === 'statut'
    && ts.isIdentifier(e.expression)
    && e.expression.text === nomResultat;
}

/** Vraie / fausse / indécidable, pour une valeur de statut donnée. */
function evalue(e: ts.Expression, statut: string, profondeur = 0): boolean | null {
  if (profondeur > 6) return null;
  if (ts.isParenthesizedExpression(e)) return evalue(e.expression, statut, profondeur + 1);
  if (ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.ExclamationToken) {
    const v = evalue(e.operand as ts.Expression, statut, profondeur + 1);
    return v === null ? null : !v;
  }
  if (ts.isBinaryExpression(e)) {
    const k = e.operatorToken.kind;
    if (k === ts.SyntaxKind.AmpersandAmpersandToken || k === ts.SyntaxKind.BarBarToken) {
      const g = evalue(e.left, statut, profondeur + 1);
      const d = evalue(e.right, statut, profondeur + 1);
      if (k === ts.SyntaxKind.AmpersandAmpersandToken) {
        if (g === false || d === false) return false;
        return g === true && d === true ? true : null;
      }
      if (g === true || d === true) return true;
      return g === false && d === false ? false : null;
    }
    const egal = k === ts.SyntaxKind.EqualsEqualsEqualsToken || k === ts.SyntaxKind.EqualsEqualsToken;
    const diff = k === ts.SyntaxKind.ExclamationEqualsEqualsToken || k === ts.SyntaxKind.ExclamationEqualsToken;
    if (egal || diff) {
      const cotes = [e.left, e.right];
      const litt = cotes.find((c) => ts.isStringLiteral(c)) as ts.StringLiteral | undefined;
      const autre = cotes.find((c) => c !== litt);
      if (litt && autre && estLectureDuStatut(autre)) {
        const v = litt.text === statut;
        return egal ? v : !v;
      }
    }
    return null;
  }
  if (ts.isIdentifier(e)) {
    const a = alias.get(e.text);
    return a ? evalue(a as ts.Expression, statut, profondeur + 1) : null;
  }
  return null;
}

/** Les littéraux de statut que l'écran compare réellement. */
const statutsTestes = new Set<string>();
for (const n of trouver(corpsHandlePay, ts.isBinaryExpression) as ts.BinaryExpression[]) {
  const k = n.operatorToken.kind;
  if (k !== ts.SyntaxKind.EqualsEqualsEqualsToken && k !== ts.SyntaxKind.ExclamationEqualsEqualsToken) continue;
  const cotes = [n.left, n.right];
  const litt = cotes.find((c) => ts.isStringLiteral(c)) as ts.StringLiteral | undefined;
  const autre = cotes.find((c) => c !== litt);
  if (litt && autre && estLectureDuStatut(autre)) statutsTestes.add(litt.text);
}
console.log(`  statuts comparés par l’écran : ${[...statutsTestes].map((s) => '« ' + s + ' »').join(', ') || 'aucun'}`);

// Les deux statuts tels que le code les a RÉELLEMENT rendus plus haut. Les
// sentinelles ne servent qu'à garder le test lisible quand rien n'est rendu :
// dans ce cas T1..T4 sont déjà rouges.
const STATUT_ATTENTE = sHorsLigne ?? '∅attente';
const STATUT_CONFIRME = sConfirmee ?? '∅confirme';

// LA JONCTION — les deux lectures doivent se rejoindre. C'est ici que le test
// cesse d'être une relecture de texte : les valeurs comparées par l'écran sont
// confrontées à celles que la fonction EXÉCUTÉE vient de rendre.
const statutsRendus = new Set([sHorsLigne, sConfirmee].filter((s): s is string => s !== null));
ok(statutsTestes.size > 0 && [...statutsTestes].every((s) => statutsRendus.has(s)),
  `T9 l’écran ne compare aucun statut FANTÔME : tout ce qu’il teste, le contexte le rend (rendus : ${[...statutsRendus].join(', ') || '—'} ; testés : ${[...statutsTestes].join(', ') || '—'})`);

// Et la comparaison SÉPARE vraiment : sur les deux statuts réellement rendus,
// il existe une condition de `handlePay` qui tranche, et qui tranche autrement.
const separe = (trouver(corpsHandlePay, (n) => ts.isIfStatement(n) || ts.isConditionalExpression(n)) as Array<ts.IfStatement | ts.ConditionalExpression>)
  .map((n) => (ts.isIfStatement(n) ? n.expression : n.condition))
  .some((c) => {
    const a = evalue(c, STATUT_ATTENTE);
    const b = evalue(c, STATUT_CONFIRME);
    return a !== null && b !== null && a !== b;
  });
ok(statutsRendus.size === 2 && separe,
  'T9 une condition de handlePay TRANCHE entre les deux statuts réellement rendus (elle ne peut pas les confondre)');

/** Un appel est-il atteignable dans `handlePay` quand le statut vaut `statut` ? */
function atteignable(n: ts.Node, statut: string): boolean {
  let x: ts.Node = n;
  while (x.parent && x !== corpsHandlePay) {
    const p = x.parent;
    if (ts.isIfStatement(p)) {
      const positif = p.thenStatement === x;
      const negatif = p.elseStatement === x;
      if (positif || negatif) {
        const v = evalue(p.expression, statut);
        if (v !== null && v !== positif) return false;
      }
    } else if (ts.isConditionalExpression(p)) {
      const positif = p.whenTrue === x;
      const negatif = p.whenFalse === x;
      if (positif || negatif) {
        const v = evalue(p.condition, statut);
        if (v !== null && v !== positif) return false;
      }
    }
    x = p;
  }
  return true;
}

function appels(nom: string): ts.CallExpression[] {
  return trouver(corpsHandlePay, (n) =>
    ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === nom) as ts.CallExpression[];
}

// ── T10 · la vibration de succès ────────────────────────────────────────────
{
  const v = appels('vibrerSucces');
  ok(v.length > 0 && v.every((n) => atteignable(n, STATUT_CONFIRME)), 'T10 vibrerSucces() reste là quand le serveur a confirmé');
  ok(v.every((n) => !atteignable(n, STATUT_ATTENTE)), 'T10 vibrerSucces() est INATTEIGNABLE quand la vente n’est qu’en attente');
}

// ── T11 · la voix ───────────────────────────────────────────────────────────
const clesDites = (statut: string) => appels('direMessage')
  .filter((n) => atteignable(n, statut))
  .map((n) => (n.arguments[0] && ts.isStringLiteral(n.arguments[0]) ? n.arguments[0].text : null))
  .filter((s): s is string => s !== null);

const CLES_SUCCES = ['TATA_VENTE_ENREGISTREE', 'TATA_VENTE_ENREGISTREE_RUPTURE'];
{
  const ditesEnAttente = clesDites(STATUT_ATTENTE);
  const ditesConfirme = clesDites(STATUT_CONFIRME);
  console.log(`  voix si confirmée     : ${ditesConfirme.join(', ') || 'rien'}`);
  console.log(`  voix si en attente    : ${ditesEnAttente.join(', ') || 'rien'}`);
  ok(CLES_SUCCES.every((c) => ditesConfirme.includes(c)), 'T11 la vente confirmée est toujours annoncée comme avant (clés inchangées)');
  ok(!ditesEnAttente.some((c) => CLES_SUCCES.includes(c)), 'T11 aucune annonce de succès définitif n’est atteignable en attente');

  // Doctrine voix : une vente en attente doit s'ENTENDRE, pas seulement s'afficher.
  const clesAttente = ditesEnAttente.filter((c) => !ditesConfirme.includes(c));
  ok(clesAttente.length > 0, 'T11 la vente en attente est DITE (une clé de catalogue lui est propre)');
  for (const c of clesAttente) {
    const e = entreeTts(c);
    ok(!!e, `T11 « ${c} » existe au catalogue vocal (aucune phrase en dur)`);
    ok(!!e && e.critiqueArgent === true, `T11 « ${c} » est marquée critiqueArgent`);
    ok(!!e && !CLES_SUCCES.some((s) => entreeTts(s)?.frActuel === e.frActuel),
      `T11 « ${c} » ne redit pas le texte d’un message de succès`);
  }
}

// ── T12 · la vente est prise en charge dans les deux cas ────────────────────
{
  const c = appels('clearCart');
  ok(c.length > 0 && c.every((n) => atteignable(n, STATUT_ATTENTE) && atteignable(n, STATUT_CONFIRME)),
    'T12 le panier est vidé dans les DEUX cas : la vente est prise en charge, jamais à ressaisir');
}

// ── T13 · l’écran ne dit pas « réussie » sur une vente en attente ───────────
{
  const dits = trouver(arbre, (n) => (ts.isStringLiteral(n) || ts.isJsxText(n)) && /réussie/i.test((n as ts.StringLiteral | ts.JsxText).text));
  ok(dits.length > 0, 'T13 l’écran de fin porte bien un mot de réussite (sinon ce test ne prouverait rien)');
  const tousConditionnes = dits.every((n) => {
    let x: ts.Node = n;
    while (x.parent) {
      if (ts.isConditionalExpression(x.parent) && /\bstatut\b/.test(x.parent.condition.getText(arbre))) return true;
      if (ts.isIfStatement(x.parent) && /\bstatut\b/.test(x.parent.expression.getText(arbre))) return true;
      x = x.parent;
    }
    return false;
  });
  ok(tousConditionnes, 'T13 chaque mot de réussite de l’écran dépend du statut de la vente');
}

console.log(
  failures === 0
    ? '\nUne vente en attente n’est plus annoncée comme confirmée ✅'
    : `\n${failures} test(s) en échec ❌`,
);
process.exit(failures ? 1 : 0);
