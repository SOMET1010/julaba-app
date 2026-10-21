/**
 * HYGIÈNE-1 axe 2 — l'unique porte du réseau (auth / caisse / vente / stock).
 *
 * Ces tests tiennent les quatre défauts que la convergence a mis au jour. Ils
 * ne décrivent pas une architecture : chacun reproduit une situation vécue par
 * une marchande.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * RÈGLE PERMANENTE, posée par Patrick le 19/09/2026, après le cas de la place
 * de marché :
 *
 *     UNIFIER UN APPEL NE SUFFIT PAS. Il faut vérifier que les deux appels
 *     portent réellement LE MÊME SENS MÉTIER.
 *
 * La place de marché et la caisse appelaient toutes deux `/caisse/produits`.
 * Techniquement, le même appel. Métier, deux choses opposées : d'un côté « mon
 * catalogue », de l'autre « l'offre des autres vendeurs ». Les converger
 * rendait FIABLE un contrat FAUX — un écran vide devenait un écran qui propose
 * à la marchande d'acheter ses propres tomates.
 *
 * Avant toute convergence future : écrire la phrase « ces deux appels demandent
 * la même chose au serveur, au sens métier ». Si elle ne s'écrit pas, on ne
 * converge pas.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Lancer : npm run test:convergence-api
 */
import { rafraichirSession } from './api-client.js';

let echecs = 0;
function ok(condition: boolean, label: string) {
  if (condition) console.log('  ✅', label);
  else { console.log('  ❌', label); echecs++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}${JSON.stringify(a) === JSON.stringify(b) ? '' : ` (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`}`);
}

// ── Faux localStorage et faux réseau ────────────────────────────────────────
const magasin = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (magasin.has(k) ? magasin.get(k)! : null),
  setItem: (k: string, v: string) => { magasin.set(k, String(v)); },
  removeItem: (k: string) => { magasin.delete(k); },
};

interface Appel { url: string; corps: unknown }
let appels: Appel[] = [];
function brancherReseau(reponse: () => { status: number; corps: unknown }, delai = 0) {
  appels = [];
  (globalThis as any).fetch = async (url: string, init: RequestInit = {}) => {
    appels.push({ url, corps: init.body ? JSON.parse(String(init.body)) : null });
    if (delai) await new Promise((r) => setTimeout(r, delai));
    const { status, corps } = reponse();
    return { ok: status >= 200 && status < 300, status, json: async () => corps } as unknown as Response;
  };
}

const BASE = 'https://api.test/api/v1';

console.log('\nL’unique rafraîchissement de session');

// 1. Le serveur répond 200 AVEC une erreur dans le corps. C'est son
//    comportement réel (@HttpCode(HttpStatus.OK)). L'ancien code lisait
//    `response.ok` et concluait « rafraîchi » — puis rejouait pour rien.
brancherReseau(() => ({ status: 200, corps: { error: 'Token invalide' } }));
ok((await rafraichirSession(BASE)) === false, 'un 200 qui contient { error } n’est PAS un succès');

// 2. Le succès range le jeton d'accès ET son successeur.
magasin.clear();
magasin.set('julaba_refresh_token', 'jeton-1');
brancherReseau(() => ({ status: 200, corps: { success: true, accessToken: 'acces-2', refreshToken: 'jeton-2' } }));
ok((await rafraichirSession(BASE)) === true, 'un corps avec accessToken est un succès');
eq(magasin.get('julaba_access_token'), 'acces-2', 'le nouveau jeton d’accès est rangé');
eq(magasin.get('julaba_refresh_token'), 'jeton-2', 'le SUCCESSEUR remplace le jeton présenté');

// 3. Le cas de l'APK : le cookie ne passe pas, le jeton doit partir dans le corps.
eq((appels[0].corps as any).refreshToken, 'jeton-1', 'le jeton stocké est envoyé dans le corps (cas APK)');

// 4. Le verrou. Deux appels simultanés ne doivent produire QU'UN aller-retour :
//    présenter deux fois le même jeton, c'est une compromission côté serveur,
//    et la révocation de toutes les sessions de la marchande.
magasin.clear();
magasin.set('julaba_refresh_token', 'jeton-A');
brancherReseau(() => ({ status: 200, corps: { success: true, accessToken: 'a', refreshToken: 'b' } }), 20);
const [r1, r2] = await Promise.all([rafraichirSession(BASE), rafraichirSession(BASE)]);
ok(r1 === true && r2 === true, 'deux appels simultanés réussissent tous les deux');
eq(appels.length, 1, '…mais UN SEUL aller-retour réseau (le verrou tient)');

// 5. Le verrou se relâche : un rafraîchissement ultérieur repart bien.
brancherReseau(() => ({ status: 200, corps: { success: true, accessToken: 'c', refreshToken: 'd' } }));
ok((await rafraichirSession(BASE)) === true, 'un appel plus tard repart normalement');
eq(appels.length, 1, '…avec son propre aller-retour');

console.log('\nLe stock passe par la même porte que la vente');

const stocksApi = await import('./stocks-api.js');

// 6. LE DÉFAUT MUET. `addStock` ne regardait pas la réponse : un refus du
//    serveur repartait en succès, et Tata annonçait à voix haute « C'est
//    fait ! … ajoutés au stock » pour un produit qui n'existait pas.
brancherReseau(() => ({ status: 500, corps: { message: 'Base indisponible' } }));
let aLeve = false;
try { await stocksApi.creerStock({ produit: 'Tomate' }); } catch { aLeve = true; }
ok(aLeve, 'un refus du serveur à la création de stock REMONTE (il ne repart plus en succès)');

// 7. La lecture réduit les trois formes de réponse à une seule liste.
brancherReseau(() => ({ status: 200, corps: { stocks: [{ id: '1' }] } }));
eq((await stocksApi.fetchStocks()).length, 1, 'forme { stocks: [...] }');
brancherReseau(() => ({ status: 200, corps: { data: [{ id: '1' }, { id: '2' }] } }));
eq((await stocksApi.fetchStocks()).length, 2, 'forme { data: [...] }');
brancherReseau(() => ({ status: 200, corps: [{ id: '1' }, { id: '2' }, { id: '3' }] }));
eq((await stocksApi.fetchStocks()).length, 3, 'forme tableau nu');

// 8. L'erreur levée PORTE le statut — c'est ce que `doitEnfilerStock` lit pour
//    décider d'enfiler l'opération hors-ligne plutôt que de la perdre.
brancherReseau(() => ({ status: 503, corps: { message: 'indisponible' } }));
let statut: unknown = null;
try { await stocksApi.modifierStock('abc', { quantite: 2 }); } catch (e) { statut = (e as { status?: number }).status; }
eq(statut, 503, 'l’erreur porte son statut HTTP (5xx → l’opération sera enfilée)');

console.log('\nAucune porte dérobée sur les parcours d’argent');

// 9. LE GARDE-FOU. Rien ne sert de converger si le prochain écran repart en
//    `fetch()` direct. On interdit l'appel direct sur auth/caisse/vente/stock
//    hors de `services/api/` — le back-office reste hors périmètre (il n'est
//    pas la caisse d'une marchande et suit son propre client).
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

const RACINE_APP = new URL('../../', import.meta.url).pathname;

// API-01 — LE GARDE-FOU DISAIT LE CONTRAIRE DE CE QU'IL FAISAIT.
//
// Son titre annonce « auth / caisse / vente / stock ». Sa regex ne contenait
// que `caisse|stocks?|catalogue-maitre` : ni `auth`, ni `vente`. J'ai ensuite
// écrit au registre « 0 fetch direct sur auth/caisse/vente/stock » — une
// affirmation que ce fichier ne prouvait pas, et qui était fausse : 37 appels
// directs vers `/auth` vivaient hors de la couche API.
//
// C'est le défaut exact que je reproche ailleurs : un commentaire qui décrit
// autre chose que le code. Il est corrigé dans les deux sens — la regex couvre
// `auth`, et ce qui n'est pas encore convergé est NOMMÉ ci-dessous au lieu
// d'être masqué par une regex trop étroite. Une exception qu'on lit est une
// dette ; une exception qu'on ne voit pas est un mensonge.
const CHEMINS_SENSIBLES = /\/(auth|caisse|stocks?|vente|catalogue-maitre)\b/;

// Appels AVANT session : il n'y a pas encore de jeton, donc pas de 401 à
// rafraîchir. Les faire passer par la couche API n'apporterait rien.
// `webauthn/authenticate/*` : c'est la CONNEXION par empreinte, avant toute
// session. Les mêmes routes appelées EN session (ouverture du keiwa) passent,
// elles, par la couche API — d'où la distinction faite dans `useWebAuthn.ts`
// plutôt qu'ici : ce garde-fou voit des chemins, pas des moments.
const AVANT_SESSION = /\/auth\/(login|check-phone|change-password|activer|refresh|webauthn\/authenticate\/|recover-super-admin|reset-super-admin-password|super-admin-status|test-login|create-super-admin|users\/create|create-acteur|contacts-recovery-bo)/;

// NON ENCORE CONVERGÉ, avec la raison. Cette liste doit RÉTRÉCIR.
const RESTE_A_CONVERGER: Record<string, string> = {
  // Gère DÉJÀ le 401 par `rafraichirSession` (corrigé en HYGIÈNE-1). Converger
  // son chargement de profil est souhaitable, pas urgent : aucun message faux.
  'contexts/AppContext.tsx': 'API-01c — gère déjà le 401, convergence de confort',
  // Écrans internes hors parcours marchande.
  'components/identificateur/IdentificateurPinChangeSection.tsx': 'API-01d — écran identificateur',
  'components/shared/FicheActeurDetailModal.tsx': 'API-01d — écran identificateur',
  'services/authService.ts': 'API-01e — service de connexion, appels avant session',
  // (AdminRecovery, CreateSuperAdmin et SetupMarchand n'ont QUE des appels
  //  d'avant-session : ils n'ont besoin d'aucune exception, et le contrôle
  //  ci-dessous les a signalés quand je leur en avais mis une par excès.)
};

const fautifs: string[] = [];
for (const f of fichiers(RACINE_APP)) {
  if (f.includes('/services/api/') || f.includes('/backoffice/')
      || f.endsWith('backoffice-api.ts')
      // Le back-office n'est pas la caisse d'une marchande et suit son propre
      // client — même motif que `backoffice-api.ts`, dont ce contexte est le
      // pendant côté React ; il vit juste hors du dossier `/backoffice/`.
      || f.endsWith('contexts/BackOfficeContext.tsx')) continue;
  const relatif = f.replace(RACINE_APP, '');
  // EXCEPTION NOMMÉE : la place de marché lit `/caisse/produits`, qui ne
  // renvoie que le catalogue de la marchande elle-même. L'authentifier lui
  // présenterait son propre stock comme l'offre d'autres vendeurs. Tant que
  // cet écran n'a pas de source correcte, il reste NON converti — et c'est
  // écrit ici pour que personne ne « corrige » ça par réflexe.
  if (f.endsWith('/marketplace/Marketplace.tsx')) continue;
  if (relatif in RESTE_A_CONVERGER) continue;
  const code = readFileSync(f, 'utf8');
  for (const ligne of code.split('\n')) {
    const m = /fetch\(\s*`\$\{API_URL\}([^`]*)`/.exec(ligne);
    if (m && CHEMINS_SENSIBLES.test(m[1]) && !AVANT_SESSION.test(m[1])) {
      fautifs.push(`${relatif} → ${m[1]}`);
    }
  }
}

// Une exception qui ne sert plus doit sortir de la liste, sinon elle protège
// un fichier déjà propre et la dette a l'air plus grosse qu'elle n'est.
const inutiles = Object.keys(RESTE_A_CONVERGER).filter((rel) => {
  let code: string;
  try { code = readFileSync(RACINE_APP + rel, 'utf8'); } catch { return true; }
  return !code.split('\n').some((l) => {
    const m = /fetch\(\s*`\$\{API_URL\}([^`]*)`/.exec(l);
    return m && CHEMINS_SENSIBLES.test(m[1]) && !AVANT_SESSION.test(m[1]);
  });
});
ok(inutiles.length === 0, `aucune exception périmée dans RESTE_A_CONVERGER${inutiles.length ? ` (${inutiles.join(' ; ')})` : ''}`);

ok(fautifs.length === 0, `aucun fetch() direct vers auth, la caisse, le stock ou le catalogue hors des exceptions nommées${fautifs.length ? ` (${fautifs.join(' ; ')})` : ''}`);

console.log(echecs === 0 ? '\n✓ convergence API — tous les cas passent' : `\n✗ ${echecs} échec(s)`);
process.exit(echecs === 0 ? 0 : 1);
