/**
 * API-01b — LA SESSION QUI EXPIRE N'ACCUSE PLUS LA MARCHANDE.
 *
 * Même défaut que pour le PIN, par l'empreinte, et en pire. Sur jeton expiré —
 * il vit 15 minutes — `getConnectedUserPhone()` recevait un 401 et rendait
 * `null` ; `verifyWebAuthnForKeiwa` rendait `false` ; l'écran affichait « Ton
 * téléphone ne t'a pas reconnue ». Or l'invite d'empreinte ne s'était même pas
 * ouverte : la marchande n'avait pas eu l'occasion d'essayer, et on lui
 * reprochait un échec qui n'était pas le sien. Elle ne lit pas : rien ne le
 * lui expliquait.
 *
 * LA SÉPARATION EST PROPRE, ET VÉRIFIÉE ICI :
 *   • un échec WebAuthn normal est une EXCEPTION LEVÉE par le navigateur
 *     (`NotAllowedError` = annulation ou délai, `InvalidStateError`, etc.) ;
 *   • une session finie est un 401 HTTP de notre serveur.
 * L'un vient du téléphone, l'autre du réseau. Ils ne se croisent jamais.
 *
 * Lancer : npm run test:biometrie-session
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

// Le navigateur : on décide s'il reconnaît, refuse, ou si la personne annule.
// `startAuthentication` parle au matériel et ne peut pas tourner ici — d'où la
// couture `navigateurWebAuthn` dans `useWebAuthn.ts`. Sans elle, on ne
// pourrait vérifier QUE le cas « session expirée », donc tout sauf la
// distinction qu'on veut prouver.
let comportementTelephone: 'reconnait' | 'annule' | 'refuse' = 'reconnait';
const erreurNommee = (nom: string) => { const e = new Error(nom); e.name = nom; return e; };
const repondreTelephone = async () => {
  if (comportementTelephone === 'annule') throw erreurNommee('NotAllowedError');
  if (comportementTelephone === 'refuse') throw erreurNommee('InvalidStateError');
  return { id: 'cred-1' } as any;
};

let reponses: { status: number; corps: unknown }[] = [];
let i = 0;
function brancher(...r: { status: number; corps: unknown }[]) { reponses = r; i = 0; }
(globalThis as any).fetch = async () => {
  const r = reponses[Math.min(i++, reponses.length - 1)];
  return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.corps } as unknown as Response;
};

const EXPIRE = { status: 401, corps: { message: 'Unauthorized', statusCode: 401 } };
const REFRESH_KO = { status: 200, corps: { error: 'Token invalide' } };
const ME = { status: 200, corps: { user: { phone: '+2250700000001' } } };
const OPTIONS = { status: 200, corps: { userId: 'u1', challenge: 'c' } };
const VERIF_OK = { status: 200, corps: { verified: true } };
const VERIF_KO = { status: 200, corps: { verified: false } };

const { verifyWebAuthnForKeiwa, navigateurWebAuthn } = await import('../../hooks/useWebAuthn.js');
navigateurWebAuthn.authentifier = repondreTelephone;
navigateurWebAuthn.enregistrer = repondreTelephone;

console.log('\nLE CAS QUI ACCUSAIT À TORT : session finie');
{
  magasin.clear();
  comportementTelephone = 'reconnait';
  brancher(EXPIRE, REFRESH_KO, EXPIRE);
  const r = await verifyWebAuthnForKeiwa();
  eq(r.etat, 'session_expiree', 'l’état dit « session expirée »…');
  eq(r.etat === 'non_reconnue', false, '…et surtout PAS « elle n’a pas été reconnue »');
}

console.log('\nLe téléphone reconnaît vraiment');
{
  magasin.clear();
  comportementTelephone = 'reconnait';
  brancher(ME, OPTIONS, VERIF_OK);
  eq((await verifyWebAuthnForKeiwa()).etat, 'ok', 'aucune régression sur le cas normal');
}

console.log('\nLe téléphone ne reconnaît pas — le VRAI cas « ce n’est pas toi »');
{
  magasin.clear();
  comportementTelephone = 'reconnait';
  brancher(ME, OPTIONS, VERIF_KO);
  eq((await verifyWebAuthnForKeiwa()).etat, 'non_reconnue', 'le serveur dit non : c’est un verdict');
}

console.log('\nElle annule — ce n’est pas un échec, et ça ne se dit pas pareil');
{
  magasin.clear();
  comportementTelephone = 'annule';
  brancher(ME, OPTIONS, VERIF_OK);
  eq((await verifyWebAuthnForKeiwa()).etat, 'annulee', 'annulation distinguée du refus');
}

console.log('\nLe doigt est refusé par l’appareil');
{
  magasin.clear();
  comportementTelephone = 'refuse';
  brancher(ME, OPTIONS, VERIF_OK);
  eq((await verifyWebAuthnForKeiwa()).etat, 'non_reconnue', 'échec WebAuthn = non reconnue');
}

console.log(echecs === 0
  ? '\n✓ API-01b — une session finie ne se déguise plus en doigt refusé\n'
  : `\n✗ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
