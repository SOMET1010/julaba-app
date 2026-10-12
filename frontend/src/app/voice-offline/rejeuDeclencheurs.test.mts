/**
 * A2 — UNE VENTE GARDÉE HORS LIGNE DOIT REPARTIR SANS QU'ON RELANCE L'APPLI.
 * Lancer : npm run test:rejeu-declencheurs   (tsx, store mémoire, horloge virtuelle)
 *
 * Retour terrain PIE du 07/10 : les ventes faites sans réseau ne partaient
 * qu'au redémarrage. Trois causes, toutes lues dans le code :
 *   1. le rejeu ne se déclenchait qu'au MONTAGE et sur `window 'online'` ; une
 *      mise en file n'armait aucune relance ;
 *   2. le manifeste Android n'avait pas ACCESS_NETWORK_STATE : dans la WebView,
 *      `online` ne vient donc jamais ;
 *   3. ARG-03 — après REPLAY_CAP (5) erreurs réseau, une vente partait en
 *      lettre morte : une coupure de quelques minutes suffisait à la perdre.
 *
 * LA PREUVE TRAVERSE : l'effet de rejeu est EXTRAIT de
 * `contexts/CaisseContext.tsx`, détypé et EXÉCUTÉ sur la VRAIE file
 * (`enfilerOperation` + `synchroniser`, store mémoire), avec une horloge
 * virtuelle. Rien n'est recopié.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as oc from './offlineCaisse.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => { console.log(`  ${c ? '✓' : '✗'} ${quoi}`); if (!c) echecs++; };

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..', '..', '..', '..');
const SRC_CONTEXTE = readFileSync(join(RACINE, 'frontend_src/src/app/contexts/CaisseContext.tsx'), 'utf8');
const MANIFESTE = readFileSync(join(RACINE, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
const UID = 'marchande-awa';

class ErreurHttp extends Error { status: number; constructor(s: number) { super('http ' + s); this.status = s; } }

/** Le bloc `{…}` qui suit `debut`, chaînes et commentaires ignorés. */
function blocDepuis(src: string, debut: number): string {
  let i = debut, prof = 0, entre = false;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i) + 1; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      i = j + 1; continue;
    }
    if (c === '{') { prof++; entre = true; }
    else if (c === '}') { prof--; if (entre && prof === 0) return src.slice(debut, i + 1); }
    i++;
  }
  throw new Error('bloc non refermé');
}

// ── L'EFFET RÉEL : `useEffect(() => { … DELAIS_MS … })` de CaisseContext ────
const ancre = SRC_CONTEXTE.indexOf('const DELAIS_MS');
const debutEffet = SRC_CONTEXTE.lastIndexOf('useEffect(() => {', ancre);
const effetSrc = blocDepuis(SRC_CONTEXTE, debutEffet).replace(/^useEffect\(/, '');
const effetJs = ts.transpileModule(`const __effet = ${effetSrc};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;

const GLOBAUX = new Set(['console', 'Promise', 'Math', 'JSON', 'Object', 'Number', 'String', 'Array',
  'Date', 'Boolean', 'Error', 'Symbol', 'Map', 'Set', 'undefined', 'NaN', 'globalThis', 'isNaN']);

/** Une petite cible d'événements : `window`, `document`. */
function cible<X extends object>(extra: X) {
  const ecoute = new Map<string, Set<() => unknown>>();
  return {
    ...extra,
    addEventListener: (t: string, f: () => unknown) => { (ecoute.get(t) ?? ecoute.set(t, new Set()).get(t)!).add(f); },
    removeEventListener: (t: string, f: () => unknown) => { ecoute.get(t)?.delete(f); },
    emettre: (t: string) => { for (const f of ecoute.get(t) ?? []) void f(); },
    nb: (t: string) => ecoute.get(t)?.size ?? 0,
  };
}

const vider = async () => { for (let k = 0; k < 30; k++) await new Promise(r => setImmediate(r)); };

/** Monte l'effet réel avec une horloge virtuelle et un réseau commandé. */
async function monter() {
  const store = oc.memoryOutboxStore();
  let maintenant = 0;
  let suivant = 1;
  const minuteries = new Map<number, { a: number; f: () => void }>();
  const reseau = { ok: false };
  const postes: Array<{ endpoint: string; a: number }> = [];
  const win = cible({});
  const doc = cible({ visibilityState: 'visible' as string });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });

  const base: Record<string, unknown> = {
    appUser: { id: UID },
    synchroniser: (p: never, uid: string) => oc.synchroniser(p, uid, store),
    offlineNbEchecs: (uid: string) => oc.nbEchecs(uid, store),
    posterOperation: async (endpoint: string) => {
      // Réseau coupé : l'erreur SANS statut, celle que lève un fetch qui échoue.
      if (!reseau.ok) throw new Error('Failed to fetch');
      postes.push({ endpoint, a: maintenant });
    },
    ventesParties: oc.ventesParties,
    ventesEncoreEnFile: oc.ventesEncoreEnFile,
    surMiseEnFile: oc.surMiseEnFile,
    annonceVentesParties: () => null,
    loadTransactions: async () => {},
    rafraichirEchecs: async () => {},
    toast: { success: () => {}, error: () => {} },
    window: win,
    document: doc,
    setTimeout: (f: () => void, ms: number) => { const id = suivant++; minuteries.set(id, { a: maintenant + ms, f }); return id; },
    clearTimeout: (id: number) => { minuteries.delete(id); },
  };
  const portee = new Proxy(base, {
    has: (_t, k) => typeof k === 'string' && !GLOBAUX.has(k),
    get: (t, k) => (typeof k === 'string' && k in t ? t[k] : () => undefined),
    set: (t, k, v) => { t[String(k)] = v; return true; },
  });
  const effet = new Function('portee', `with (portee) { ${effetJs}\n return __effet; }`)(portee) as () => (() => void) | void;
  const nettoyer = effet();
  await vider();

  /** Fait avancer l'horloge virtuelle de `ms`, minuterie par minuterie. */
  const avancer = async (ms: number) => {
    const fin = maintenant + ms;
    for (;;) {
      const prochaine = [...minuteries.entries()].filter(([, m]) => m.a <= fin).sort((x, y) => x[1].a - y[1].a)[0];
      if (!prochaine) break;
      minuteries.delete(prochaine[0]);
      maintenant = prochaine[1].a;
      prochaine[1].f();
      await vider();
    }
    maintenant = fin;
  };
  const enfiler = async (endpoint: oc.OfflineEndpoint, cle: string) => {
    await oc.enfilerOperation(endpoint, { montant: 1500, idempotency_key: cle }, UID, store);
    await vider();
  };
  return { store, reseau, postes, win, doc, avancer, enfiler, nettoyer, t: () => maintenant };
}

console.log('\n[A2] Une vente gardée hors ligne repart sans redémarrer l\'appli\n');

// 1. MISE EN FILE APRÈS LE MONTAGE, RÉSEAU REVENU SANS `online`
{
  const m = await monter();
  await m.avancer(10_000);
  await m.enfiler('/caisse/vente', 'v1');
  await m.avancer(90_000); // le réseau est encore coupé pendant 1 min 30
  const retour = m.t();
  m.reseau.ok = true;   // … puis il revient, SANS événement `online`
  await m.avancer(5 * 60_000);
  const poste = m.postes.find(p => p.endpoint === '/caisse/vente');
  ok(!!poste, 'la vente enfilée APRÈS le montage part toute seule, sans `online` ni redémarrage');
  ok(!!poste && poste.a - retour < 5 * 60_000,
     `et elle part moins de 5 min après le retour du réseau${poste ? ` (${Math.round((poste.a - retour) / 1000)} s)` : ''}`);
  ok((await oc.nbEchecs(UID, m.store)) === 0, 'aucune lettre morte pendant la coupure');
  if (typeof m.nettoyer === 'function') m.nettoyer();
}

// 2. ELLE RALLUME L'ÉCRAN : `visibilitychange` rejoue tout de suite
{
  const m = await monter();
  m.reseau.ok = false;
  await m.enfiler('/caisse/vente', 'v2');
  m.reseau.ok = true;
  m.doc.visibilityState = 'visible';
  m.doc.emettre('visibilitychange');
  await vider();
  ok(m.postes.some(p => p.endpoint === '/caisse/vente') && m.t() === 0,
     'la page redevient visible : la file est rejouée AUSSITÔT, sans attendre de minuterie');
  if (typeof m.nettoyer === 'function') m.nettoyer();
  ok(m.doc.nb('visibilitychange') === 0 && m.win.nb('online') === 0,
     'au démontage, les écouteurs sont retirés (pas de rejeu fantôme d\'un autre compte)');
}

// 3. LE MANIFESTE ANDROID
ok(/android\.permission\.ACCESS_NETWORK_STATE/.test(MANIFESTE),
   'le manifeste déclare ACCESS_NETWORK_STATE (sans elle, `online` ne vient pas dans la WebView)');
ok(/android\.permission\.CAMERA/.test(MANIFESTE)
   && /<uses-feature\s+android:name="android\.hardware\.camera"\s+android:required="false"\s*\/>/.test(MANIFESTE),
   'et CAMERA, avec la caméra NON requise (le téléphone sans caméra reste installable)');

// 4. ARG-03 — UNE ERREUR PASSAGÈRE NE MET JAMAIS UNE VENTE EN LETTRE MORTE
{
  const tirer = (statut: number | null) => async () => {
    if (statut == null) throw new Error('Failed to fetch');
    throw new ErreurHttp(statut);
  };
  for (const [endpoint, statut] of [
    ['/caisse/vente', null], ['/caisse/depense', null], ['/caisse/vente', 401],
    ['/caisse/vente', 408], ['/caisse/vente', 429], ['/caisse/vente', 503],
  ] as Array<[oc.OfflineEndpoint, number | null]>) {
    const store = oc.memoryOutboxStore();
    await oc.enfilerOperation(endpoint, { montant: 500, idempotency_key: 'k' }, UID, store);
    for (let i = 0; i < 10; i++) await oc.synchroniser(tirer(statut), UID, store);
    ok((await oc.nbEchecs(UID, store)) === 0 && (await oc.nbEnAttente(UID, store)) === 1,
       `${endpoint} — erreur ${statut ?? 'sans statut'} ×10 : toujours en file, PAS en lettre morte`);
  }
  const store = oc.memoryOutboxStore();
  await oc.enfilerOperation('/caisse/vente', { montant: 500, idempotency_key: 'k' }, UID, store);
  await oc.synchroniser(tirer(409), UID, store);
  ok((await oc.nbEchecs(UID, store)) === 1, 'un refus MÉTIER (409) va bien en lettre morte, et se signale');
}

console.log(echecs === 0 ? '\n✅ La file repart d\'elle-même, et ne perd rien.\n' : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
