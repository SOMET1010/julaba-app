/**
 * Garde-fou : l'écran de connexion ne doit PLUS tenir son propre verrou.
 *
 * LE DÉFAUT QU'ON EMPÊCHE DE REVENIR. Cet écran portait une échelle de paliers
 * (3 → 5 min, 6 → 15 min, 9 → blocage total) dans un objet JavaScript en
 * mémoire. Son propre commentaire l'avouait : « cosmétique pour l'instant ».
 * Elle s'évaporait au moindre rechargement.
 *
 * Pendant ce temps le serveur, lui, n'avait aucun palier : 9 échecs, puis un
 * verrou de 100 ans levable seulement par un identificateur de la même zone.
 * L'intention douce était décorative ; la règle brutale était réelle. Une
 * marchande qui hésite sur son code perdait sa caisse pour de bon.
 *
 * Deux règles, donc, et elles vont ensemble :
 *   1. plus aucun compteur d'essais ici — le serveur est seul juge ;
 *   2. ce que le serveur répond doit être DIT À LA VOIX, pas seulement écrit.
 *      Un « compte bloqué » muet, pour quelqu'un qui ne lit pas, c'est une
 *      caisse qui disparaît sans explication.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  join(ICI, '..', 'src', 'app', 'components', 'auth', 'LoginPassword.tsx'),
  'utf8',
);

let echecs = 0;
const verifier = (quoi, ok, pourquoi) => {
  if (ok) { console.log(`  ✓ ${quoi}`); return; }
  echecs++;
  console.log(`  ✗ ${quoi}`);
  if (pourquoi) console.log(`      ${pourquoi}`);
};

console.log('\nL’écran de connexion ne rejuge plus le verrou');

// On cherche du CODE, pas les commentaires qui racontent l'incident.
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  .join('\n');

verifier(
  'plus de compteur d’essais en mémoire',
  !/loginAttempts/.test(code),
  'un compteur local ment dès le premier rechargement — c’était tout le défaut.',
);

verifier(
  'plus d’échelle de paliers dupliquée ici',
  !/dureeBlocagePalier|PALIER_1|PALIER_2|PALIER_3/.test(code),
  'une seule échelle, côté serveur : deux règles finissent toujours par diverger.',
);

verifier(
  'l’attente affichée vient du SERVEUR',
  /result\.attenteMs/.test(code),
  'sans la durée renvoyée, on ne peut pas dire QUAND réessayer.',
);

verifier(
  'l’avertissement avant palier vient du SERVEUR',
  /result\.essaisRestants/.test(code),
  'c’est lui qui évite le blocage : rien ne prévenait avant.',
);

verifier(
  'ce qui est affiché est aussi DIT',
  (code.match(/parle\(message\)/g) || []).length >= 2,
  'les deux cas comptent : l’attente ET l’avertissement.',
);

if (echecs > 0) {
  console.log('\n✗ verrou de connexion — échec');
  process.exit(1);
}
console.log('\n✓ verrou de connexion — le serveur décide, l’écran dit et parle');
