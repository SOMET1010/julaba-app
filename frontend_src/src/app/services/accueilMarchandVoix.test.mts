import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

let failures = 0;
function ok(condition: boolean, label: string) {
  if (condition) console.log('  ✅', label);
  else { console.log('  ❌', label); failures += 1; }
}

const service = readFileSync(new URL('./accueilMarchandVoix.ts', import.meta.url), 'utf8');
const accueil = readFileSync(new URL('../components/marchand/MarchandAccueilVoice.tsx', import.meta.url), 'utf8');
const reconnaissance = readFileSync(new URL('../components/auth/PropositionReconnaissance.tsx', import.meta.url), 'utf8');
const publicDir = fileURLToPath(new URL('../../../public/voix/fr-CI/prototype', import.meta.url));
const clips = [
  'tata-accueil-comptoir.mp3',
  'tata-accueil-caisse.mp3',
  'tata-reconnaissance-proposition.mp3',
  'tata-reconnaissance-reussie.mp3',
  'tata-reconnaissance-session.mp3',
  'tata-reconnaissance-erreur.mp3',
  'tata-reconnaissance-refus.mp3',
];

console.log('\n[1] Aucun repli navigateur sur l’Accueil marchand');
ok(!/\bspeak\s*\(/.test(accueil), 'MarchandAccueilVoice ne synthétise aucune phrase');
ok(!/\bspeak\s*\(/.test(reconnaissance), 'PropositionReconnaissance ne synthétise aucune phrase');
ok(!/speakClipOrText|speechSynthesis|\bspeak\s*\(/.test(service), 'le service local ne contient aucun repli TTS');
ok(/direAccueilMarchand/.test(accueil) && /direAccueilMarchand/.test(reconnaissance), 'les deux écrans utilisent le même service local');

console.log('\n[2] Couverture offline des phrases fixes');
for (const clip of clips) ok(existsSync(`${publicDir}/${clip}`), `${clip} est embarqué`);

console.log(failures === 0 ? '\nAccueil marchand sans voix navigateur : OK ✅\n' : `\n${failures} échec(s) ❌\n`);
if (failures > 0) process.exit(1);
