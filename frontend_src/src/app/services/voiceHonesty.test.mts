import { readFileSync } from 'node:fs';
import { LANGUE_PRETE, langueDisponible } from '../hooks/useLangPref.js';

let failures = 0;
function ok(condition: boolean, label: string) {
  if (condition) console.log('  ✅', label);
  else { console.log('  ❌', label); failures += 1; }
}

console.log('\n[1] Disponibilité linguistique honnête');
ok(LANGUE_PRETE.french && langueDisponible('french'), 'le français livré reste activable');
ok(!LANGUE_PRETE.dioula && !langueDisponible('dioula'), 'le Dioula incomplet est marqué en préparation');
ok(!LANGUE_PRETE.bambara && !langueDisponible('bambara'), 'le Bambara incomplet est marqué en préparation');

console.log('\n[2] Pré-cache vocal réellement attendu à l’installation');
const sw = readFileSync(new URL('../../../public/sw.js', import.meta.url), 'utf8');
ok(
  /await\s+Promise\.allSettled\(PRECACHE_VOICE\.map/.test(sw),
  'waitUntil attend la tentative de pré-cache de tous les clips Tata',
);

console.log('\n[3] Connexion Auto jamais rendue muette par apprentissage clavier');
const login = readFileSync(new URL('../components/auth/LoginPassword.tsx', import.meta.url), 'utf8');
ok(!/guidageVocal\(accessMode\)/.test(login), 'LoginPassword ne transforme plus Auto effectif Lecture en silence');
ok(/verifierOfflineModel/.test(login), 'LoginPassword re-sonde le moteur Android et rend le micro réactif');

console.log('\n[4] Onboarding honnête tant que les MP3 humains manquent');
const onboarding = readFileSync(new URL('./onboardingVoix.ts', import.meta.url), 'utf8');
ok(!/speakClipOrText/.test(onboarding), 'aucune pseudo-voix synthétique ne remplace silencieusement Tata');
ok((onboarding.match(/atteste:\s*false/g) || []).length === 9, 'les neuf intros absentes restent explicitement non attestées');
ok(/VITE_JULABA_VOICE_PREVIEW\s*===\s*'true'/.test(onboarding), 'un clip prototype exige un drapeau de prévisualisation explicite');
ok(/clip\.prototype\s*&&\s*PROTOTYPES_VOIX_ACTIFS/.test(onboarding), 'un prototype non attesté reste muet hors prévisualisation');
ok(/if \(!clipUrl\) return/.test(onboarding), 'une intro non attestée laisse le parcours visuel et tactile continuer');

console.log('\n[5] Un geste sonore explicite, sans double déclenchement');
const welcome = readFileSync(new URL('../components/auth/Welcome.tsx', import.meta.url), 'utf8');
const onboardingSlides = readFileSync(new URL('../components/auth/OnboardingSlides.tsx', import.meta.url), 'utf8');
ok(/login-tata-inline[\s\S]{0,180}aria-label="Écouter Tantie Nanti Lou"/.test(welcome), 'le haut-parleur d’accueil reste identifiable');
ok(!/window\.addEventListener\('pointerdown'/.test(welcome), 'aucun premier toucher global ne vole ou ne double le geste choisi');
ok(/const commencer[\s\S]{0,260}laisserIntroContinuer\.current = true;[\s\S]{0,80}accueille\(\)/.test(welcome), '« Écouter et entrer » démarre la voix sur un geste autorisé et la laisse continuer');
ok(/onPointerDown=\{\(e\) => e\.stopPropagation\(\)\}[\s\S]{0,120}handleListen/.test(onboardingSlides), 'la réécoute de présentation ne lance qu’une seule lecture');

console.log(failures === 0 ? '\nTous les garde-fous voix honnête sont verts ✅\n' : `\n${failures} échec(s) ❌\n`);
if (failures > 0) process.exit(1);
