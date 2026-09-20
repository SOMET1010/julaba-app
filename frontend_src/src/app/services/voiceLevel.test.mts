import * as audio from './audioManager.js';

let failures = 0;
const ok = (condition: boolean, label: string) => {
  console.log(condition ? '  ✅' : '  ❌', label);
  if (!condition) failures += 1;
};

function fauxLecteurs() {
  const lus: string[] = [];
  audio.__setPlayers(
    (text) => {
      lus.push(`tts:${text}`);
      return { promise: Promise.resolve('ended'), stop() {} };
    },
    (src) => {
      lus.push(`clip:${src.url || 'base64'}`);
      return { promise: Promise.resolve('ended'), stop() {} };
    },
  );
  return lus;
}

console.log('\n[1] Classification des annonces');
ok(audio.importancePourTexte('Bienvenue, on est ensemble') === 'accompagnement', 'un accueil est un accompagnement');
ok(audio.importancePourTexte('Vente confirmée : 500 francs') === 'essentiel', 'argent et confirmation sont essentiels');
ok(audio.importancePourTexte('Erreur réseau, la dépense est gardée') === 'essentiel', 'erreur et hors-ligne sont essentiels');
ok(audio.resoudreNiveauVoix(undefined, null, false) === 2, 'avant connexion, une préférence absente active l’accompagnement complet');
ok(audio.resoudreNiveauVoix(undefined, null, true) === 1, 'après connexion, une préférence absente garde les annonces essentielles');
ok(audio.resoudreNiveauVoix(undefined, '0', false) === 0, 'un choix silencieux explicite reste respecté');
ok(audio.resoudreNiveauVoix(2, '0', true) === 2, 'la préférence du profil prime sur le stockage local');

console.log('\n[2] Silencieux bloque tout');
audio.__reset();
let lus = fauxLecteurs();
audio.setVoiceLevel(0);
await audio.speak('Vente confirmée : 500 francs');
await audio.playClip({ url:'/critique.mp3' });
ok(lus.length === 0, 'ni texte ni clip ne démarrent');

console.log('\n[3] Essentiel garde l’argent et les alertes seulement');
audio.__reset();
lus = fauxLecteurs();
audio.setVoiceLevel(1);
await audio.speak('Bienvenue, on est ensemble');
await audio.speakAuto('Petit conseil du jour');
await audio.speak('Vente confirmée : 500 francs');
ok(!lus.some(x => x.includes('Bienvenue') || x.includes('Petit conseil')), 'l’accompagnement est filtré');
ok(lus.some(x => x.includes('500 francs')), 'la confirmation financière reste audible');

console.log('\n[4] Complet conserve tout l’accompagnement');
audio.__reset();
lus = fauxLecteurs();
audio.setVoiceLevel(2);
await audio.speak('Bienvenue, on est ensemble');
ok(lus.some(x => x.includes('Bienvenue')), 'l’accueil est audible en mode complet');

audio.__resetPlayers();
audio.__reset();
console.log(failures === 0 ? '\nTous les tests de niveau vocal sont verts ✅\n' : `\n${failures} échec(s) ❌\n`);
if (failures) process.exit(1);
