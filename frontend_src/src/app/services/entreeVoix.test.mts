import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

let failures = 0;
function ok(condition: boolean, label: string) {
  if (condition) console.log('  ✅', label);
  else { console.log('  ❌', label); failures += 1; }
}

const serviceUrl = new URL('./entreeVoix.ts', import.meta.url);
const service = readFileSync(serviceUrl, 'utf8');
const login = readFileSync(new URL('../components/auth/LoginPassword.tsx', import.meta.url), 'utf8');
const onboarding = readFileSync(new URL('./onboardingVoix.ts', import.meta.url), 'utf8');
const publicDir = fileURLToPath(new URL('../../../public', import.meta.url));
const clips = [
  'tata-entree-numero.mp3',
  'tata-entree-numero-voix.mp3',
  'tata-entree-code.mp3',
  'tata-entree-code-erreur.mp3',
  'tata-entree-connexion.mp3',
  'tata-entree-reconnaissance.mp3',
  'tata-entree-presentation.mp3',
];

console.log('\n[1] Une seule source vocale pour Numéro et Code');
ok(!/managerSpeak|speakClipOrText|tataUiClipForText/.test(login), 'LoginPassword n’appelle plus la synthèse navigateur ni l’ancien pack');
ok(/direEntreeTexte/.test(login) && /direEntree\('code'\)/.test(login), 'le login utilise le pack d’entrée local');
ok(!/\bspeak\(|speakClipOrText/.test(service), 'le service d’entrée ne contient aucun repli TTS');
ok(/resolveLocalVoiceChoice/.test(service), 'une phrase sans clip devient texte seul');

console.log('\n[2] Couverture des étapes critiques');
for (const clip of clips) {
  ok(existsSync(`${publicDir}/voix/fr-CI/prototype/${clip}`), `${clip} est embarqué`);
}
ok(/tata-entree-presentation\.mp3/.test(onboarding), 'la deuxième page utilise la même famille vocale');

console.log(failures === 0 ? '\nTous les garde-fous de voix d’entrée sont verts ✅\n' : `\n${failures} échec(s) ❌\n`);
if (failures > 0) process.exit(1);
