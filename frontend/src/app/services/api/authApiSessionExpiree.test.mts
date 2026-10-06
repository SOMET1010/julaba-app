/**
 * API-01 — UNE SESSION EXPIRÉE NE SE DÉGUISE PLUS EN MAUVAIS CODE.
 *
 * LE DÉFAUT, mesuré sur un vrai serveur le 19/09/2026 :
 *
 *     bon PIN, jeton valide  → 200 {"valid":true}
 *     bon PIN, jeton EXPIRÉ  → 401 {"message":"Unauthorized"}
 *     mauvais PIN            → 200 {"valid":false,…}
 *
 * `WalletPage` lisait `data.valid` sur la réponse brute. Sur un 401, `valid`
 * vaut `undefined` — donc faux — donc « Code PIN incorrect ». La marchande
 * tapait le BON code de son portefeuille et l'application lui disait non. Le
 * jeton d'accès vit 15 minutes ; il suffisait d'un téléphone resté dans le
 * pagne, ou d'une coupure de réseau au moment du rafraîchissement.
 *
 * Elle ne lit pas : aucun texte ne lui permettait de distinguer « session
 * finie » de « mauvais code ». De son point de vue, son portefeuille s'était
 * fermé sur son argent.
 *
 * LA RÈGLE (Patrick, 19/09/2026) : aucun appel authentifié ne décide lui-même
 * quoi faire d'un 401. Le composant ne reçoit que succès métier, erreur
 * métier, ou reconnexion requise. Ce fichier tient cette règle.
 *
 * Lancer : npm run test:auth-session-expiree
 */
let echecs = 0;
function eq(a: unknown, b: unknown, label: string) {
  if (JSON.stringify(a) === JSON.stringify(b)) console.log('  ✅', label);
  else { console.log('  ❌', label, `(attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`); echecs++; }
}

const magasin = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (magasin.has(k) ? magasin.get(k)! : null),
  setItem: (k: string, v: string) => { magasin.set(k, String(v)); },
  removeItem: (k: string) => { magasin.delete(k); },
};
(globalThis as any).window = { dispatchEvent: () => true, location: { pathname: '/' } };
(globalThis as any).CustomEvent = class { constructor(public type: string) {} };

/** Rejoue les réponses données, dans l'ordre, et note chaque URL appelée. */
let urls: string[] = [];
function brancher(...reponses: { status: number; corps: unknown }[]) {
  urls = [];
  let i = 0;
  (globalThis as any).fetch = async (url: string) => {
    urls.push(String(url));
    const r = reponses[Math.min(i++, reponses.length - 1)];
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.corps } as unknown as Response;
  };
}

const { verifierPin, definirPin } = await import('./auth-api.js');

const OK_VRAI = { status: 200, corps: { valid: true } };
const OK_FAUX = { status: 200, corps: { valid: false, locked: false, essaisRestants: 2 } };
const EXPIRE = { status: 401, corps: { message: 'Unauthorized', statusCode: 401 } };
const REFRESH_KO = { status: 200, corps: { error: 'Token invalide' } };
const REFRESH_OK = { status: 200, corps: { success: true, accessToken: 'a2', refreshToken: 'r2' } };

console.log('\nLe cas qui mentait : bon code, jeton expiré');
{
  // 401 → tentative de rafraîchissement → elle échoue → session finie.
  magasin.clear();
  brancher(EXPIRE, REFRESH_KO, EXPIRE);
  const r = await verifierPin('2468');
  eq(r.etat, 'session_expiree', 'l’état est « session expirée »…');
  eq(r.etat === 'session_expiree' && !('valeur' in r), true,
     '…et il ne porte AUCUN verdict sur le code : il n’y en a pas eu');
}

console.log('\nLe même 401, mais la session peut être rafraîchie');
{
  magasin.clear();
  magasin.set('julaba_refresh_token', 'r1');
  // 401 → rafraîchissement réussi → rejeu → le serveur répond enfin.
  brancher(EXPIRE, REFRESH_OK, OK_VRAI);
  const r = await verifierPin('2468');
  eq(r.etat, 'ok', 'la requête est rejouée et aboutit');
  eq(r.etat === 'ok' && r.valeur, true, 'le bon code est reconnu bon');
  eq(urls.some((u) => u.includes('/auth/refresh')), true, 'le rafraîchissement a bien eu lieu');
}

console.log('\nUn vrai mauvais code reste un mauvais code');
{
  magasin.clear();
  brancher(OK_FAUX);
  const r = await verifierPin('1357');
  eq(r.etat, 'ok', 'le serveur a répondu : c’est un verdict métier');
  eq(r.etat === 'ok' && r.valeur, false, '…et le verdict est « faux »');
}

console.log('\nUn bon code reste un bon code');
{
  magasin.clear();
  brancher(OK_VRAI);
  const r = await verifierPin('2468');
  eq(r.etat === 'ok' && r.valeur, true, 'aucune régression sur le cas normal');
}

console.log('\nLe réseau coupé n’est PAS une session expirée');
{
  // Déconnecter quelqu'un parce que le réseau a toussé serait le symétrique
  // du défaut qu'on corrige : un état technique pris pour un verdict.
  magasin.clear();
  (globalThis as any).fetch = async () => { throw new TypeError('Failed to fetch'); };
  const r = await verifierPin('2468');
  eq(r.etat, 'erreur_metier', 'c’est une erreur, pas une fin de session');
  eq(r.etat === 'erreur_metier' && r.status, 0, '…avec le statut 0 : « pas de réponse »');
}

console.log('\nLes trois états valent pour tous les appels auth, pas seulement le PIN');
{
  magasin.clear();
  brancher(EXPIRE, REFRESH_KO, EXPIRE);
  eq((await definirPin('2468')).etat, 'session_expiree', 'definirPin : session expirée');
  brancher({ status: 400, corps: { message: 'Ce PIN est trop simple' } });
  const r = await definirPin('1234');
  eq(r.etat, 'erreur_metier', 'definirPin : refus métier…');
  eq(r.etat === 'erreur_metier' && r.message, 'Ce PIN est trop simple',
     '…et le message du serveur arrive intact à l’écran');
}

console.log(echecs === 0
  ? '\n✓ API-01 — un 401 ne peut plus être lu comme un verdict métier\n'
  : `\n✗ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
