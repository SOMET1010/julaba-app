/**
 * LE MICRO RÉPOND TOUJOURS, ET L'ÉCRAN A TOUJOURS UNE SORTIE — VOX-02.
 *
 * LE DÉFAUT, trouvé sur le téléphone de Patrick le 23/09 à 20h57. Il parle,
 * l'écran affiche « Je n'ai pas compris. Redis-moi. » — et plus rien ne
 * répond. Ses mots : « Je dois sortir mais il n'y a pas de vrai bouton pour
 * sortir. »
 *
 * DEUX TROUS, MESURÉS, QUI SE REFERMENT L'UN SUR L'AUTRE :
 *
 *   1. `VoiceState` a SEPT valeurs. `handleMicClick` en traite SIX :
 *      `confirming` n'apparaît dans AUCUNE branche. Or il est posé quatre
 *      fois, toutes sur le chemin d'une confirmation FINANCIÈRE ou d'une
 *      question (« J'ajoute gombo à ta boutique ? »). Dès qu'une confirmation
 *      est en cours, l'appui sur le micro ne fait RIEN — pas d'erreur, pas de
 *      son, pas de retour.
 *
 *   2. La sortie (« Parler encore à Tantie ») ne s'affiche que si
 *      `isDone || isError`, c'est-à-dire dans DEUX états sur sept. Partout
 *      ailleurs, aucun geste ne remet l'écran à zéro.
 *
 * Micro inerte + aucune sortie = un écran mort. Pour une marchande qui ne lit
 * pas, il n'y a pas de « sortir et revenir » : elle repose le téléphone.
 *
 * CE QU'ON NE FAIT PAS : toucher `useVoiceCore.ts`, FIGÉ par VOICE-01. La
 * décision sort dans un module pur ; l'écran l'applique avec les primitives
 * que le hook expose déjà.
 *
 * ET LA RÈGLE EST EXHAUSTIVE. Le trou ne vient pas d'une inattention mais
 * d'une suite de `if/else if` sur un type à sept valeurs : le compilateur ne
 * dit rien quand il en manque une. Ici, un état oublié NE COMPILE PAS.
 *
 * Lancer : npm run test:geste-micro
 */
import { readFileSync } from 'node:fs';
import { gesteDuMicro, sortieVisible, ETATS_VOIX, type EtatVoix } from './gesteDuMicro.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};
const code = readFileSync(
  new URL('../components/marchand/MicroVenteCaisse.tsx', import.meta.url), 'utf-8')
  .replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
  .filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

console.log('\nLe micro répond toujours, et l\'écran a toujours une sortie\n');

console.log('[1] AUCUN DES SEPT ÉTATS NE LAISSE LE MICRO SANS RÉPONSE');
{
  ok(ETATS_VOIX.length === 7, `la famille est complète — ${ETATS_VOIX.length} états`);
  for (const e of ETATS_VOIX) {
    const g = gesteDuMicro(e);
    ok(!!g, `« ${e} » → « ${g} » : un appui fait quelque chose`);
  }
}

console.log('\n[2] `confirming` — LE TROU QUI A BLOQUÉ LE TÉLÉPHONE');
{
  ok(gesteDuMicro('confirming') === 'reprendre',
     'une question en cours : l\'appui l\'abandonne ET réécoute, en un seul geste');
  // Elle vient d'appuyer sur le micro : elle veut PARLER, pas seulement
  // annuler. Un geste qui annule sans rouvrir l'oreille la laisserait devant
  // un écran muet, ce qui est le défaut d'à côté.
  ok(gesteDuMicro('confirming') !== 'arreter',
     'et surtout pas « arrêter » : elle a appuyé POUR parler');
}

console.log('\n[3] LES AUTRES ÉTATS GARDENT LEUR COMPORTEMENT');
{
  ok(gesteDuMicro('idle') === 'ecouter', 'au repos, on ouvre l\'oreille');
  ok(gesteDuMicro('error') === 'ecouter', 'après une erreur aussi');
  ok(gesteDuMicro('listening') === 'arreter', 'pendant l\'écoute, on ferme');
  ok(gesteDuMicro('thinking') === 'interrompre', 'pendant la réflexion, on coupe');
  ok(gesteDuMicro('processing') === 'interrompre', 'pendant le traitement aussi');
  ok(gesteDuMicro('speaking') === 'ecouter', 'quand Tantie parle, on la coupe pour parler');
}

console.log('\n[4] UNE SORTIE EXISTE DANS TOUS LES ÉTATS QUI ATTENDENT');
{
  // C'est le second trou : la sortie n'existait que dans 2 états sur 7.
  for (const e of ETATS_VOIX) {
    if (e === 'idle') continue;   // au repos, le micro EST la sortie
    ok(sortieVisible(e, false) === true,
       `« ${e} » : un geste remet l'écran à zéro, même sans réponse à afficher`);
  }
  ok(sortieVisible('idle', true) === true,
     'et au repos APRÈS une réponse, la sortie reste — c\'est le cas d\'avant');
  ok(sortieVisible('idle', false) === false,
     'au repos sans rien, pas de bouton inutile : le micro suffit');
}

console.log('\n[5] LA PREUVE TRAVERSE — L\'ÉCRAN APPLIQUE LA RÈGLE');
{
  ok(/gesteDuMicro\(/.test(code), 'l\'écran demande le geste à la règle');
  // BORNÉ AU BOUTON. Vérifier que la fonction existe quelque part dans le
  // fichier laissait passer un bouton rebranché sur l'ancien chemin — sixième
  // fois de la session qu'un test de câblage passe pour la mauvaise raison.
  ok(/onClick=\{toucherLeMicro\}/.test(code),
     'et c\'est bien LE BOUTON MICRO qui passe par elle');
  ok(/sortieVisible\(/.test(code), 'et lui demande aussi s\'il doit montrer une sortie');
  ok(!/\{\(isDone \|\| isError\) && \(/.test(code),
     'la sortie n\'est plus réservée à deux états sur sept');
}

console.log('\n[6] VOICE-01 — `useVoiceCore.ts` N\'A PAS ÉTÉ TOUCHÉ');
{
  const hook = readFileSync(
    new URL('../hooks/useVoiceCore.ts', import.meta.url), 'utf-8');
  ok(!/gesteDuMicro|sortieVisible/.test(hook),
     'la règle n\'est pas entrée dans le fichier figé');
  ok(/const handleMicClick = useCallback\(\(\) => \{/.test(hook),
     '`handleMicClick` est intact — l\'écran décide AVANT de l\'appeler');
}

console.log(echecs === 0
  ? '\n✅ Sept états, sept réponses, et jamais d\'écran mort.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
