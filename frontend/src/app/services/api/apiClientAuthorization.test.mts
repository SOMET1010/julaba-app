/**
 * API-04 — LA COUCHE API POSE ELLE-MÊME L'EN-TÊTE `Authorization`.
 *
 * LE DÉFAUT, mesuré le 20/09/2026 : `api-client.ts` n'écrivait JAMAIS
 * `Authorization`. Le jeton partait grâce au monkey-patch de `window.fetch`
 * dans `main.tsx`, qui l'ajoutait à tout appel contenant `/api/v1`. Ce patch
 * n'était donc pas un confort : il était PORTEUR. Sans lui, chaque appel
 * authentifié de la marchande partait nu — et le rejeu hors-ligne avec.
 *
 * Point unique de défaillance HORS de la couche API : un test qui importe
 * `api-client` sans `main.tsx` (c'est le cas de tous les tests de ce dossier)
 * exerçait un client qui n'a jamais existé en production.
 *
 * CE FICHIER TIENT TROIS CHOSES :
 *   1. `apiRequest` pose `Authorization` lui-même, à partir du jeton stocké,
 *      LU AU MOMENT DE L'APPEL (jamais mémorisé à la construction) ;
 *   2. après un 401 rafraîchi, le rejeu part avec le jeton NEUF — celui que
 *      `rafraichirSession` vient de ranger, pas celui qui a expiré ;
 *   3. la file hors-ligne (`synchroniser`) rejoue avec le jeton courant : une
 *      vente enfilée sous un jeton A, rejouée après rafraîchissement ou après
 *      redémarrage de l'appli, part sous le jeton B. C'était vrai grâce au
 *      patch global ; c'est vrai désormais grâce à la couche, et ce test
 *      ROUGIT si on lui retire l'en-tête.
 *
 * Et un garde-fou : tant que des appels authentifiés directs (hors couche)
 * existent, le filet de `main.tsx` doit rester ; le jour où il n'y en a plus,
 * ce test rougit pour dire « retire-le ».
 *
 * Lancer : npm run test:api-authorization
 */
// Types seulement : effacés à la compilation, donc importés AVANT les doublures
// sans rien exécuter — les modules réels, eux, sont chargés après (import()).
import type { OfflineEndpoint, OfflineMethod } from '../../voice-offline/offlineCaisse.js';
import type { EnregistrerVenteData, EnregistrerDepenseData } from './caisse-api.js';

let echecs = 0;
function ok(condition: boolean, label: string) {
  if (condition) console.log('  ✅', label);
  else { console.log('  ❌', label); echecs++; }
}
function eq(a: unknown, b: unknown, label: string) {
  const meme = JSON.stringify(a) === JSON.stringify(b);
  ok(meme, `${label}${meme ? '' : ` (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`}`);
}

// ── Faux localStorage, faux window — et SURTOUT PAS le patch de main.tsx ────
const magasin = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (magasin.has(k) ? magasin.get(k)! : null),
  setItem: (k: string, v: string) => { magasin.set(k, String(v)); },
  removeItem: (k: string) => { magasin.delete(k); },
};
(globalThis as any).window = { dispatchEvent: () => true, location: { pathname: '/' } };
(globalThis as any).CustomEvent = class { constructor(public type: string) {} };

interface Appel { url: string; init: RequestInit }
let appels: Appel[] = [];
/** Rejoue les réponses données, dans l'ordre, et note chaque appel (url + init). */
function brancher(...reponses: { status: number; corps: unknown }[]) {
  appels = [];
  let i = 0;
  (globalThis as any).fetch = async (url: string, init: RequestInit = {}) => {
    appels.push({ url: String(url), init });
    const r = reponses[Math.min(i++, reponses.length - 1)];
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.corps } as unknown as Response;
  };
}
/** Lit un en-tête quelle que soit la forme (objet, Headers) et la casse. */
function enTete(init: RequestInit, nom: string): string | null {
  const h = init.headers;
  if (!h) return null;
  if (typeof (h as Headers).get === 'function') return (h as Headers).get(nom);
  for (const [k, v] of Object.entries(h as Record<string, string>)) {
    if (k.toLowerCase() === nom.toLowerCase()) return v;
  }
  return null;
}
const CLE_ACCES = 'julaba_access_token';
const CLE_RAFRAICHISSEMENT = 'julaba_refresh_token';

const { apiRequest } = await import('./api-client.js');
const BASE = 'https://api.test/api/v1';

const OK = { status: 200, corps: { transaction: { id: 't1' } } };
const EXPIRE = { status: 401, corps: { message: 'Unauthorized', statusCode: 401 } };
const REFRESH_OK = (acces: string) => ({ status: 200, corps: { success: true, accessToken: acces, refreshToken: 'r-suivant' } });

console.log('\nAPI-04 reproduit : la couche pose l’en-tête, sans le patch global');
{
  magasin.clear();
  magasin.set(CLE_ACCES, 'jeton-1');
  brancher(OK);
  await apiRequest(BASE, '/caisse/vente', { method: 'POST', body: '{}' });
  eq(enTete(appels[0].init, 'Authorization'), 'Bearer jeton-1',
     'apiRequest envoie « Authorization: Bearer <jeton stocké> » de lui-même');
  eq(enTete(appels[0].init, 'Content-Type'), 'application/json', '…sans perdre le Content-Type');
}

console.log('\nLe jeton est lu AU MOMENT DE L’APPEL, pas mémorisé');
{
  magasin.clear();
  magasin.set(CLE_ACCES, 'jeton-A');
  brancher(OK);
  await apiRequest(BASE, '/caisse/produits');
  magasin.set(CLE_ACCES, 'jeton-B');
  await apiRequest(BASE, '/caisse/produits');
  eq(enTete(appels[0].init, 'Authorization'), 'Bearer jeton-A', 'premier appel : jeton A');
  eq(enTete(appels[1].init, 'Authorization'), 'Bearer jeton-B', 'second appel : jeton B — rien n’a été mis en cache');
}

console.log('\nSans jeton, aucun en-tête (jamais « Bearer null »)');
{
  magasin.clear();
  brancher(OK);
  await apiRequest(BASE, '/system/settings');
  eq(enTete(appels[0].init, 'Authorization'), null, 'pas de jeton stocké → pas d’en-tête Authorization');
}

console.log('\nUn Authorization fourni par l’appelant n’est pas écrasé');
{
  magasin.clear();
  magasin.set(CLE_ACCES, 'jeton-stocke');
  brancher(OK);
  await apiRequest(BASE, '/x', { headers: { authorization: 'Bearer explicite' } });
  eq(enTete(appels[0].init, 'Authorization'), 'Bearer explicite',
     'l’en-tête explicite gagne (comparaison insensible à la casse)');
}

console.log('\nFormData : l’en-tête est posé, le Content-Type reste au navigateur');
{
  magasin.clear();
  magasin.set(CLE_ACCES, 'jeton-photo');
  brancher(OK);
  const fd = new FormData();
  fd.append('champ', 'valeur');
  await apiRequest(BASE, '/upload', { method: 'POST', body: fd });
  eq(enTete(appels[0].init, 'Authorization'), 'Bearer jeton-photo', 'Authorization présent');
  eq(enTete(appels[0].init, 'Content-Type'), null, 'aucun Content-Type forcé (le navigateur pose la frontière multipart)');
}

console.log('\n401 → rafraîchissement → le rejeu porte le jeton NEUF');
{
  magasin.clear();
  magasin.set(CLE_ACCES, 'jeton-perime');
  magasin.set(CLE_RAFRAICHISSEMENT, 'r-1');
  brancher(EXPIRE, REFRESH_OK('jeton-neuf'), OK);
  const r = await apiRequest<{ transaction: { id: string } }>(BASE, '/caisse/vente', { method: 'POST', body: '{}' });
  eq(r.transaction.id, 't1', 'la requête aboutit après rejeu');
  eq(appels.length, 3, 'trois allers-retours : appel, rafraîchissement, rejeu');
  eq(enTete(appels[0].init, 'Authorization'), 'Bearer jeton-perime', 'le premier essai portait le jeton périmé');
  ok(appels[1].url.endsWith('/auth/refresh'), 'le deuxième est le rafraîchissement');
  eq(enTete(appels[2].init, 'Authorization'), 'Bearer jeton-neuf',
     'le rejeu porte le jeton que rafraichirSession vient de ranger — pas l’ancien');
  eq(magasin.get(CLE_ACCES), 'jeton-neuf', 'et le stockage tient bien le jeton neuf');
}

console.log('\nFile hors-ligne : une vente enfilée sous le jeton A repart sous le jeton courant B');
{
  // Le rejeu de la file (`synchroniser`) tourne dans la page et passe par
  // `posterOperation` (CaisseContext) : `caisse-api.enregistrerVente` pour
  // l'argent, `apiRequest` pour le stock. On reproduit ce branchement ici.
  const oc = await import('../../voice-offline/offlineCaisse.js');
  const caisseApi = await import('./caisse-api.js');
  const poster = async (endpoint: OfflineEndpoint, payload: unknown, method: OfflineMethod) => {
    if (endpoint === '/caisse/vente') await caisseApi.enregistrerVente(payload as EnregistrerVenteData);
    else if (endpoint === '/caisse/depense') await caisseApi.enregistrerDepense(payload as EnregistrerDepenseData);
    else await apiRequest(BASE, endpoint, { method, body: JSON.stringify(payload) });
  };

  magasin.clear();
  magasin.set(CLE_ACCES, 'jeton-A');
  const store = oc.memoryOutboxStore();
  await oc.enfilerOperation('/caisse/vente', { idempotency_key: 'v-1', montant: 500 }, 'user-A', store);
  await oc.enfilerOperation('/stocks/s-9', { quantite: 2 }, 'user-A', store, 'PATCH');
  // Entre-temps : rafraîchissement de session, ou fermeture puis réouverture
  // de l'appli avec reconnexion. Le jeton courant n'est plus A.
  magasin.set(CLE_ACCES, 'jeton-B');
  brancher(OK);
  const res = await oc.synchroniser(poster, 'user-A', store);
  eq(res.ok, 2, 'les deux opérations sont rejouées');
  eq(appels.length, 2, 'deux appels réseau');
  ok(appels[0].url.endsWith('/caisse/vente'), 'la vente part par caisse-api');
  eq(enTete(appels[0].init, 'Authorization'), 'Bearer jeton-B', 'la vente rejouée porte le jeton COURANT (B), pas celui de l’enfilage (A)');
  ok(appels[1].url.endsWith('/stocks/s-9'), 'le stock part par apiRequest');
  eq(enTete(appels[1].init, 'Authorization'), 'Bearer jeton-B', 'le stock rejoué porte lui aussi le jeton courant');
  eq((JSON.parse(String(appels[0].init.body)) as { idempotency_key: string }).idempotency_key, 'v-1',
     'la clé d’idempotence voyage avec la vente');
}

console.log('\nFile hors-ligne : le rejeu tombe sur 401, la session se rafraîchit, la MÊME vente repart avec le jeton neuf');
{
  const oc = await import('../../voice-offline/offlineCaisse.js');
  const caisseApi = await import('./caisse-api.js');
  const poster = async (endpoint: OfflineEndpoint, payload: unknown) => {
    await caisseApi.enregistrerVente(payload as EnregistrerVenteData);
    void endpoint;
  };
  magasin.clear();
  magasin.set(CLE_ACCES, 'jeton-vieux');
  magasin.set(CLE_RAFRAICHISSEMENT, 'r-vieux');
  const store = oc.memoryOutboxStore();
  await oc.enfilerOperation('/caisse/vente', { idempotency_key: 'v-2', montant: 1500 }, 'user-A', store);
  brancher(EXPIRE, REFRESH_OK('jeton-rafraichi'), OK);
  const res = await oc.synchroniser(poster, 'user-A', store);
  eq(res.ok, 1, 'la vente finit par passer');
  eq(res.reste, 0, '…et sort de la file');
  eq(appels.length, 3, 'appel (401), rafraîchissement, rejeu');
  eq(enTete(appels[2].init, 'Authorization'), 'Bearer jeton-rafraichi', 'le rejeu de la file porte le jeton neuf');
  const cle = (a: Appel) => (JSON.parse(String(a.init.body)) as { idempotency_key: string }).idempotency_key;
  eq(cle(appels[0]), cle(appels[2]), 'la même clé d’idempotence aux deux essais : rejouée, pas comptée deux fois');
}

console.log('\nLe filet de main.tsx : présent tant que des appels directs en dépendent, retiré sinon');
{
  // Ce garde-fou mesure, il ne suppose pas. Il compte les `fetch()` directs
  // vers NOTRE API hors `services/api/` (ce sont eux qui n'ont que le patch
  // pour porter le jeton) et exige que le patch soit là tant qu'il en reste.
  // Le jour où ce compte tombe à zéro, il rougit pour dire : retire le filet.
  const { readdirSync, readFileSync, statSync } = await import('node:fs');
  const { join } = await import('node:path');
  function fichiers(dir: string, acc: string[] = []): string[] {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) fichiers(p, acc);
      else if (/\.(ts|tsx)$/.test(p) && !/\.(test|spec)\./.test(p)) acc.push(p);
    }
    return acc;
  }
  const RACINE_SRC = new URL('../../../', import.meta.url).pathname;
  const VERS_NOTRE_API = /\bfetch\(\s*(`\$\{(API_URL|API_BASE_URL|BASE_URL)\}|(API_URL|API_BASE_URL|API)\s*\+|`?\/api\/v1)/;
  let dependants = 0;
  const parFichier: Record<string, number> = {};
  for (const f of fichiers(RACINE_SRC)) {
    if (f.includes('/services/api/') || f.endsWith('/main.tsx')) continue;
    for (const ligne of readFileSync(f, 'utf8').split('\n')) {
      if (/^\s*(\/\/|\*|\/\*)/.test(ligne)) continue;
      if (VERS_NOTRE_API.test(ligne)) { dependants++; parFichier[f.replace(RACINE_SRC, '')] = (parFichier[f.replace(RACINE_SRC, '')] ?? 0) + 1; }
    }
  }
  console.log(`  ↳ ${dependants} fetch() directs vers notre API hors services/api/ (dans ${Object.keys(parFichier).length} fichiers)`);
  const mainTsx = readFileSync(RACINE_SRC + 'main.tsx', 'utf8');
  const patchPresent = /window\.fetch\s*=/.test(mainTsx) && mainTsx.includes('julaba_access_token');
  if (dependants > 0) {
    ok(patchPresent, `le filet de main.tsx est encore là : ${dependants} appel(s) direct(s) n’ont que lui pour porter le jeton`);
  } else {
    ok(!patchPresent, 'plus aucun appel direct ne dépend du filet de main.tsx : il doit être retiré (API-04, dernier pas)');
  }
}

console.log(echecs === 0
  ? '\n✓ API-04 — la couche API porte le jeton elle-même, y compris au rejeu hors-ligne\n'
  : `\n✗ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
