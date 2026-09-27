/**
 * MIC-01 — LE MICRO S'ARRÊTE QUAND ELLE S'ARRÊTE, PAS AU BOUT DE SIX SECONDES.
 *
 * LE DÉFAUT TERRAIN, APK `0459dc0`. `MicroVenteCaisse` alimentait `aParle`
 * avec `liveTranscript`. Or `useVoiceCore` ne l'écrit JAMAIS pendant l'écoute :
 * il le vide au démarrage de l'enregistrement et ne le réalimente qu'APRÈS
 * `stopRecording` (« Analyse en cours… »). La chaîne est
 * MediaRecorder → blob → sherpa-onnx : il n'y a pas de transcription en
 * direct, et `startSilenceDetection` y est un no-op assumé (« push-to-talk
 * uniquement »).
 *
 * `aParle` valait donc TOUJOURS faux, et `finDEcoute` fermait le micro à
 * 6 000 ms exactement avec la raison « elle n'a rien dit » — en pleine phrase.
 * La fin de phrase à 1,5 s de silence et le plafond à 12 s étaient
 * INATTEIGNABLES. VOX-01 ne faisait pas ce que son commentaire annonce.
 *
 * LA RÈGLE N'A PAS CHANGÉ. C'est sa SOURCE qui était fausse : le niveau du
 * micro (`useVoiceCore.volume`) est vivant à chaque image, lui.
 *
 * Lancer : npm run test:micro-niveau-parole
 */
import { finDEcoute, parleMaintenant, NIVEAU_PAROLE, SILENCE_FIN_MS, AVANT_PREMIER_MOT_MS, ECOUTE_MAX_MS } from './ecouteCaisse.js';
import { readFileSync } from 'node:fs';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

console.log('\nMIC-01 — la fin d\'écoute se mesure sur le SON (terrain 0459dc0)\n');

console.log('[1] Le défaut, tel qu\'il se produisait : aucune preuve de parole');
{
  // Ce que l'écran passait vraiment : `aParle` figé à faux, quoi qu'elle dise.
  const a5900 = finDEcoute({ ecoute: true, aParle: false, msDepuisDernierMot: 0, msDepuisOuverture: 5900 });
  const a6000 = finDEcoute({ ecoute: true, aParle: false, msDepuisDernierMot: 0, msDepuisOuverture: 6000 });
  ok(a5900.cesser === false, 'à 5,9 s le micro est encore ouvert');
  ok(a6000.cesser === true && a6000.raison === 'rien-dit',
     'à 6,0 s il se ferme sur « rien-dit » — c\'est la coupure que Patrick subissait');
  ok(AVANT_PREMIER_MOT_MS === 6000, 'et 6 000 ms, c\'est bien AVANT_PREMIER_MOT_MS');
}

console.log('\n[2] Le seuil de parole');
{
  ok(parleMaintenant(NIVEAU_PAROLE) === true, `au seuil (${NIVEAU_PAROLE}/100), on considère qu'une voix porte`);
  ok(parleMaintenant(NIVEAU_PAROLE - 1) === false, 'juste en dessous, non');
  ok(parleMaintenant(0) === false, 'micro muet : pas de parole');
  ok(parleMaintenant(NaN) === false, 'une mesure absente n\'invente pas une parole');
}

/**
 * LA BOUCLE DE L'ÉCRAN, REJOUÉE. Même algorithme que `MicroVenteCaisse` :
 * échantillon toutes les 250 ms, `aParle` dès qu'un échantillon dépasse le
 * seuil, `dernierSon` remis à jour tant qu'on entend. Le garde-fou [4]
 * vérifie que l'écran tient bien cette version-là, et pas l'ancienne.
 */
function simuler(niveauA: (ms: number) => number, pasMs = 250): { ferme: number | null; raison: string | null } {
  let aParle = false, dernierSon = 0;
  for (let ms = pasMs; ms <= 30000; ms += pasMs) {
    if (parleMaintenant(niveauA(ms))) { aParle = true; dernierSon = ms; }
    const fin = finDEcoute({
      ecoute: true, aParle,
      msDepuisDernierMot: ms - dernierSon,
      msDepuisOuverture: ms,
    });
    if (fin.cesser) return { ferme: ms, raison: fin.raison };
  }
  return { ferme: null, raison: null };
}

console.log('\n[3] Le parcours réel : elle appuie, elle hésite, elle parle, elle s\'arrête');
{
  // Elle hésite 1,8 s, dit sa phrase jusqu'à 6,4 s, puis se tait.
  const r = simuler((ms) => (ms >= 1800 && ms <= 6400 ? 45 : 3));
  ok(r.raison === 'silence', `le micro se ferme sur le SILENCE, pas sur « rien-dit » : ${r.raison}`);
  ok(r.ferme !== null && r.ferme > 6400,
     `et APRÈS qu'elle a fini (fermé à ${r.ferme} ms, elle s'est tue à 6 400 ms)`);
  ok(r.ferme !== null && r.ferme - 6400 <= SILENCE_FIN_MS + 250,
     'sans la faire attendre plus que le silence de fin de phrase');
}
{
  // La même phrase, mais elle démarre tard : 4 s d'hésitation.
  const r = simuler((ms) => (ms >= 4000 && ms <= 9000 ? 45 : 3));
  ok(r.raison === 'silence' && r.ferme !== null && r.ferme > 9000,
     `une longue hésitation ne coupe plus la phrase (fermé à ${r.ferme} ms sur « ${r.raison} »)`);
}
{
  // Elle n'a vraiment rien dit : le renoncement doit rester possible.
  const r = simuler(() => 2);
  ok(r.ferme === AVANT_PREMIER_MOT_MS && r.raison === 'rien-dit',
     `le vrai silence ferme toujours à ${AVANT_PREMIER_MOT_MS} ms sur « rien-dit »`);
}
{
  // Un marché bruyant : le niveau ne retombe jamais. Le plafond reprend la main.
  const r = simuler(() => 60);
  ok(r.ferme === ECOUTE_MAX_MS && r.raison === 'trop-long',
     `dans le bruit continu, c'est le plafond qui ferme (${r.ferme} ms, « ${r.raison} ») — jamais une minute`);
}

console.log('\n[4] LA PREUVE TRAVERSE — l\'écran ne peut pas revenir à l\'ancienne source');
{
  const src = readFileSync(new URL('../components/marchand/MicroVenteCaisse.tsx', import.meta.url), 'utf8');
  // La boucle de fermeture : du `finDEcoute({` jusqu'à sa parenthèse fermante.
  const i = src.indexOf('const fin = finDEcoute({');
  const boucle = i >= 0 ? src.slice(i, src.indexOf('});', i) + 3) : '';
  ok(boucle !== '', 'la boucle de fermeture existe toujours dans l\'écran');
  ok(/aParle:\s*aParleRef\.current/.test(boucle),
     `« aParle » vient de la mesure du son : ${boucle.split('\n').find(l => l.includes('aParle')) ?? ''}`);
  ok(!/liveTranscript|texteVuRef/.test(boucle),
     'et PLUS de liveTranscript dans les faits d\'écoute — la source morte ne peut pas revenir');
  ok(/parleMaintenant\(niveauRef\.current\)/.test(src),
     'le niveau du micro est bien lu par la règle pure');
  // Le niveau change à chaque image : dans les dépendances, il détruirait
  // l'intervalle soixante fois par seconde et le silence ne s'accumulerait
  // jamais. C'est l'erreur qui rendrait ce correctif inopérant en silence.
  const deps = src.split('\n').find(l => l.includes('}, [ecouteEnCours')) ?? '';
  ok(deps !== '' && !/volume/.test(deps),
     `« volume » n'est pas dans les dépendances de l'effet : ${deps.trim()}`);
}

console.log(`\n${echecs === 0 ? '✓ MIC-01 : aucun échec' : `✗ MIC-01 : ${echecs} échec(s)`}\n`);
process.exit(echecs === 0 ? 0 : 1);
