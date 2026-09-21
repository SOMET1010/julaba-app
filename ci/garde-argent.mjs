#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GARDE-ARGENT — le garde-fou permanent du chemin d'argent de JULABA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LA RÈGLE D'OR (Patrick) : « UNE caisse. UNE logique métier. UNE source de
 * vérité. L'UI et la voix viennent se poser dessus sans le réinventer. »
 *
 * POURQUOI CE FICHIER EXISTE. Une refonte d'interface a modifié `handlePay`,
 * réécrit `enregistrerVente`, touché le contrôleur de caisse backend et
 * AFFAIBLI un garde-fou existant (`caisseUnSeulMicro.test.mts`, une assertion
 * noyée dans un OR) pour passer. Rien, mécaniquement, ne l'en empêchait. Ce
 * script existe pour que cela devienne impossible sans le dire.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * TROIS MÉCANISMES, PAS UN GLOB DE CHEMINS
 * ───────────────────────────────────────────────────────────────────────────
 *
 * 1. LE PÉRIMÈTRE EST DÉRIVÉ, JAMAIS RECOPIÉ. `ci/PERIMETRE-ARGENT.json`
 *    porte des SYMBOLES d'argent écrits à la main une fois (`handlePay`,
 *    `caisse_transactions`, `idempotency_key`…), chacun avec sa ZONE et la
 *    phrase qui dit pourquoi c'est de l'argent. Le champ `noyau` — la liste
 *    des fichiers qui portent ces symboles — est RECALCULÉ à chaque exécution
 *    et comparé à celui qui est committé. Un fichier qui entre ou sort du
 *    périmètre fait ÉCHOUER le gate en se nommant. C'est ce qui interdit la
 *    « liste approximative de fichiers » : elle ne peut pas dériver en silence.
 *
 * 2. LA DÉTECTION SUR UN DIFF. `--base <ref>` marque « chemin d'argent
 *    touché » si un fichier modifié est dans le noyau, OU s'il importe
 *    DIRECTEMENT (une seule profondeur) un fichier du noyau. Une modification
 *    d'UI, d'UX ou de voix qui touche ce périmètre déclenche les invariants de
 *    sa zone.
 *
 * 3. L'ANTI-ASSOUPLISSEMENT. `ci/EMPREINTE-GARDES.json` porte, pour chaque
 *    fichier de garde, le nombre d'assertions et l'empreinte de CHACUNE (son
 *    libellé, pas son corps : reformuler une condition ne rougit pas,
 *    supprimer ou renommer un libellé rougit). Ajouter est permis. Retirer ne
 *    l'est pas — sauf `GARDE-ASSOUPLIE: <raison>` dans le message de commit,
 *    et jamais dans le même commit que l'argent.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * USAGE
 * ───────────────────────────────────────────────────────────────────────────
 *   node ci/garde-argent.mjs                       périmètre + gardes + test:ci
 *   node ci/garde-argent.mjs --base <ref>          + détection sur le diff
 *   node ci/garde-argent.mjs --base <ref> --liste-invariants
 *   node ci/garde-argent.mjs --base <ref> --preuve <fichier>
 *   node ci/garde-argent.mjs --figer-perimetre     ⚠ HUMAIN SEULEMENT
 *   node ci/garde-argent.mjs --figer-gardes        ⚠ HUMAIN SEULEMENT
 *   node ci/garde-argent.mjs --racine <dir>        bac à sable jetable (tests)
 *
 * `--figer-*` NE TOURNE JAMAIS EN CI NI SOUS UN AGENT, exactement comme
 * `--figer` de `scripts/schema-pilote.mjs`. Un gel est une DÉCISION : il dit
 * « ce périmètre-là est celui qu'on protège ». Laisser une machine le prendre
 * rendrait le gate décoratif, ce qu'il est précisément là pour ne pas être.
 * Le refus est ICI, dans le script, pas dans le workflow : un autre workflow
 * pourrait appeler le script.
 *
 * CE QUE CE GATE NE PROUVE PAS. C'est un contrôle STATIQUE de texte et de
 * fichiers. Il ne lit pas la sémantique : il ne sait pas si `handlePay`
 * calcule juste, il sait qu'on y a touché et qui doit alors repasser au vert.
 * Il ne suit les imports QU'À UNE PROFONDEUR (voir plus bas). Il ne remplace
 * aucun invariant : il les EXIGE.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// ═══════════════════════════════════════════════════════════════════════════
// Arguments
// ═══════════════════════════════════════════════════════════════════════════
const argv = process.argv.slice(2);
const opt = (nom) => { const i = argv.indexOf(nom); return i === -1 ? null : argv[i + 1] ?? null; };
const a = (nom) => argv.includes(nom);

const RACINE_SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RACINE = resolve(opt('--racine') ?? RACINE_SCRIPT);
/** Bac à sable = un dépôt jetable, hors du dépôt réel. Le gel y est permis. */
const BAC_A_SABLE = RACINE !== RACINE_SCRIPT;

const BASE = opt('--base');
const PREUVE = opt('--preuve');
const LISTER = a('--liste-invariants');
const FIGER_PERIMETRE = a('--figer-perimetre');
const FIGER_GARDES = a('--figer-gardes');

const F_PERIMETRE = join(RACINE, 'ci', 'PERIMETRE-ARGENT.json');
const F_GARDES = join(RACINE, 'ci', 'EMPREINTE-GARDES.json');

// Le refus de gel ne dépend PAS seulement de l'environnement : geler le dépôt
// réel est refusé en CI, et le bac à sable — un répertoire jetable qui n'est
// pas ce dépôt — reste gelable pour que les scénarios puissent se construire.
if ((FIGER_PERIMETRE || FIGER_GARDES) && !BAC_A_SABLE
    && (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true')) {
  console.error(
    '\u001b[31m✗ REFUS : --figer-perimetre / --figer-gardes ne s’exécutent jamais en CI.\u001b[0m\n' +
    '  Geler le périmètre de l’argent est une décision humaine. Si ce gate échoue\n' +
    '  en CI parce que le périmètre ou une garde a bougé, c’est le signal attendu :\n' +
    '  relance localement, en connaissance de cause,\n' +
    '    node ci/garde-argent.mjs --figer-perimetre\n' +
    '    node ci/garde-argent.mjs --figer-gardes\n' +
    '  puis committe le fichier régénéré.',
  );
  process.exit(2);
}

const ROUGE = (s) => `\u001b[31m${s}\u001b[0m`;
const JAUNE = (s) => `\u001b[33m${s}\u001b[0m`;
const GRAS = (s) => `\u001b[1m${s}\u001b[0m`;
const journal = [];
const dire = (s = '') => { if (!LISTER) console.log(s); journal.push(s); };
const echecs = [];
const rater = (s) => { echecs.push(s); dire(ROUGE(`  ✗ ${s}`)); };

function git(...args) {
  return execFileSync('git', ['-C', RACINE, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

// ═══════════════════════════════════════════════════════════════════════════
// Un lexer minimal — parce qu'une regex sur du code ment
// ═══════════════════════════════════════════════════════════════════════════
// Les fichiers de garde de JULABA mêlent des littéraux de chaîne et des
// littéraux d'EXPRESSION RÉGULIÈRE qui contiennent des apostrophes :
//   ok(/'\/marchand\/caisse'/.test(barre), "qui contient '/marchand/caisse'");
// Une extraction naïve des guillemets s'y perd (c'est exactement la limite
// GARDE-01 du registre de dette, ouverte sur `antiJargon`). On masque donc
// commentaires, chaînes, gabarits et regex en un passage, en remplaçant chaque
// littéral par un jeton \x01<index>\x01 : le texte masqué ne contient plus
// aucun guillemet ni parenthèse de littéral, et l'appariement de parenthèses
// devient fiable.
const JETON = '\u0001';

function lireChaine(src, i) {
  const q = src[i]; let j = i + 1;
  while (j < src.length) {
    if (src[j] === '\\') { j += 2; continue; }
    if (src[j] === q) return j + 1;
    if (src[j] === '\n' && q !== '`') return j; // chaîne non terminée : on abandonne proprement
    j++;
  }
  return j;
}

function lireGabarit(src, i) {
  let j = i + 1, prof = 0;
  while (j < src.length) {
    const c = src[j];
    if (c === '\\') { j += 2; continue; }
    if (prof === 0 && c === '`') return j + 1;
    if (prof === 0 && c === '$' && src[j + 1] === '{') { prof = 1; j += 2; continue; }
    if (prof > 0) {
      if (c === '{') prof++;
      else if (c === '}') { prof--; j++; continue; }
      else if (c === '`') { j = lireGabarit(src, j); continue; }
      else if (c === '"' || c === "'") { j = lireChaine(src, j); continue; }
    }
    j++;
  }
  return j;
}

function lireRegex(src, i) {
  let j = i + 1, crochet = false;
  while (j < src.length) {
    const c = src[j];
    if (c === '\\') { j += 2; continue; }
    if (c === '\n') return -1;             // pas une regex
    if (crochet) { if (c === ']') crochet = false; }
    else if (c === '[') crochet = true;
    else if (c === '/') { j++; while (j < src.length && /[a-z]/.test(src[j])) j++; return j; }
    j++;
  }
  return -1;
}

const MOTS_AVANT_REGEX = new Set(['return', 'typeof', 'case', 'in', 'of', 'new', 'delete', 'void',
  'instanceof', 'do', 'else', 'yield', 'await', 'throw']);

/** Rend { masque, litteraux } : le code avec chaque littéral remplacé par un jeton. */
function masquer(src) {
  const litteraux = [];
  let out = '', i = 0, prev = '', mot = '';
  const poser = (texte) => { litteraux.push(texte); out += JETON + (litteraux.length - 1) + JETON; };
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      let j = i; while (j < src.length && src[j] !== '\n') j++;
      out += ' '.repeat(j - i); i = j; continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      let j = src.indexOf('*/', i + 2); j = j === -1 ? src.length : j + 2;
      out += src.slice(i, j).replace(/[^\n]/g, ' '); i = j; continue;
    }
    if (c === '"' || c === "'") {
      const j = lireChaine(src, i);
      poser(src.slice(i + 1, Math.max(i + 1, j - 1)));
      prev = c; mot = ''; i = j; continue;
    }
    if (c === '`') {
      const j = lireGabarit(src, i);
      poser(src.slice(i + 1, Math.max(i + 1, j - 1)).replace(/\$\{[\s\S]*?\}/g, '${}'));
      prev = c; mot = ''; i = j; continue;
    }
    if (c === '/' && (prev === '' || '([{,;:=!&|?+-*%~^<>'.includes(prev) || MOTS_AVANT_REGEX.has(mot))) {
      const j = lireRegex(src, i);
      if (j !== -1) { poser(src.slice(i, j)); prev = ')'; mot = ''; i = j; continue; }
    }
    out += c;
    if (/[\w$]/.test(c)) mot += c; else mot = '';
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return { masque: out, litteraux };
}

const demasquer = (texte, litteraux) =>
  texte.replace(new RegExp(`${JETON}(\\d+)${JETON}`, 'g'), (_, n) => litteraux[Number(n)] ?? '');

const normaliser = (s) => s.replace(/\s+/g, ' ').trim();
const echapperRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ═══════════════════════════════════════════════════════════════════════════
// Empreinte d'un fichier de garde
// ═══════════════════════════════════════════════════════════════════════════
// Les gardes de JULABA n'ont pas un seul dialecte : `ok(cond, "libellé")`,
// `eq(a, b, "libellé")`, `verifier('libellé', cond, 'pourquoi')`,
// `passe('libellé')`, et côté backend `it('titre')` + `expect(...)`. On ne
// choisit donc PAS une position d'argument : on prend TOUS les littéraux au
// premier niveau de l'appel — jamais ceux d'un appel imbriqué ni d'un corps de
// fonction. Conséquence voulue : reformuler la CONDITION ne rougit pas ;
// renommer le LIBELLÉ rougit, parce qu'un libellé de garde est du contrat.
const NOMS_JEST = ['it.failing', 'it.only', 'it.skip', 'it.todo', 'it.each', 'it',
  'test.failing', 'test.only', 'test.skip', 'test', 'xit', 'xtest',
  'describe.skip', 'describe.only', 'describe', 'xdescribe'];
/** Formes qui DÉSARMENT une assertion : y tomber est un assouplissement. */
const NOMS_DESARMES = new Set(['it.failing', 'it.skip', 'it.todo', 'xit',
  'test.failing', 'test.skip', 'xtest', 'describe.skip', 'xdescribe']);
const MARQUEURS = /[✅❌✓✗]/;
const COMPTEURS = /\b(?:echecs|failures|erreurs|fails|rouges)\s*(?:\+\+|\+=)/;

/**
 * Le CORPS d'une fonction, pas les 900 caractères qui suivent sa déclaration :
 * sans cela, un simple `const lire = (p) => readFileSync(p)` suivi d'un bloc
 * d'assertions se ferait prendre pour une fonction d'assertion, et le chemin
 * d'un fichier lu deviendrait une « empreinte ». On apparie les parenthèses des
 * paramètres, puis les accolades du corps ; pour une flèche sans accolades, on
 * s'arrête à la fin de l'instruction.
 */
function corpsDe(masque, pos) {
  let i = masque.indexOf('(', pos);
  if (i === -1) return masque.slice(pos, pos + 200);
  let par = 1; i++;
  while (i < masque.length && par > 0) { if (masque[i] === '(') par++; else if (masque[i] === ')') par--; i++; }
  while (i < masque.length && masque[i] !== '{' && masque[i] !== ';' && masque[i] !== '\n') i++;
  if (masque[i] === '{') {
    let acc = 1, j = i + 1;
    while (j < masque.length && acc > 0) { if (masque[j] === '{') acc++; else if (masque[j] === '}') acc--; j++; }
    return masque.slice(pos, j);
  }
  // Flèche sans accolades : jusqu'à la fin de l'instruction, à profondeur nulle.
  let j = masque.indexOf('(', pos); par = 1; j++;
  while (j < masque.length && par > 0) { if (masque[j] === '(') par++; else if (masque[j] === ')') par--; j++; }
  let p2 = 0, c2 = 0, a2 = 0;
  while (j < masque.length) {
    const c = masque[j];
    if (c === '(') p2++; else if (c === ')') p2--;
    else if (c === '[') c2++; else if (c === ']') c2--;
    else if (c === '{') a2++; else if (c === '}') a2--;
    else if ((c === ';' || c === '\n') && p2 <= 0 && c2 <= 0 && a2 <= 0) break;
    j++;
  }
  return masque.slice(pos, j);
}

/** Les noms d'assertion réellement utilisés dans CE fichier (point fixe). */
function nomsAssertion(masque, litteraux) {
  const noms = new Set(NOMS_JEST);
  const decls = [];
  for (const m of masque.matchAll(/(?:^|[^\w$.])function\s+([A-Za-z_$][\w$]*)\s*\(/g)) decls.push([m[1], m.index]);
  for (const m of masque.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|\()/g)) decls.push([m[1], m.index]);
  const corps = decls.map(([nom, pos]) => [nom, demasquer(corpsDe(masque, pos), litteraux)]);
  let bouge = true;
  while (bouge) {
    bouge = false;
    for (const [nom, texte] of corps) {
      if (noms.has(nom)) continue;
      const parle = MARQUEURS.test(texte) || COMPTEURS.test(texte)
        || [...noms].some((n) => !n.includes('.') && new RegExp(`(?<![\\w$.])${echapperRe(n)}\\s*\\(`).test(texte));
      if (parle) { noms.add(nom); bouge = true; }
    }
  }
  return [...noms];
}

/** Les appels d'assertion d'un fichier : { forme, libelle }. */
function assertionsDe(source) {
  const { masque, litteraux } = masquer(source);
  const noms = nomsAssertion(masque, litteraux).sort((x, y) => y.length - x.length);
  const motif = new RegExp(`(?<![\\w$.])(${noms.map(echapperRe).join('|')})\\s*\\(`, 'g');
  const trouvees = [];
  let m;
  while ((m = motif.exec(masque)) !== null) {
    const forme = m[1];
    let k = m.index + m[0].length, par = 1, cro = 0, acc = 0;
    const lits = [];
    while (k < masque.length && par > 0) {
      const c = masque[k];
      if (c === '(') par++;
      else if (c === ')') par--;
      else if (c === '[') cro++;
      else if (c === ']') cro--;
      else if (c === '{') acc++;
      else if (c === '}') acc--;
      else if (c === JETON) {
        const fin = masque.indexOf(JETON, k + 1);
        if (par === 1 && cro === 0 && acc === 0) lits.push(litteraux[Number(masque.slice(k + 1, fin))] ?? '');
        k = fin;
      }
      k++;
    }
    const libelle = normaliser(lits.join(' ⟂ '));
    if (libelle) trouvees.push({ forme, libelle });
  }
  // Repli pour les gardes écrits sans fonction d'assertion (`test-icones.mjs`
  // annonce ses verdicts directement) : les littéraux qui portent ✓ ou ✗.
  if (trouvees.length === 0) {
    for (const l of litteraux) if (MARQUEURS.test(l)) trouvees.push({ forme: 'verdict', libelle: normaliser(l) });
  }
  const expects = (masque.match(/(?<![\w$.])expect\s*\(/g) || []).length;
  return { trouvees, expects };
}

function empreinteFichier(chemin) {
  const { trouvees, expects } = assertionsDe(readFileSync(chemin, 'utf8'));
  const empreintes = {};
  for (const { forme, libelle } of trouvees) {
    const cle = `${forme}·${libelle}`;
    empreintes[cle] = (empreintes[cle] ?? 0) + 1;
  }
  const ordonne = {};
  for (const k of Object.keys(empreintes).sort()) ordonne[k] = empreintes[k];
  return { assertions: trouvees.length, expects, empreintes: ordonne };
}

// ═══════════════════════════════════════════════════════════════════════════
// Le corpus : quels fichiers sont des GARDES, quels fichiers sont du NOYAU
// ═══════════════════════════════════════════════════════════════════════════
const lireJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const pkgFront = () => lireJson(join(RACINE, 'frontend_src', 'package.json'));

/** Les gardes sont DÉRIVÉES de la chaîne `verify`, pas recopiées. */
function gardesDerivees() {
  const pkg = pkgFront();
  const chaine = pkg.scripts?.verify ?? '';
  const gardes = [];
  for (const maillon of chaine.split('&&').map((s) => s.trim())) {
    if (!maillon.startsWith('npm run ')) continue;
    const nom = maillon.slice(8).trim();
    const cmd = pkg.scripts?.[nom];
    if (!cmd) continue;
    const m = cmd.match(/(?:^|\s)(?:tsx|node)\s+(\S+)/);
    if (!m) continue;                       // `typecheck` n'est pas un fichier
    const rel = `frontend_src/${m[1]}`;
    if (existsSync(join(RACINE, rel))) gardes.push({ fichier: rel, script: nom });
  }
  const dossier = join(RACINE, 'backend', 'test', 'invariants');
  if (existsSync(dossier)) {
    for (const f of readdirSync(dossier).sort()) {
      if (f.endsWith('.spec.ts')) gardes.push({ fichier: `backend/test/invariants/${f}`, script: 'test:invariants (backend)' });
    }
  }
  return gardes;
}

const EXT_CODE = /\.(m|c)?(t|j)sx?$|\.sql$/;
const IGNORES = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.vite', '__snapshots__']);
const EST_TEST = /\.(test|spec)\.(m|c)?(t|j)sx?$/;

function parcourir(abs, rel, sortie) {
  let entrees;
  try { entrees = readdirSync(abs, { withFileTypes: true }); } catch { return; }
  for (const e of entrees.sort((x, y) => (x.name < y.name ? -1 : 1))) {
    if (IGNORES.has(e.name)) continue;
    const a2 = join(abs, e.name), r2 = rel ? `${rel}/${e.name}` : e.name;
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) parcourir(a2, r2, sortie);
    else if (EXT_CODE.test(e.name) && !EST_TEST.test(e.name)) sortie.push(r2);
  }
}

/**
 * Le NOYAU, recalculé. Un fichier y entre dès qu'il porte un symbole d'argent.
 * Les fichiers de garde en sont exclus par construction : ils sont protégés par
 * l'autre mécanisme (empreinte), et les confondre rendrait le périmètre illisible.
 */
function noyauCalcule(perimetre, gardes) {
  const exclus = new Set(gardes.map((g) => g.fichier));
  const fichiers = [];
  for (const r of perimetre.racinesScannees) {
    const abs = join(RACINE, r);
    if (existsSync(abs) && statSync(abs).isDirectory()) parcourir(abs, r, fichiers);
  }
  const noyau = {};
  const fantomes = [];
  const vivants = perimetre.symboles.filter((s) => s.statut !== 'absent');
  const absents = perimetre.symboles.filter((s) => s.statut === 'absent');
  for (const f of fichiers) {
    if (exclus.has(f)) continue;
    // Le symbole est cherché dans le CONTENU **et dans le CHEMIN**. Sans le
    // chemin, `voice-offline/localIntent.ts` n'entrerait pas dans sa propre
    // zone : un module ne se nomme pas lui-même dans son corps. Un symbole
    // comme `caisse-api`, `encaisser-credit` ou `vente-stock` EST un nom de
    // module — le chercher ailleurs que dans le chemin n'aurait pas de sens.
    const texte = readFileSync(join(RACINE, f), 'utf8');
    const porte = (s) => texte.includes(s.symbole) || f.includes(s.symbole);
    const symboles = vivants.filter(porte).map((s) => s.symbole);
    if (!symboles.length) continue;
    const zones = [...new Set(vivants.filter((s) => symboles.includes(s.symbole)).map((s) => s.zone))].sort();
    noyau[f] = { zones, symboles: symboles.sort() };
  }
  for (const s of absents) {
    const porteurs = fichiers.filter((f) => !exclus.has(f)
      && (f.includes(s.symbole) || readFileSync(join(RACINE, f), 'utf8').includes(s.symbole)));
    if (porteurs.length) fantomes.push({ symbole: s.symbole, porteurs });
  }
  const ordonne = {};
  for (const k of Object.keys(noyau).sort()) ordonne[k] = noyau[k];
  return { noyau: ordonne, fantomes };
}

// ═══════════════════════════════════════════════════════════════════════════
// Imports — UNE SEULE PROFONDEUR, et c'est un choix
// ═══════════════════════════════════════════════════════════════════════════
// `CaisseContext` est monté dans `App.tsx` : à deux niveaux, l'application
// ENTIÈRE atteint le chemin d'argent, et un gate qui rougit sur tout ne
// protège rien — il se fait désarmer au bout de trois PR. À une profondeur, on
// attrape le cas réel de la refonte : un écran qui appelle DIRECTEMENT
// `handlePay`, `enregistrerVente` ou le contexte de caisse. Ce que ce choix
// laisse passer est dit dans le rapport : un fichier qui ne touche l'argent
// qu'à travers un intermédiaire n'est pas signalé.
const EXTENSIONS = ['', '.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs',
  '/index.ts', '/index.tsx', '/index.mts', '/index.js'];

function importsDe(abs) {
  let src;
  try { src = readFileSync(abs, 'utf8'); } catch { return []; }
  const { masque, litteraux } = masquer(src);
  const specs = [];
  const prendre = (re) => { for (const m of masque.matchAll(re)) specs.push(litteraux[Number(m[1])] ?? ''); };
  prendre(new RegExp(`(?:^|[^\\w$.])(?:import|export)[^;\\n]*?from\\s*${JETON}(\\d+)${JETON}`, 'g'));
  prendre(new RegExp(`(?:^|[^\\w$.])import\\s*${JETON}(\\d+)${JETON}`, 'g'));
  prendre(new RegExp(`(?:^|[^\\w$.])import\\s*\\(\\s*${JETON}(\\d+)${JETON}`, 'g'));
  prendre(new RegExp(`(?:^|[^\\w$.])require\\s*\\(\\s*${JETON}(\\d+)${JETON}`, 'g'));
  return specs;
}

function resoudreImport(fichierRel, spec, noyauSet) {
  let base;
  if (spec.startsWith('.')) base = `${dirname(fichierRel)}/${spec}`;
  else if (spec.startsWith('@/')) base = `frontend_src/src/${spec.slice(2)}`;
  else return null;
  // Normalisation posix des `..` sans toucher au système de fichiers.
  const parts = [];
  for (const p of base.split('/')) {
    if (p === '' || p === '.') continue;
    if (p === '..') parts.pop(); else parts.push(p);
  }
  const sansJs = parts.join('/').replace(/\.js$/, '');
  for (const cand of [parts.join('/'), sansJs]) {
    for (const ext of EXTENSIONS) if (noyauSet.has(cand + ext)) return cand + ext;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Exécution
// ═══════════════════════════════════════════════════════════════════════════
if (!existsSync(F_PERIMETRE)) {
  console.error(ROUGE(`✗ ${relative(RACINE, F_PERIMETRE)} est absent — rien à protéger.`));
  process.exit(2);
}
const perimetre = lireJson(F_PERIMETRE);
const gardes = gardesDerivees();
const { noyau, fantomes } = noyauCalcule(perimetre, gardes);

// ── Gel du périmètre (humain) ──────────────────────────────────────────────
if (FIGER_PERIMETRE) {
  perimetre.noyau = noyau;
  perimetre.genereLe = new Date().toISOString().slice(0, 10);
  writeFileSync(F_PERIMETRE, JSON.stringify(perimetre, null, 2) + '\n');
  const parZone = {};
  for (const v of Object.values(noyau)) for (const z of v.zones) parZone[z] = (parZone[z] ?? 0) + 1;
  console.log(`✓ Périmètre figé : ${Object.keys(noyau).length} fichiers dans le noyau.`);
  for (const z of Object.keys(parZone).sort()) console.log(`    ${z.padEnd(32)} ${parZone[z]}`);
  process.exit(0);
}

// ── Gel des empreintes de garde (humain) ───────────────────────────────────
if (FIGER_GARDES) {
  const sortie = { genereLe: new Date().toISOString().slice(0, 10), gardes: {} };
  for (const g of gardes) sortie.gardes[g.fichier] = { script: g.script, ...empreinteFichier(join(RACINE, g.fichier)) };
  writeFileSync(F_GARDES, JSON.stringify(sortie, null, 2) + '\n');
  const total = Object.values(sortie.gardes).reduce((n, v) => n + v.assertions, 0);
  console.log(`✓ Empreinte des gardes figée : ${gardes.length} fichiers, ${total} assertions.`);
  process.exit(0);
}

dire(GRAS('GARDE-ARGENT — le chemin d’argent de JULABA'));
if (BAC_A_SABLE) dire(JAUNE(`  (bac à sable : ${RACINE})`));

// ═══════════════════════════════════════════════════════════════════════════
// [1] Le périmètre n'a pas dérivé en silence
// ═══════════════════════════════════════════════════════════════════════════
dire(`\n${GRAS('[1] Le périmètre, recalculé depuis les symboles')}`);
const noyauFige = perimetre.noyau ?? {};
{
  const aCalc = Object.keys(noyau), aFige = Object.keys(noyauFige);
  const entres = aCalc.filter((f) => !(f in noyauFige));
  const sortis = aFige.filter((f) => !(f in noyau));
  const bouges = aCalc.filter((f) => f in noyauFige
    && JSON.stringify(noyau[f].zones) !== JSON.stringify(noyauFige[f].zones ?? []));
  dire(`  symboles déclarés : ${perimetre.symboles.length} — fichiers au noyau : ${aCalc.length} (figé : ${aFige.length})`);
  if (entres.length || sortis.length || bouges.length) {
    rater(`LE PÉRIMÈTRE A BOUGÉ sans déclaration (${entres.length} entré(s), ${sortis.length} sorti(s), ${bouges.length} reclassé(s))`);
    for (const f of entres) dire(ROUGE(`      → ${f} est ENTRÉ dans le périmètre sans déclaration`)
      + `\n        symbole(s) d’argent : ${noyau[f].symboles.join(', ')}  —  zone(s) : ${noyau[f].zones.join(', ')}`);
    for (const f of sortis) dire(ROUGE(`      → ${f} est SORTI du périmètre`)
      + `\n        il portait : ${(noyauFige[f].symboles ?? []).join(', ')}`);
    for (const f of bouges) dire(ROUGE(`      → ${f} change de zone : ${(noyauFige[f].zones ?? []).join(', ')} ⇒ ${noyau[f].zones.join(', ')}`));
    dire('        Ce n’est pas un incident de CI : un fichier d’argent est apparu, a disparu,');
    dire('        ou a changé de nature. Fais-le dire au périmètre — relance localement');
    dire('        `node ci/garde-argent.mjs --figer-perimetre` et committe, en connaissance de cause.');
  } else {
    dire(`  ✓ aucun fichier n’est entré ni sorti du périmètre en silence`);
  }
  for (const f of fantomes) {
    rater(`le symbole « ${f.symbole} » est déclaré ABSENT du code, il y est maintenant : ${f.porteurs.join(', ')}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// [2] Les invariants déclarés existent vraiment
// ═══════════════════════════════════════════════════════════════════════════
dire(`\n${GRAS('[2] Les invariants déclarés par zone')}`);
{
  const pkgF = pkgFront();
  let pkgB = null;
  try { pkgB = lireJson(join(RACINE, 'backend', 'package.json')); } catch { /* absent en bac à sable */ }
  const zones = Object.keys(perimetre.invariants ?? {});
  let fantomesInv = 0;
  for (const z of zones) {
    for (const inv of perimetre.invariants[z]) {
      const dansBackend = /-w backend/.test(inv.commande);
      const pkg = dansBackend ? pkgB : pkgF;
      if (pkg && !pkg.scripts?.[inv.script]) {
        rater(`invariant fantôme pour la zone « ${z} » : le script « ${inv.script} » n’existe pas`);
        fantomesInv++;
      }
    }
  }
  const zonesSansInvariant = Object.keys(perimetre.zones ?? {}).filter((z) => !(perimetre.invariants ?? {})[z]?.length);
  for (const z of zonesSansInvariant) rater(`la zone « ${z} » n’a aucun invariant : elle ne protégerait rien`);
  if (!fantomesInv && !zonesSansInvariant.length) dire(`  ✓ ${zones.length} zones, toutes armées par au moins un invariant existant`);
  // Le gate se protège lui-même : débranché de `verify`, il ne dirait plus rien
  // — et personne ne le verrait, puisque c'est lui qui aurait dû le dire.
  if (!BAC_A_SABLE) {
    const dansVerify = /npm run test:garde-argent(\s|$)/.test(pkgF.scripts?.verify ?? '');
    if (dansVerify) dire('  ✓ `test:garde-argent` est bien branché dans `verify`');
    else rater('`test:garde-argent` a été débranché de `verify` : le garde-fou ne tournerait plus');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// [3] La chaîne `test:ci` est GELÉE, valeur contre valeur
// ═══════════════════════════════════════════════════════════════════════════
dire(`\n${GRAS('[3] La chaîne test:ci, gelée')}`);
{
  const gel = perimetre.chaineTestCiGelee ?? {};
  const courante = pkgFront().scripts?.['test:ci'] ?? '';
  if (courante === gel.valeur) {
    dire(`  ✓ identique à ${gel.ref} — ${courante.split('&&').length} maillons`);
  } else {
    const a1 = gel.valeur.split('&&').map((s) => s.trim());
    const a2 = courante.split('&&').map((s) => s.trim());
    rater(`la chaîne test:ci diffère de celle de ${gel.ref} — elle est GELÉE`);
    for (const m of a2.filter((x) => !a1.includes(x))) dire(ROUGE(`      + ajouté : ${m}`));
    for (const m of a1.filter((x) => !a2.includes(x))) dire(ROUGE(`      − retiré : ${m}`));
    const i = a1.findIndex((x, k) => a2[k] !== x);
    if (i !== -1 && a1[i] && a2[i]) dire(`      1er écart au maillon ${i + 1} : « ${a1[i]} » ⇒ « ${a2[i]} »`);
  }
  // Double contrôle quand la référence est joignable : la valeur gelée dans le
  // JSON n'est pas une copie à croire sur parole.
  if (!BAC_A_SABLE && gel.ref) {
    try {
      const vraie = JSON.parse(git('show', `${gel.ref}:frontend_src/package.json`)).scripts['test:ci'];
      if (vraie !== gel.valeur) rater(`la valeur gelée dans ci/PERIMETRE-ARGENT.json ne correspond pas à ${gel.ref}`);
      else dire(`  ✓ la valeur gelée est bien celle de ${gel.ref} (relue dans git)`);
    } catch { dire(`  · ${gel.ref} injoignable dans ce clone (checkout superficiel) — comparaison sur la valeur enregistrée`); }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// [4] Les gardes n'ont pas été affaiblies
// ═══════════════════════════════════════════════════════════════════════════
dire(`\n${GRAS('[4] L’empreinte des gardes')}`);
const assouplissements = [];
{
  if (!existsSync(F_GARDES)) {
    rater(`${relative(RACINE, F_GARDES)} est absent — lance --figer-gardes`);
  } else {
    const figees = lireJson(F_GARDES).gardes ?? {};
    const actuelles = new Map(gardes.map((g) => [g.fichier, g]));
    let promotions = 0;
    for (const [fichier, avant] of Object.entries(figees)) {
      if (!actuelles.has(fichier)) {
        assouplissements.push(`la garde ${fichier} n’est plus branchée (retirée de verify, ou supprimée)`);
        continue;
      }
      const apres = empreinteFichier(join(RACINE, fichier));
      // Un libellé peut changer de FORME : `it.failing('x')` promu en `it('x')`
      // est une INTRODUCTION d'assertion réelle, pas un recul. L'inverse — une
      // assertion vivante rangée sous `it.failing`/`it.skip` — est un recul.
      const parLibelle = (e) => {
        const m = new Map();
        for (const [cle, n] of Object.entries(e.empreintes)) {
          const i = cle.indexOf('·');
          const forme = cle.slice(0, i), libelle = cle.slice(i + 1);
          if (!m.has(libelle)) m.set(libelle, new Map());
          m.get(libelle).set(forme, (m.get(libelle).get(forme) ?? 0) + n);
        }
        return m;
      };
      const av = parLibelle(avant), ap = parLibelle(apres);
      for (const [libelle, formesAv] of av) {
        const formesAp = ap.get(libelle);
        if (!formesAp) {
          assouplissements.push(`${fichier} — assertion RETIRÉE ou RENOMMÉE : « ${libelle} »`);
          continue;
        }
        const totAv = [...formesAv.values()].reduce((x, y) => x + y, 0);
        const totAp = [...formesAp.values()].reduce((x, y) => x + y, 0);
        if (totAp < totAv) {
          assouplissements.push(`${fichier} — assertion RETIRÉE (${totAv} ⇒ ${totAp}) : « ${libelle} »`);
          continue;
        }
        for (const [forme, n] of formesAv) {
          const nAp = formesAp.get(forme) ?? 0;
          if (nAp >= n) continue;
          const versVivant = [...formesAp.keys()].some((f) => !NOMS_DESARMES.has(f));
          if (NOMS_DESARMES.has(forme) && versVivant) {
            promotions++;
            dire(`  ↑ PROMOTION : ${fichier} — « ${libelle} » passe de ${forme}(…) à ${[...formesAp.keys()].join('/')}(…)`);
          } else {
            assouplissements.push(`${fichier} — assertion DÉSARMÉE : « ${libelle} » passe de ${forme}(…) à ${[...formesAp.keys()].join('/')}(…)`);
          }
        }
      }
      if (apres.expects < avant.expects) {
        assouplissements.push(`${fichier} — ${avant.expects - apres.expects} expect(…) retiré(s) (${avant.expects} ⇒ ${apres.expects}) : le titre reste, la preuve part`);
      }
      if (apres.assertions < avant.assertions) {
        assouplissements.push(`${fichier} — ${avant.assertions} assertions figées, ${apres.assertions} aujourd’hui`);
      }
    }
    const nouvelles = gardes.filter((g) => !(g.fichier in figees));
    const total = Object.values(figees).reduce((n, v) => n + v.assertions, 0);
    dire(`  ${gardes.length} gardes branchées dans verify (+ invariants backend), ${total} assertions figées`);
    if (promotions) dire(`  ✓ ${promotions} promotion(s) it.failing ⇒ it : des assertions de PLUS, pas de moins`);
    if (nouvelles.length) dire(`  + ${nouvelles.length} garde(s) nouvelle(s) : ${nouvelles.map((g) => g.fichier).join(', ')}`);
    if (!assouplissements.length) dire(`  ✓ aucune assertion retirée, renommée ni désarmée`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// [5] Le diff : le chemin d'argent est-il touché ?
// ═══════════════════════════════════════════════════════════════════════════
let touche = [];
let zonesTouchees = [];
let exigees = [];
let assouplieDeclaree = null;

if (BASE) {
  let ref = BASE;
  try { ref = git('merge-base', BASE, 'HEAD').trim(); } catch { /* base déjà résolue */ }
  const modifies = git('diff', '--name-only', ref, 'HEAD').split('\n').map((s) => s.trim()).filter(Boolean);
  const noyauSet = new Set(Object.keys(noyau));

  for (const f of modifies) {
    if (noyauSet.has(f)) { touche.push({ fichier: f, raison: 'noyau', zones: noyau[f].zones, symboles: noyau[f].symboles }); continue; }
    if (!EXT_CODE.test(f) || !existsSync(join(RACINE, f))) continue;
    const cibles = [...new Set(importsDe(join(RACINE, f)).map((s) => resoudreImport(f, s, noyauSet)).filter(Boolean))];
    if (cibles.length) {
      touche.push({ fichier: f, raison: `importe ${cibles.join(', ')}`, zones: [...new Set(cibles.flatMap((c) => noyau[c].zones))].sort(), symboles: [] });
    }
  }
  zonesTouchees = [...new Set(touche.flatMap((t) => t.zones))].sort();
  exigees = [...new Set(zonesTouchees.flatMap((z) => (perimetre.invariants[z] ?? []).map((i) => i.commande)))].sort();

  // `GARDE-ASSOUPLIE:` dans un message de commit de la plage.
  let messages = '';
  try { messages = git('log', '--format=%B', `${ref}..HEAD`); } catch { /* base hors historique */ }
  const m = messages.match(/^\s*GARDE-ASSOUPLIE:\s*(.+)$/m);
  if (m) assouplieDeclaree = m[1].trim();

  if (!LISTER) {
    dire(`\n${GRAS('[5] Le diff')}`);
    dire(`  ${modifies.length} fichier(s) modifié(s) depuis ${ref.slice(0, 7)}`);
    if (!touche.length) {
      dire(`  ✓ aucun fichier du chemin d’argent n’est touché — le garde-fou reste silencieux`);
    } else {
      dire(ROUGE(`  ⚠ CHEMIN D’ARGENT TOUCHÉ — ${touche.length} fichier(s)`));
      for (const t of touche) {
        dire(`      ${t.fichier}`);
        dire(`        ${t.raison === 'noyau' ? `porte : ${t.symboles.join(', ')}` : t.raison}`);
        dire(`        zone(s) : ${t.zones.join(', ')}`);
      }
      dire(`\n  ${GRAS('INVARIANTS EXIGÉS')} — par zone touchée :`);
      for (const z of zonesTouchees) {
        dire(`      ${z}`);
        for (const inv of perimetre.invariants[z] ?? []) dire(`        ${inv.commande}${inv.postgres ? '   (PostgreSQL)' : ''}`);
      }
    }
  }
}

if (LISTER) { for (const c of exigees) console.log(c); process.exit(0); }

// ═══════════════════════════════════════════════════════════════════════════
// [6] L'arbitrage : assouplissement déclaré, invariants prouvés
// ═══════════════════════════════════════════════════════════════════════════
dire(`\n${GRAS('[6] Verdict')}`);

if (assouplissements.length) {
  if (assouplieDeclaree === null) {
    rater(`GARDE-FOU ASSOUPLI — ${assouplissements.length} assertion(s) perdue(s)`);
    for (const s of assouplissements) dire(ROUGE(`      → ${s}`));
    dire('        Ajouter des assertions est permis. En retirer une ne l’est pas.');
    dire('        Si c’est voulu, dis-le dans le message du commit :');
    dire('            GARDE-ASSOUPLIE: <raison>');
    dire('        puis relance `node ci/garde-argent.mjs --figer-gardes` localement.');
  } else {
    dire(JAUNE('  ┌──────────────────────────────────────────────────────────────────────┐'));
    dire(JAUNE('  │  ⚠  GARDE-ASSOUPLIE — UN GARDE-FOU A ÉTÉ DESSERRÉ, ET C’EST DÉCLARÉ  │'));
    dire(JAUNE('  └──────────────────────────────────────────────────────────────────────┘'));
    dire(JAUNE(`  raison : ${assouplieDeclaree}`));
    for (const s of assouplissements) dire(JAUNE(`      → ${s}`));
    if (touche.length) {
      rater('un garde-fou NE SE DESSERRE PAS dans le même commit qui change l’argent');
      dire('        Le chemin d’argent est touché par cette plage de commits ET une garde y perd');
      dire('        des assertions. Sépare : un commit qui desserre, revu pour lui-même ; un autre');
      dire('        qui change l’argent, sous des invariants intacts.');
    } else {
      dire(JAUNE('  ⚠ accepté : aucun fichier du chemin d’argent n’est touché par cette plage.'));
      dire(JAUNE('    Pense à relancer `--figer-gardes` pour entériner la nouvelle empreinte.'));
    }
  }
}

// UNE PREUVE D'ARGENT DOIT AVOIR TOURNÉ — GARDE-03, 21/09/2026.
//
// Ce bloc lisait le fichier `--preuve` et vérifiait SEULEMENT qu'il contenait
// les chaînes de commande exigées. Jamais qu'elles avaient tourné, ni qu'elles
// étaient vertes, ni sur quel état du dépôt. Un `printf` de vingt-sept lignes
// suffisait donc à faire dire à ce gate « les 27 invariants exigés ont
// tourné ». Sur un projet dont la doctrine est « sur l'argent, la preuve doit
// TRAVERSER », le gate qui l'impose aux autres reposait sur la bonne foi.
//
// La preuve est désormais un JOURNAL D'EXÉCUTION produit par
// `ci/prouver-invariants.mjs`, et quatre choses la rendent refusable :
//   • ce n'est pas un journal (l'ancienne liste rédigée à la main) ;
//   • elle a été produite sur un AUTRE arbre — on prouverait autre chose que
//     ce qu'on pousse ;
//   • elle a été produite sur un arbre NON COMMITÉ, qui ne désigne rien ;
//   • elle porte un invariant sorti NON NUL.
//
// CE QUE ÇA NE PRÉTEND PAS ÊTRE : infalsifiable. Un journal reste un fichier.
// Ce qui change, c'est qu'on ne peut plus se tromper sans le savoir, ni par
// commodité, et que l'arbre prouvé est nommé.
function lireJournalPreuve(chemin) {
  let brut;
  try { brut = readFileSync(chemin, 'utf8'); } catch { return { erreur: `preuve illisible : ${chemin}` }; }
  let journal;
  try { journal = JSON.parse(brut); } catch {
    return { erreur: 'la preuve n’est pas un journal d’exécution (JSON) — une liste de commandes rédigée à la main ne prouve rien' };
  }
  if (!journal || !Array.isArray(journal.commandes)) {
    return { erreur: 'la preuve n’est pas un journal d’exécution : aucune liste `commandes`' };
  }
  return { journal };
}

if (touche.length) {
  dire('');
  if (!PREUVE) {
    rater('le chemin d’argent est touché et aucun invariant n’a été prouvé (--preuve absent)');
    dire(`      à produire : node ci/prouver-invariants.mjs --base ${BASE}`);
    for (const c of exigees) dire(ROUGE(`      → à lancer : ${c}`));
  } else if (!existsSync(PREUVE)) {
    rater(`le fichier de preuve est introuvable : ${PREUVE}`);
  } else {
    const { journal, erreur } = lireJournalPreuve(PREUVE);
    if (erreur) {
      rater(erreur);
      dire(`      à produire : node ci/prouver-invariants.mjs --base ${BASE}`);
    } else {
      const teteAttendue = (() => { try { return git('rev-parse', 'HEAD').trim(); } catch { return null; } })();
      const refus = [];
      if (teteAttendue && journal.arbre !== teteAttendue) {
        refus.push(`la preuve a été produite sur un AUTRE arbre : ${String(journal.arbre ?? '—').slice(0, 12)} au lieu de ${teteAttendue.slice(0, 12)}`);
      }
      if (journal.propre === false) {
        refus.push('la preuve a été produite sur un arbre NON COMMITÉ : elle ne désigne aucun état nommable');
      }
      for (const c of journal.commandes.filter((c) => c && c.code !== 0)) {
        refus.push(`un invariant est sorti NON NUL et ne peut pas entrer dans la preuve : (${c.code}) ${c.commande}`);
      }
      const verts = new Set(journal.commandes.filter((c) => c && c.code === 0).map((c) => c.commande));
      for (const c of exigees.filter((c) => !verts.has(c))) {
        refus.push(`invariant exigé absent du journal, ou non vert : ${c}`);
      }
      if (refus.length) {
        rater(`la preuve d’exécution est refusée (${refus.length} motif(s))`);
        for (const m of refus) dire(ROUGE(`      → ${m}`));
        dire(`      à produire : node ci/prouver-invariants.mjs --base ${BASE}`);
      } else {
        dire(`  ✓ chemin d’argent touché, et les ${exigees.length} invariants exigés ont tourné`);
        dire(`    (journal d’exécution sur l’arbre ${String(journal.arbre).slice(0, 7)}, ${journal.commandes.length} commande(s), toutes à 0)`);
      }
    }
  }
}

if (echecs.length) {
  dire(`\n${ROUGE(GRAS(`✗ GARDE-ARGENT — ${echecs.length} refus`))}`);
  for (const e of echecs) dire(ROUGE(`  • ${e}`));
  process.exit(1);
}
dire(`\n\u001b[32m✓ GARDE-ARGENT — le chemin d’argent tient.\u001b[0m`);
process.exit(0);
