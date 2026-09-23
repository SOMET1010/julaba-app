/**
 * CHAQUE FRAPPE SE SENT, AUCUNE NE SE TRAHIT — NUM-03.
 *
 * LE DÉFAUT, mesuré le 23/09 et plus précis que ce que le backlog disait.
 * Le backlog notait « le pavé numérique est silencieux ». C'est inexact pour
 * l'étape NUMÉRO : elle vibre à chaque chiffre (`navigator.vibrate(12)`), et
 * son silence VOCAL est voulu — NUM-02, on ne dit jamais un chiffre du numéro
 * à voix haute au marché.
 *
 * LE VRAI TROU EST LE CODE. Dans `handleKeyPress`, la branche du PIN pose le
 * chiffre et s'arrête là : ni vibration, ni son, rien. Le geste le plus répété
 * de l'application — quatre chiffres à chaque connexion — ne donne AUCUN
 * retour. Une marchande qui ne lit pas ne sait pas si son appui a compté, et
 * cette asymétrie avec l'étape numéro n'était nommée nulle part.
 *
 * LA RÈGLE QUI TIENT LES DEUX ÉTAPES : un retour se SENT (vibration), il ne se
 * LIT pas et il ne DIT jamais le chiffre. Effacer est un geste distinct, donc
 * un motif distinct — et lui peut se dire, parce que « Effacé » ne révèle rien.
 *
 * Lancer : npm run test:retour-frappe
 */
import { readFileSync } from 'node:fs';
import { retourFrappe, type EtapeSaisie } from './retourDeFrappe.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};
const SOURCE = readFileSync(
  new URL('../components/auth/LoginPassword.tsx', import.meta.url), 'utf-8');
const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

const ETAPES: EtapeSaisie[] = ['numero', 'code'];

console.log('\nChaque frappe se sent, aucune ne se trahit\n');

console.log('[1] LES DEUX ÉTAPES DONNENT UN RETOUR — LE CODE AUSSI');
for (const etape of ETAPES) {
  const r = retourFrappe(etape, 'chiffre');
  ok(r.vibration.length > 0, `« ${etape} » : un appui se SENT (${r.vibration.join('-')} ms)`);
}
{
  const num = retourFrappe('numero', 'chiffre');
  const code4 = retourFrappe('code', 'chiffre');
  ok(JSON.stringify(num.vibration) === JSON.stringify(code4.vibration),
     'et le MÊME appui donne le MÊME retour : le code n\'est pas un geste de seconde classe');
}

console.log('\n[2] AUCUN RETOUR NE RÉVÈLE UN CHIFFRE — NUM-02 TIENT');
for (const etape of ETAPES) {
  const r = retourFrappe(etape, 'chiffre');
  ok(r.ditVoixHaute === null,
     `« ${etape} » : rien n'est dit à voix haute — au marché, on est entourée`);
}

console.log('\n[3] EFFACER EST UN AUTRE GESTE, DONC UN AUTRE MOTIF');
for (const etape of ETAPES) {
  const chiffre = retourFrappe(etape, 'chiffre');
  const efface = retourFrappe(etape, 'effacement');
  ok(JSON.stringify(efface.vibration) !== JSON.stringify(chiffre.vibration),
     `« ${etape} » : la main distingue effacer d'ajouter sans regarder`);
  ok(efface.ditVoixHaute !== null,
     `« ${etape} » : et « effacé » se dit — ce mot ne révèle aucun chiffre`);
  ok(!/\d/.test(efface.ditVoixHaute ?? ''),
     'la phrase d\'effacement ne contient elle-même aucun chiffre');
}

console.log('\n[4] LA PREUVE TRAVERSE — L\'ÉCRAN PASSE PAR LA RÈGLE');
{
  ok(/retourFrappe\(/.test(code), 'l\'écran appelle la règle');
  // Bornée au corps de `handleKeyPress` : trouver le nom ailleurs (un import)
  // ne prouverait rien. Leçon payée cinq fois cette session.
  const handle = code.slice(code.indexOf('const handleKeyPress'),
                            code.indexOf('const retourDepuisCode'));
  // LES DEUX BRANCHES, nommément. Une seule aurait suffi à faire passer une
  // formulation plus lâche — et c'est exactement le défaut qu'on ferme : une
  // étape servie, l'autre oubliée.
  ok(/'numero',\s*'chiffre'/.test(handle),
     'la branche du NUMÉRO rend un retour');
  ok(/'code',\s*'chiffre'/.test(handle),
     'la branche du CODE aussi — c\'était elle qui ne rendait rien');
  ok(!/navigator\.vibrate\?\.\(12\)/.test(handle),
     'la vibration en dur a disparu du traitement : une seule source décide');
}

console.log(echecs === 0
  ? '\n✅ Un appui se sent toujours, et ne se trahit jamais.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
