/**
 * OFF-02 — UNE VENTE QUI PART ENFIN DOIT SE SAVOIR, ET SEULEMENT UNE VENTE.
 * Lancer : npm run test:vente-synchronisee   (tsx, store mémoire, sans IndexedDB)
 *
 * CE QUE CE TEST PROUVE, ET COMMENT
 * ---------------------------------
 * OFF-01 a fermé le mensonge de l'encaissement : une vente mise en file
 * s'annonce « gardée sur le téléphone ». OFF-02 est l'autre moitié : quand
 * cette vente part POUR DE BON, la marchande n'apprend rien.
 *
 * Rien n'est recopié ici. La preuve TRAVERSE quatre lectures du vrai code,
 * qui doivent se rejoindre :
 *
 *   1. LA VRAIE FILE. `enfilerOperation` + `synchroniser` (store mémoire),
 *      jamais un simulacre : les opérations sont réellement enfilées, le
 *      rejeu est réellement joué, et on mélange les natures (vente, dépense,
 *      stock) dans la MÊME file, comme sur le téléphone.
 *
 *   2. LE VRAI EFFET DE SYNCHRONISATION. Le corps de `const sync = async …`
 *      est EXTRAIT de `contexts/CaisseContext.tsx`, détypé par le compilateur
 *      TypeScript et EXÉCUTÉ, avec la vraie `synchroniser` branchée sur la
 *      file ci-dessus. Tout ce qu'il appelle est enregistré : c'est le code
 *      qui dit ce qu'il fait, pas ce test.
 *
 *   3. LE VRAI BANDEAU. `components/marchand/SyncEchecsBanner.tsx` est
 *      transpilé et RENDU (fabrique d'éléments injectée) avec des valeurs
 *      choisies, pour voir ce que la marchande a réellement sous les yeux —
 *      en particulier quand il n'y a AUCUN échec à afficher.
 *
 *   4. LE VRAI MODULE HAPTIQUE. `utils/haptique.ts` est exécuté, `vibrate`
 *      capté, et les motifs sont comparés entre eux — leur FORME, pas leur nom.
 *
 * LA JONCTION : la clé de voix annoncée doit exister AU CATALOGUE, le motif
 * haptique doit sortir du VRAI module, et l'état visuel posé par l'effet doit
 * être celui que le contexte expose et que le bandeau lit. Si l'un bouge sans
 * l'autre, ce test rougit.
 *
 * LE DÉFAUT QU'IL ATTRAPE (OFF-02) : l'effet fait `if (ok > 0) await
 * loadTransactions()` et se tait ; et `ok` compte des OPÉRATIONS, pas des
 * ventes — annoncer « ta vente est partie » sur le rejeu d'une dépense serait
 * le même mensonge que celui qu'OFF-01 vient de fermer.
 *
 * CE QU'IL NE PROUVE PAS : que le serveur ait bien gravé la vente (invariants
 * backend), ni ce qu'entend une marchande dont la voix est coupée au niveau
 * du chef d'orchestre — le mute global est un silence VOLONTAIRE, argent
 * compris (arbitrage de Patrick, révision 37).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as oc from './offlineCaisse.js';
import { entreeTts } from '../i18n/voice/catalog.js';
import { doitTaire, importanceDeLaCle, NIVEAUX_VOIX } from '../i18n/voice/niveauVoix.js';

// Un `localStorage` minimal : plusieurs modules du dépôt en lisent un au
// chargement. Sans lui, ils refuseraient de s'importer et ce test retomberait
// sur des mouchards là où il peut exécuter le vrai code.
if (typeof (globalThis as { localStorage?: unknown }).localStorage === 'undefined') {
  const memoire = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => memoire.get(k) ?? null,
      setItem: (k: string, v: string) => { memoire.set(k, String(v)); },
      removeItem: (k: string) => { memoire.delete(k); },
      clear: () => memoire.clear(),
    },
  });
}

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log('  ✅', label);
  else { console.log('  ❌', label); failures++; }
}

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..', '..', '..', '..');
const F_CONTEXTE = join(RACINE, 'frontend_src/src/app/contexts/CaisseContext.tsx');
const F_BANDEAU = join(RACINE, 'frontend_src/src/app/components/marchand/SyncEchecsBanner.tsx');
const F_ECRAN = join(RACINE, 'frontend_src/src/app/components/marchand/POSCaisse.tsx');

const UID = 'marchande-awa';
const VENTE = '/caisse/vente';
const DEPENSE = '/caisse/depense';

// ═══════════════════════════════════════════════════════════════════════════
// Outils de lecture du source — on prend le CORPS RÉEL, on ne le recopie pas
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

/** Le bloc qui commence à `ancre` et s'arrête à l'accolade qui ferme la
 *  PREMIÈRE ouverte après elle — chaînes et commentaires ignorés. */
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

function detyper(code: string, tsx = false): string {
  return ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      jsx: tsx ? ts.JsxEmit.React : undefined,
      jsxFactory: 'h',
      jsxFragmentFactory: 'Fragment',
    },
  }).outputText;
}

const srcContexte = readFileSync(F_CONTEXTE, 'utf8');
const srcBandeau = readFileSync(F_BANDEAU, 'utf8');
const srcEcran = readFileSync(F_ECRAN, 'utf8');

// ═══════════════════════════════════════════════════════════════════════════
// 1. EXÉCUTER LE VRAI EFFET DE SYNCHRONISATION SUR LA VRAIE FILE
// ═══════════════════════════════════════════════════════════════════════════

/** Ce que l'effet a réellement fait : un appel, son nom, ses arguments. */
interface Appel { nom: string; args: unknown[] }

/** Les identifiants qu'on laisse filer au global plutôt que de les capturer. */
const GLOBAUX = new Set([
  'console', 'Promise', 'Math', 'JSON', 'Object', 'Number', 'String', 'Array',
  'Date', 'Boolean', 'Error', 'Symbol', 'Map', 'Set', 'undefined', 'NaN',
  'globalThis', 'navigator', 'window', 'isNaN', 'parseInt', 'parseFloat',
]);

class ErreurHttp extends Error { status: number; constructor(s: number) { super('http ' + s); this.status = s; } }

/** Une salve de rejeu : ce qu'il y a dans la file, et ce que le serveur en fait. */
interface Salve {
  /** Les opérations à enfiler : [endpoint, payload]. */
  file: Array<[string, Record<string, unknown>]>;
  /** Le sort réservé à chaque clé d'idempotence : 'ok' (par défaut) ou un statut HTTP. */
  serveur?: Record<string, 'ok' | number>;
}

interface Resultat {
  appels: Appel[];
  inconnus: string[];
  store: oc.OutboxStore;
  postes: Array<{ endpoint: string; payload: Record<string, unknown> }>;
}

const corpsSync = blocDepuis(srcContexte, 'const sync = async () => {');
const codeSync = detyper(corpsSync);

// ── Les VRAIS modules que le contexte importe ───────────────────────────────
// L'effet de synchronisation s'appuie sur des modules du dépôt (la file, le
// retour haptique, la décision d'annonce…). On les importe POUR DE VRAI, en
// suivant les `import` du contexte lui-même : ce test n'a donc aucun nom à
// deviner, et ce qu'il exécute est le code livré. Un module qui ne s'importe
// pas seul (React, client d'API, contexte d'application) est simplement
// absent : ses symboles retombent sur un mouchard.
const modulesDuContexte = new Map<string, unknown>();
{
  const EXT = ['.ts', '.tsx', '/index.ts', '/index.tsx', '.mts'];
  const dossier = dirname(F_CONTEXTE);
  for (const m of srcContexte.matchAll(/import\s+(?:\*\s+as\s+(\w+)|\{([^}]*)\})\s+from\s+'(\.[^']+)'/g)) {
    const [, etoile, accolades, spec] = m;
    let chemin: string | null = null;
    for (const e of EXT) {
      const essai = join(dossier, spec + e);
      try { readFileSync(essai); chemin = essai; break; } catch { /* essai suivant */ }
    }
    if (!chemin) continue;
    let mod: Record<string, unknown>;
    try { mod = await import(chemin) as Record<string, unknown>; } catch { continue; }
    if (etoile) { modulesDuContexte.set(etoile, mod); continue; }
    for (const brut of (accolades ?? '').split(',')) {
      const nom = brut.trim();
      if (!nom || nom.startsWith('type ')) continue;
      const [source, alias] = nom.split(/\s+as\s+/).map((s) => s.trim());
      if (source in mod) modulesDuContexte.set(alias || source, mod[source]);
    }
  }
}

/**
 * Joue le VRAI effet de synchronisation sur une file réelle.
 *
 * Le corps extrait est évalué dans une portée-espion : chaque identifiant
 * libre qu'il lit est soit une vraie dépendance (la VRAIE `synchroniser`, le
 * VRAI `nbEchecs`), soit un mouchard qui enregistre l'appel. C'est le code
 * réel qui dit ce qu'il fait — ce test n'en présume aucun nom.
 */
async function jouerSync(salve: Salve, store = oc.memoryOutboxStore()): Promise<Resultat> {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  for (const [endpoint, payload] of salve.file) {
    await oc.enfilerOperation(endpoint as oc.OfflineEndpoint, payload, UID, store);
  }
  const postes: Array<{ endpoint: string; payload: Record<string, unknown> }> = [];
  const appels: Appel[] = [];
  const inconnus = new Set<string>();

  // Un mouchard rend une VALEUR NEUTRE déréférençable : le code réel peut lire
  // n'importe quelle propriété de ce qu'il vient d'appeler (`message.texte`…)
  // sans que ce test l'oriente, et sans casser sur un `undefined`.
  const neutre = () => new Proxy(() => '', {
    get: (_t, k) => (k === Symbol.toPrimitive || k === 'toString' ? () => '' : ''),
  });
  const mouchard = (nom: string) => (...args: unknown[]) => { appels.push({ nom, args }); return neutre(); };
  const objetMouchard = (prefixe: string) => new Proxy({}, {
    get: (_t, k) => mouchard(`${prefixe}.${String(k)}`),
  });

  const base: Record<string, unknown> = {
    // Les VRAIES fonctions de la file — c'est là que la preuve traverse.
    synchroniser: (poster: never, uid: string) => oc.synchroniser(poster, uid, store),
    offlineNbEchecs: (uid: string) => oc.nbEchecs(uid, store),
    offlineLettresMortes: (uid: string) => oc.lettresMortes(uid, store),
    // Le serveur de la salve : accepte, ou refuse avec un statut.
    posterOperation: async (endpoint: string, payload: Record<string, unknown>) => {
      const cle = String(payload.idempotency_key ?? '');
      const sort = salve.serveur?.[cle] ?? 'ok';
      if (sort !== 'ok') throw new ErreurHttp(sort);
      postes.push({ endpoint, payload });
    },
    uid: UID,
    toast: objetMouchard('toast'),
    clearTimeout: () => {},
    setTimeout: () => 0,
    minuterie: null,
    arrete: false,
    essai: 0,
  };

  const portee = new Proxy(base, {
    has: (_t, k) => typeof k === 'string' && !GLOBAUX.has(k),
    get: (t, k) => {
      if (typeof k === 'symbol') return undefined;
      const nom = String(k);
      if (nom in t) return t[nom];
      // Le VRAI module importé par le contexte, quand il s'importe seul.
      if (modulesDuContexte.has(nom)) return modulesDuContexte.get(nom);
      inconnus.add(nom);
      const m = mouchard(nom);
      t[nom] = m;
      return m;
    },
    set: (t, k, v) => { t[String(k)] = v; return true; },
  });

  // `with` : la portée-espion voit TOUS les identifiants libres du corps réel.
  const fabrique = new Function('portee', `with (portee) { ${codeSync}\n return sync; }`) as
    (p: unknown) => () => Promise<void>;
  await fabrique(portee)();

  return { appels, inconnus: [...inconnus].sort(), store, postes };
}

// ── Classer les canaux SÉMANTIQUEMENT, jamais par convention de nommage ─────

/** Un appel de VOIX : son premier argument est une clé du catalogue vocal. */
function appelsVoix(appels: Appel[]): Appel[] {
  return appels.filter((a) => typeof a.args[0] === 'string' && !!entreeTts(a.args[0] as never));
}
/** Un appel HAPTIQUE : son nom est une fonction exportée par `utils/haptique`. */
function appelsHaptique(appels: Appel[], nomsHaptique: Set<string>): Appel[] {
  return appels.filter((a) => nomsHaptique.has(a.nom));
}
/** Un appel VISUEL : un poseur d'état React, ou une notification `toast`. */
function appelsVisuels(appels: Appel[]): Appel[] {
  return appels.filter((a) => a.nom.startsWith('toast.') || /^set[A-Z]/.test(a.nom));
}

/** Tous les nombres transmis à un canal (vars de voix, charge d'état, toast). */
function nombresTransmis(appels: Appel[]): number[] {
  const out: number[] = [];
  const visiter = (v: unknown, p = 0) => {
    if (p > 4) return;
    if (typeof v === 'number') { out.push(v); return; }
    if (Array.isArray(v)) { v.forEach((x) => visiter(x, p + 1)); return; }
    if (v && typeof v === 'object') { Object.values(v).forEach((x) => visiter(x, p + 1)); }
  };
  for (const a of appels) a.args.forEach((x) => visiter(x));
  return out;
}

// ── Les noms du module haptique, lus dans le vrai module ────────────────────
const haptique = await import('../utils/haptique.js') as Record<string, () => void>;
const NOMS_HAPTIQUE = new Set(Object.keys(haptique).filter((k) => typeof haptique[k] === 'function'));

/** Le motif réellement émis par une fonction haptique, capté sur `vibrate`. */
function motifDe(nom: string): number | number[] | null {
  let capte: number | number[] | null = null;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { onLine: true, vibrate: (m: number | number[]) => { capte = m; return true; } },
  });
  try { haptique[nom]?.(); } catch { /* jamais bloquant */ }
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  return capte;
}

// ═══════════════════════════════════════════════════════════════════════════
// LES SIX SALVES QUI PIÈGENT
// ═══════════════════════════════════════════════════════════════════════════

console.log('\nCe que le VRAI effet de synchronisation fait, joué pour de bon :');

/** Résumé lisible d'une salve : ce qui est parti, ce qui a été dit/senti/montré. */
function rapporter(titre: string, r: Resultat) {
  const voix = appelsVoix(r.appels).map((a) => `${a.nom}(${JSON.stringify(a.args[0])})`);
  const hapt = appelsHaptique(r.appels, NOMS_HAPTIQUE).map((a) => a.nom);
  const vis = appelsVisuels(r.appels).map((a) => a.nom);
  console.log(`  ${titre}`);
  console.log(`     postés : ${r.postes.map((p) => p.endpoint).join(', ') || '—'}`);
  console.log(`     voix   : ${voix.join(', ') || 'rien'}`);
  console.log(`     senti  : ${hapt.join(', ') || 'rien'}`);
  console.log(`     vu     : ${vis.join(', ') || 'rien'}`);
}

// ── S1 · UNE vente gardée, qui part enfin ───────────────────────────────────
const s1 = await jouerSync({ file: [[VENTE, { montant: 1500, idempotency_key: 'v1' }]] });
rapporter('S1 · une vente rejouée', s1);
{
  const voix = appelsVoix(s1.appels);
  const hapt = appelsHaptique(s1.appels, NOMS_HAPTIQUE);
  const vis = appelsVisuels(s1.appels);
  ok(s1.postes.length === 1 && s1.postes[0].endpoint === VENTE, 'S1 la vente est réellement partie (vraie file, vrai rejeu)');
  ok(voix.length === 1, `S1 la vente partie est DITE, une fois (aujourd’hui : ${voix.length} — OFF-02)`);
  ok(hapt.length === 1, `S1 elle se SENT, une fois (aujourd’hui : ${hapt.length} — OFF-02)`);
  ok(vis.length >= 1, `S1 elle se VOIT (aujourd’hui : ${vis.length} — OFF-02)`);
}

// ── S2 · TROIS ventes d'un coup : on ne le dit pas trois fois ───────────────
const s2 = await jouerSync({
  file: [
    [VENTE, { montant: 1000, idempotency_key: 'a' }],
    [VENTE, { montant: 2000, idempotency_key: 'b' }],
    [VENTE, { montant: 3000, idempotency_key: 'c' }],
  ],
});
rapporter('S2 · trois ventes dans la même salve', s2);
{
  const voix = appelsVoix(s2.appels);
  const hapt = appelsHaptique(s2.appels, NOMS_HAPTIQUE);
  ok(s2.postes.length === 3, 'S2 les trois ventes sont réellement parties');
  ok(voix.length === 1, `S2 une seule annonce parlée pour la salve entière (aujourd’hui : ${voix.length})`);
  ok(hapt.length === 1, `S2 une seule vibration pour la salve entière (aujourd’hui : ${hapt.length})`);
  ok(nombresTransmis([...voix, ...appelsVisuels(s2.appels)]).includes(3),
    'S2 l’annonce porte le NOMBRE de ventes parties (3), elle ne se répète pas');
}

// ── S3 · une vente ET une dépense : le message ne parle que de la vente ─────
const s3 = await jouerSync({
  file: [
    [DEPENSE, { montant: 500, description: 'Transport', idempotency_key: 'd1' }],
    [VENTE, { montant: 2500, idempotency_key: 'v2' }],
  ],
});
rapporter('S3 · une vente et une dépense dans la même salve', s3);
{
  const voix = appelsVoix(s3.appels);
  const canaux = [...voix, ...appelsVisuels(s3.appels)];
  ok(s3.postes.length === 2, 'S3 les deux opérations sont réellement parties');
  ok(voix.length === 1, `S3 une seule annonce (aujourd’hui : ${voix.length})`);
  ok(!nombresTransmis(canaux).includes(2),
    'S3 aucun canal n’annonce DEUX ventes : la dépense n’est pas comptée comme une vente');
  const textes = voix.map((a) => entreeTts(a.args[0] as never)?.frActuel ?? '').join(' ');
  ok(voix.length === 1 && !/d[ée]pense/i.test(textes), 'S3 le message parlé ne parle pas de la dépense — il ne parle que de la vente');
}

// ── S4 · RIEN que des dépenses : silence total côté vente ───────────────────
const s4 = await jouerSync({
  file: [
    [DEPENSE, { montant: 700, description: 'Sacs', idempotency_key: 'd2' }],
    [DEPENSE, { montant: 300, description: 'Eau', idempotency_key: 'd3' }],
  ],
});
rapporter('S4 · rien que des dépenses', s4);
{
  ok(s4.postes.length === 2, 'S4 les deux dépenses sont réellement parties');
  ok(appelsVoix(s4.appels).length === 0, 'S4 AUCUNE annonce parlée : on ne dit pas « ta vente est partie » sur une dépense');
  ok(appelsHaptique(s4.appels, NOMS_HAPTIQUE).length === 0, 'S4 aucune vibration de vente partie');
  ok(appelsVisuels(s4.appels).filter((a) => a.nom.startsWith('toast.')).length === 0,
    'S4 aucune notification de vente partie');
}

// ── S5 · SUCCÈS PARTIEL : une vente passe, une autre reste ──────────────────
const s5 = await jouerSync({
  file: [
    [VENTE, { montant: 4000, idempotency_key: 'p1' }],
    [VENTE, { montant: 5000, idempotency_key: 'p2' }],
  ],
  serveur: { p2: 503 },
});
rapporter('S5 · succès partiel (la seconde vente reste en file)', s5);
{
  const voix = appelsVoix(s5.appels);
  const canaux = [...voix, ...appelsVisuels(s5.appels)];
  const reste = await oc.operationsEnAttente(UID, s5.store);
  ok(s5.postes.length === 1 && reste.length === 1, 'S5 une vente est partie, l’autre est restée en file (elle n’est pas perdue)');
  ok(voix.length === 1, `S5 l’annonce a bien lieu pour celle qui est partie (aujourd’hui : ${voix.length})`);
  ok(!nombresTransmis(canaux).includes(2), 'S5 aucun canal n’annonce DEUX ventes parties');
  const textes = voix.map((a) => entreeTts(a.args[0] as never)?.frActuel ?? '').join(' ');
  ok(voix.length === 1 && !/\b(tout|toutes|tous)\b/i.test(textes),
    'S5 le message ne dit pas « tout est parti » alors qu’il reste une vente');
  ok(nombresTransmis(canaux).filter((n) => n === 1).length >= 2,
    'S5 le RESTE est transmis avec le parti (1 partie, 1 restante) — la marchande sait qu’il reste de l’argent en route');
}

// ── S6 · REJEU IDEMPOTENT : la même vente ne s'annonce jamais deux fois ─────
{
  const store = oc.memoryOutboxStore();
  // La même clé, enfilée deux fois : c'est exactement ce qui arrive quand un
  // envoi en ligne tombe après avoir atteint le serveur.
  const r1 = await jouerSync({
    file: [
      [VENTE, { montant: 6000, idempotency_key: 'idem' }],
      [VENTE, { montant: 6000, idempotency_key: 'idem' }],
    ],
  }, store);
  rapporter('S6 · la même vente enfilée deux fois (même clé)', r1);
  ok(r1.postes.length === 1, 'S6 la file ne porte qu’UNE opération pour une clé donnée — jamais de double envoi');
  ok(appelsVoix(r1.appels).length === 1, 'S6 une seule annonce');
  ok(!nombresTransmis(appelsVoix(r1.appels)).includes(2), 'S6 l’annonce ne compte pas deux ventes');

  // Deuxième tour, file vide : le serveur avait déjà la vente, rien à annoncer.
  const r2 = await jouerSync({ file: [] }, store);
  ok(appelsVoix(r2.appels).length === 0 && appelsHaptique(r2.appels, NOMS_HAPTIQUE).length === 0,
    'S6 un second tour sur une file vide n’annonce RIEN (pas de « nouvelle vente partie » mensongère)');
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LE CONTRAT DE `synchroniser` — élargi, jamais cassé
// ═══════════════════════════════════════════════════════════════════════════

console.log('\nCe que `synchroniser` rend, joué sur une file mélangée :');
{
  const store = oc.memoryOutboxStore();
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  await oc.enfilerOperation(VENTE, { montant: 100, idempotency_key: 'm1' }, UID, store);
  await oc.enfilerOperation(DEPENSE, { montant: 200, description: 'x', idempotency_key: 'm2' }, UID, store);
  await oc.enfilerOperation('/stocks/42' as oc.OfflineEndpoint, { quantite: 3, idempotency_key: 'm3' }, UID, store, 'PATCH');
  await oc.enfilerOperation(VENTE, { montant: 300, idempotency_key: 'm4' }, UID, store);

  const bilan = await oc.synchroniser(async (_e, p) => {
    if ((p as { idempotency_key?: string }).idempotency_key === 'm4') throw new ErreurHttp(503);
  }, UID, store) as Record<string, unknown>;
  console.log('  ', JSON.stringify(bilan));

  // Non-régression : les appelants actuels lisent ok / reste / echecs /
  // ignorees / sansProprietaire. Aucun ne doit disparaître ni changer de type.
  for (const champ of ['ok', 'reste', 'echecs', 'ignorees', 'sansProprietaire']) {
    ok(typeof bilan[champ] === 'number', `le contrat existant garde \`${champ}\` (nombre)`);
  }
  ok(bilan.ok === 3, 'trois opérations sont parties, toutes natures confondues');

  // Ce qui manque à OFF-02 : de quoi distinguer les natures, DEPUIS le point
  // de terminaison déjà porté par chaque opération — pas un champ parallèle.
  const ventil = Object.values(bilan).find(
    (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && VENTE in (v as object),
  ) as Record<string, number> | undefined;
  ok(!!ventil, 'synchroniser rend une ventilation par point de terminaison (aujourd’hui : rien — OFF-02)');
  ok(!!ventil && ventil[VENTE] === 1, 'et elle compte UNE vente partie, pas trois opérations');
  ok(!!ventil && ventil[DEPENSE] === 1, 'et elle distingue la dépense de la vente');

  const restant = Object.values(bilan).find(
    (v) => v !== null && typeof v === 'object' && v !== ventil && !Array.isArray(v) && VENTE in (v as object),
  ) as Record<string, number> | undefined;
  ok(!!restant && restant[VENTE] === 1, 'synchroniser dit aussi combien de VENTES restent en file (succès partiel)');
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 bis. LES QUATRE PROPRIÉTÉS DE LA FILE QUE RIEN NE DOIT TOUCHER
// ═══════════════════════════════════════════════════════════════════════════
// Consigne de Patrick : ORDRE, IDEMPOTENCE, COMPTAGE, CONSERVATION. Observer
// la NATURE de ce qui est rejoué ne doit rien changer à la façon dont le rejeu
// se fait. Ces quatre-là sont mesurées ici sur le rejeu réel ; la politique
// 4xx/5xx, le plafond d'essais et les lettres mortes restent, eux, couverts
// par `test:offline`, qui ne bouge pas d'une ligne.
console.log('\nOrdre, idempotence, comptage, conservation — sur le vrai rejeu :');
{
  const store = oc.memoryOutboxStore();
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  const cles = ['o1', 'o2', 'o3', 'o4', 'o5'];
  for (const c of cles) {
    // 3 ms d'écart : la file ordonne par `ts`, il ne doit pas être ex æquo.
    await new Promise((r) => setTimeout(r, 3));
    await oc.enfilerOperation(c === 'o2' ? DEPENSE : VENTE, { montant: 10, idempotency_key: c }, UID, store);
  }
  const vus: Array<{ endpoint: string; cle: string }> = [];
  const bilan = await oc.synchroniser(async (e, p) => {
    const cle = String((p as { idempotency_key?: string }).idempotency_key);
    vus.push({ endpoint: e, cle });
    if (cle === 'o3') throw new ErreurHttp(503); // transitoire : on s'arrête là
  }, UID, store);

  ok(JSON.stringify(vus.map((v) => v.cle)) === JSON.stringify(['o1', 'o2', 'o3']),
    `ORDRE : la file est rejouée dans l’ordre d’arrivée et s’arrête au premier transitoire (${vus.map((v) => v.cle).join(', ')})`);
  ok(vus.every((v) => cles.includes(v.cle)),
    'IDEMPOTENCE : chaque opération repart avec SA clé, jamais une clé regénérée');
  ok(bilan.ok === 2, `COMPTAGE : \`ok\` compte toujours les opérations parties, toutes natures (${bilan.ok})`);
  const encoreLa = await oc.operationsEnAttente(UID, store);
  ok(encoreLa.length === 3 && JSON.stringify(encoreLa.map((o) => o.id)) === JSON.stringify(['o3', 'o4', 'o5']),
    `CONSERVATION : rien n’est perdu ni sauté — o3, o4, o5 sont intactes et dans l’ordre (${encoreLa.map((o) => o.id).join(', ')})`);
  ok(bilan.reste === 3 && (await oc.nbEchecs(UID, store)) === 0,
    'CONSERVATION : une erreur transitoire ne fabrique aucune lettre morte');
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LA VOIX — par clé de catalogue, jamais une phrase en dur
// ═══════════════════════════════════════════════════════════════════════════

console.log('\nLa voix de la vente partie, lue au catalogue :');
{
  const clesAnnonce = [...new Set([
    ...appelsVoix(s1.appels), ...appelsVoix(s2.appels), ...appelsVoix(s3.appels), ...appelsVoix(s5.appels),
  ].map((a) => String(a.args[0])))];
  console.log(`  clés annoncées : ${clesAnnonce.join(', ') || 'aucune'}`);
  ok(clesAnnonce.length > 0, 'la vente partie a au moins une clé de catalogue qui lui est propre');

  const CLES_OFF01 = ['TATA_VENTE_GARDEE_TELEPHONE', 'TATA_VENTE_GARDEE_TELEPHONE_RUPTURE'];
  const CLES_SUCCES = ['TATA_VENTE_ENREGISTREE', 'TATA_VENTE_ENREGISTREE_RUPTURE'];
  for (const cle of clesAnnonce) {
    const e = entreeTts(cle as never);
    ok(!!e, `« ${cle} » existe au catalogue vocal (aucune phrase en dur)`);
    ok(!!e && e.critiqueArgent === true, `« ${cle} » est marquée critiqueArgent`);
    ok(!CLES_OFF01.includes(cle) && !CLES_SUCCES.includes(cle),
      `« ${cle} » n’est ni l’annonce d’attente d’OFF-01 ni la confirmation d’encaissement`);
    ok(!!e && ![...CLES_OFF01, ...CLES_SUCCES].some((c) => entreeTts(c as never)?.frActuel === e.frActuel),
      `« ${cle} » ne redit pas le texte d’un autre message de vente`);
    // B5 : l'argent ne se tait à AUCUN niveau de voix. Le mute global, lui,
    // reste un silence volontaire — il n'est pas contourné ici.
    for (const niveau of NIVEAUX_VOIX) {
      ok(!doitTaire(niveau, importanceDeLaCle(cle as never)),
        `« ${cle} » n’est jamais tue par le niveau de voix « ${niveau} » (B5)`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. L'HAPTIQUE — un motif distinct des trois existants, par sa FORME
// ═══════════════════════════════════════════════════════════════════════════

console.log('\nLe motif haptique de la vente partie, exécuté depuis le vrai module :');
{
  const nomsAnnonce = [...new Set(appelsHaptique(s1.appels, NOMS_HAPTIQUE).map((a) => a.nom))];
  const CONNUS = ['vibrerSucces', 'vibrerErreur', 'vibrerAttente'];
  for (const n of [...CONNUS, ...nomsAnnonce]) {
    console.log(`  ${n} → ${JSON.stringify(motifDe(n))}`);
  }
  ok(nomsAnnonce.length === 1, `un seul motif pour la vente partie (aujourd’hui : ${nomsAnnonce.join(', ') || 'aucun'})`);
  ok(nomsAnnonce.every((n) => !CONNUS.includes(n)),
    'ce n’est aucun des trois motifs existants réemployé sous un autre nom');

  const forme = (m: number | number[] | null) => (Array.isArray(m) ? m : m === null ? [] : [m]);
  const impulsions = (m: number | number[] | null) => forme(m).filter((_, i) => i % 2 === 0);
  for (const n of nomsAnnonce) {
    const m = motifDe(n);
    ok(m !== null, `« ${n} » fait vraiment vibrer le téléphone`);
    for (const c of CONNUS) {
      ok(JSON.stringify(m) !== JSON.stringify(motifDe(c)), `« ${n} » n’est pas le motif de « ${c} »`);
    }
    const imp = impulsions(m);
    ok(imp.length >= 2, `« ${n} » n’est pas une impulsion unique (l’attente et l’erreur le sont déjà)`);
    ok(imp.length >= 2 && imp[imp.length - 1] >= imp[0] * 2,
      `« ${n} » est ASYMÉTRIQUE CROISSANT : la dernière impulsion vaut au moins le double de la première (${JSON.stringify(imp)}) — le succès initial, lui, est symétrique`);
    ok(imp[0] < forme(motifDe('vibrerErreur'))[0],
      `« ${n} » ne commence pas par une longue : il ne peut pas se lire comme l’alarme`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. LE VISUEL — une surface ATTEIGNABLE, même quand la caisse est refermée
// ═══════════════════════════════════════════════════════════════════════════

console.log('\nLe visuel : ce que la marchande retrouve quand elle revient :');
{
  // (a) L'état est posé DANS LE CONTEXTE (monté pour toute l'application), et
  //     exposé — pas dans un composant que la marchande a pu quitter.
  const poseurs = [...new Set(appelsVisuels(s1.appels).filter((a) => /^set[A-Z]/.test(a.nom)).map((a) => a.nom))];
  console.log(`  état posé par l’effet : ${poseurs.join(', ') || 'aucun'}`);
  ok(poseurs.length >= 1, 'l’effet pose un ÉTAT (une notification qui survit à l’écran de vente refermé)');

  const typeContexte = blocDepuis(srcContexte, 'interface CaisseContextType {');
  const exposes = poseurs
    .map((p) => p.replace(/^set/, '').replace(/^[A-Z]/, (c) => c.toLowerCase()))
    .filter((nom) => new RegExp(`\\b${nom}\\b`).test(typeContexte));
  console.log(`  exposé par CaisseContextType : ${exposes.join(', ') || 'aucun'}`);
  ok(exposes.length >= 1, 'cet état est EXPOSÉ par le contexte de caisse — atteignable hors de l’écran de vente');
  ok(exposes.some((nom) => new RegExp(`\\b${nom}\\b`).test(srcBandeau)),
    'et le bandeau de la file le LIT (la même vérité, pas une seconde)');
  ok(/<SyncEchecsBanner\s*\/>/.test(srcEcran), 'le bandeau est bien monté dans l’écran de caisse');

  // (b) Le VRAI bandeau, transpilé et RENDU : il doit montrer la vente partie
  //     même quand il n'y a AUCUN échec — c'est là que le `return null` piège.
  const corpsBandeau = blocDepuis(srcBandeau, 'function SyncEchecsBanner(');
  const codeBandeau = detyper(corpsBandeau, true);
  const h = (type: unknown, props: unknown, ...enfants: unknown[]) => ({ type, props, enfants });
  const rendre = (etat: Record<string, unknown>) => {
    const useCaisse = () => etat;
    const fab = new Function('h', 'Fragment', 'useCaisse', `${codeBandeau}\n return SyncEchecsBanner;`) as
      (h: unknown, F: unknown, u: unknown) => () => unknown;
    return fab(h, 'Fragment', useCaisse)();
  };
  const texteDe = (n: unknown): string => {
    if (n === null || n === undefined || typeof n === 'boolean') return '';
    if (typeof n === 'string' || typeof n === 'number') return String(n);
    if (Array.isArray(n)) return n.map(texteDe).join(' ');
    const e = n as { props?: { children?: unknown }; enfants?: unknown[] };
    return [texteDe(e.props?.children), ...(e.enfants ?? []).map(texteDe)].join(' ');
  };

  // Le nom de l'état exposé, tel que le contexte le nomme — jamais deviné.
  const nomEtat = exposes[0];
  const charge = appelsVisuels(s1.appels).find((a) => a.nom === `set${nomEtat ? nomEtat[0].toUpperCase() + nomEtat.slice(1) : ''}`)?.args[0];
  const etatVentePartie: Record<string, unknown> = {
    syncEchecs: 0, syncLettresMortes: [], purgerEchecSync: () => {},
  };
  if (nomEtat) etatVentePartie[nomEtat] = typeof charge === 'function' ? (charge as (p: unknown) => unknown)(null) : charge;
  // Une acquittement éventuel : toujours fourni, jamais exigé.
  for (const k of ['accuserVentesParties', 'oublierVentesParties', 'purgerEchecSync']) {
    if (!(k in etatVentePartie)) etatVentePartie[k] = () => {};
  }

  let rendu: unknown = null;
  let erreurRendu: string | null = null;
  try { rendu = rendre(etatVentePartie); } catch (e) { erreurRendu = String((e as Error)?.message ?? e); }
  if (erreurRendu) console.log(`  rendu du bandeau : ERREUR — ${erreurRendu}`);
  else console.log(`  rendu du bandeau (0 échec, une vente partie) : ${JSON.stringify(texteDe(rendu)).slice(0, 220)}`);
  ok(erreurRendu === null && rendu !== null,
    'le bandeau affiche quelque chose alors qu’il n’y a AUCUN échec (le `return null` ne mange pas le succès)');
  ok(/vente/i.test(texteDe(rendu)), 'et ce qu’il affiche parle bien de la VENTE');

  // Sans rien de neuf, il reste muet : on n'ajoute pas un bandeau permanent.
  let rienDuTout: unknown = 'non rendu';
  try {
    rienDuTout = rendre({ syncEchecs: 0, syncLettresMortes: [], purgerEchecSync: () => {}, ...(nomEtat ? { [nomEtat]: null } : {}), accuserVentesParties: () => {}, oublierVentesParties: () => {} });
  } catch { /* le bandeau d'aujourd'hui n'accepte pas encore cet état */ }
  ok(rienDuTout === null, 'sans échec ni vente partie, le bandeau ne montre rien du tout');
}

console.log(
  failures === 0
    ? '\nUne vente qui part enfin se dit, se sent et se voit — et seulement une vente ✅'
    : `\n${failures} test(s) en échec ❌`,
);
process.exit(failures ? 1 : 0);
