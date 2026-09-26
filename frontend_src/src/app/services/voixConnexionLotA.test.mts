/**
 * LE PASSAGE CHIFFRES ⇄ IMAGES PARLE, ET DIT LA MÊME CHOSE PARTOUT — AUTH-21.
 * Lancer : npm run test:voix-connexion-lot-a
 *
 * LE DÉFAUT QU'ON FERME. `LoginPassword.basculerPinEnImages` annonçait le
 * changement de mode par `parle(...)`, qui passe par `direEntreeTexte`. Cette
 * fonction ne connaît QUE les clés de `entreeVoix.ts`, et n'a volontairement
 * aucun repli parlé — donner une voix de secours à cette porte ferait
 * prononcer le numéro de téléphone de la marchande à voix haute, au marché.
 *
 * La phrase du basculement n'était pas dans la table. L'écran annonçait donc
 * le changement EN SILENCE. Pas une panne : une clé jamais ajoutée, et rien
 * pour le signaler. C'est le pire cas — le code a l'air de parler.
 *
 * QUATRE ENDROITS DISAIENT TROIS CHOSES. Le clip enregistré, le script
 * (`loginVoiceScript`), le catalogue et l'écran portaient des formulations
 * différentes du même moment. Un identifiant, un texte : ils sont alignés sur
 * CE QU'ON ENTEND, puisque c'est le clip qu'une marchande reçoit.
 *
 * ET LE TEXTE Y GAGNE. L'écran disait « Maintenant, des images à la place des
 * chiffres. » Le clip ajoute « Ton code n'a pas changé. » — exactement la
 * question qu'on se pose quand son pavé change sous les yeux. On ne remplace
 * jamais une consigne par une plus pauvre ; ici elle est plus complète.
 *
 * CE QUE CETTE GARDE TIENT : que les quatre endroits ne redivergent pas, et
 * que ces clips ne dépendent PAS du drapeau des prototypes.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ENTREE_VOICE_CLIPS, urlClipEntree } from './entreeVoix.js';

const ici = dirname(fileURLToPath(import.meta.url));
const app = join(ici, '..');

let failures = 0;
const ok = (c: boolean, label: string, detail = '') => {
  if (c) console.log('  ✅', label);
  else { console.log('  ❌', label, detail ? `\n     ${detail}` : ''); failures++; }
};
const norm = (s: string) => (s || '').toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ')
  .replace(/\s+/g, ' ').trim();

const ecran = readFileSync(join(app, 'components/auth/LoginPassword.tsx'), 'utf8');
const script = readFileSync(join(app, 'services/loginVoiceScript.ts'), 'utf8');
const catalogue = readFileSync(join(app, 'i18n/voice/catalog.ts'), 'utf8');

const CAS = [
  { cle: 'pinImages'  as const, auth: 'AUTH_21', fichier: '/voix/tata/login-21.mp3' },
  { cle: 'pinChiffres' as const, auth: 'AUTH_22', fichier: '/voix/tata/login-22.mp3' },
  { cle: 'effacement'  as const, auth: 'AUTH_24', fichier: '/voix/tata/login-24.mp3' },
  { cle: 'numeroIncomplet' as const, auth: 'AUTH_11', fichier: '/voix/tata/login-11.mp3' },
  { cle: 'reconnaissanceEchouee' as const, auth: 'AUTH_26', fichier: '/voix/tata/login-26.mp3' },
  { cle: 'tropDEssais' as const, auth: 'AUTH_30', fichier: '/voix/tata/login-30.mp3' },
  { cle: 'microIndisponible' as const, auth: 'AUTH_16', fichier: '/voix/tata/login-16.mp3' },
  { cle: 'codeVide' as const, auth: 'AUTH_19', fichier: '/voix/tata/login-19.mp3' },
  { cle: 'serveurLent' as const, auth: 'AUTH_33', fichier: '/voix/tata/login-33.mp3' },
  { cle: 'choixEnregistre' as const, auth: 'AUTH_35', fichier: '/voix/tata/login-35.mp3' },
  { cle: 'choixConserve' as const, auth: 'AUTH_36', fichier: '/voix/tata/login-36.mp3' },
];

console.log('\n[1] la clé existe, et pointe le bon clip');
for (const c of CAS) {
  const clip = ENTREE_VOICE_CLIPS[c.cle];
  ok(!!clip, `${c.cle} est déclarée`);
  ok(clip?.file === c.fichier, `${c.cle} → ${c.fichier}`, `obtenu : ${clip?.file}`);
}

console.log('\n[2] ces clips NE dépendent PAS du drapeau des prototypes');
for (const c of CAS) {
  ok(urlClipEntree(c.cle, false) === c.fichier,
     `${c.cle} est servie même prototypes éteints`,
     'un clip du lot A ne doit pas attendre VITE_JULABA_VOICE_PREVIEW');
}

console.log('\n[3] on ne ment pas sur « attesté »');
for (const c of CAS) {
  const clip = ENTREE_VOICE_CLIPS[c.cle];
  ok(clip?.atteste === false && clip?.lotA === true,
     `${c.cle} : atteste=false, lotA=true`,
     'personne ne les a écoutés — `atteste` reste réservé à l\'oreille humaine');
}

console.log('\n[4] l\'écran, la table, le script et le catalogue disent LA MÊME chose');
for (const c of CAS) {
  const attendu = norm(ENTREE_VOICE_CLIPS[c.cle].texte);
  ok(norm(ecran).includes(attendu), `${c.cle} : l'écran dit ce texte`,
     'un mot d\'écart et direEntreeTexte ne trouve plus la clé — écran muet, sans erreur');
  const dansScript = new RegExp(`id: '${c.auth}'[^}]*?texteFr: "([^"]*)"`).exec(script);
  ok(!!dansScript && norm(dansScript[1]) === attendu,
     `${c.auth} : loginVoiceScript dit ce texte`, `obtenu : ${dansScript?.[1]}`);
  const dansCat = new RegExp(`id: '${c.auth}'[^}]*?frActuel: '((?:[^'\\\\]|\\\\.)*)'`).exec(catalogue);
  ok(!!dansCat && norm(dansCat[1].replace(/\\'/g, "'")) === attendu,
     `${c.auth} : le catalogue dit ce texte`, `obtenu : ${dansCat?.[1]}`);
}

console.log('\n[5] effacer ne dit JAMAIS ce qui a été tapé');
// Le commentaire d'origine de `handleKeyDelete` pose la règle : « Effacer est
// un AUTRE geste : motif distinct, et un mot — "Effacé" ne révèle aucun
// chiffre, contrairement au numéro lui-même. » Le clip doit la respecter.
{
  const t = norm(ENTREE_VOICE_CLIPS.effacement.texte);
  ok(!/[0-9]/.test(t) && !/chiffre|numero|code/.test(t),
     'le clip d\'effacement ne nomme ni chiffre, ni numéro, ni code',
     `texte : « ${ENTREE_VOICE_CLIPS.effacement.texte} »`);
}

console.log('\n[6bis] les erreurs branchées sont bien celles que l\'écran affiche');
// `LoginPassword` fait `parle(error)` sur CHAQUE erreur (l.317), et cette porte
// ne dit que ce qui a une clé. Un `setError` désaligné d'un mot, et l'écran
// revibre en silence — exactement l'état qu'on vient de quitter.
for (const cle of ['reconnaissanceEchouee', 'tropDEssais'] as const) {
  const t = ENTREE_VOICE_CLIPS[cle].texte;
  ok(ecran.includes(t.replace(/'/g, "\\'")) || ecran.includes(t),
     `${cle} : un setError de l'écran porte ce texte exact`,
     `texte : « ${t} »`);
}

console.log('\n[6] le texte n\'a pas reculé : il dit toujours que le code est intact');
ok(/n.a pas change/.test(norm(ENTREE_VOICE_CLIPS.pinImages.texte)),
   'le passage aux images rassure sur le code',
   'c\'est LA question d\'une marchande quand son pavé change sous ses yeux');

console.log(failures === 0
  ? '\nLe basculement du pavé parle, d\'une seule voix ✅\n'
  : `\n${failures} échec(s).\n`);
process.exit(failures === 0 ? 0 : 1);
