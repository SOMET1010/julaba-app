/**
 * Garde-fou : l'écran de connexion ne doit PLUS tenir son propre verrou,
 * et CE QUE LE VERROU DIT DOIT ÊTRE ENTENDU (AUTH-03).
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
 *
 * LA TROISIÈME RÈGLE, AJOUTÉE PAR LE LOT AUTH-03 (05/10/2026) :
 *   3. ce qui part à `parle()` doit référencer un CLIP EXISTANT. La garde
 *      d'origine comptait des `parle(message)` : la phrase interpolée
 *      (« Attends 5 minutes… ») passait la garde et restait MUETTE, car
 *      `direEntreeTexte` ne joue qu'une phrase enregistrée. La garde vérifie
 *      désormais que les appels de parole du verrou citent une clé de
 *      `services/entreeVoix.ts` — et que le fichier audio existe vraiment.
 */
import { readFileSync, existsSync } from 'node:fs';
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

console.log('\nL’écran de connexion ne rejuge plus le verrou, et le verrou SE DIT');

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

// ── AUTH-03 : audibilité, pas juste présence ───────────────────────────────

verifier(
  'la phrase interpolée n’est plus envoyée à la voix',
  !/parle\(message\)/.test(code),
  '`parle(message)` = texte dynamique sans clip = marchande muette.',
);

// Assertion d'origine (avant AUTH-03), RESTAURÉE : GARDE-ARGENT interdit d'en
// retirer une. Elle reste vraie et utile — au moins deux prises de parole
// dans le flux du verrou ; la garde PAR CLIP ci-dessous dit en plus lesquelles.
verifier(
  'ce qui est affiché est aussi DIT',
  (code.match(/parle\(/g) || []).length >= 2,
  'les deux cas comptent : l’attente ET l’avertissement.',
);

verifier(
  'les deux cas (attente + avertissement) sont dits PAR CLIP',
  (code.match(/parle\(\s*[^)]*ENTREE_VOICE_CLIPS\./g) || []).length >= 2,
  'ce qui est dit doit référencer une clé de services/entreeVoix.ts (AUTH-03).',
);

// Chaque clé citée dans le flux verrou existe, avec un fichier audio embarqué.
// Deux formes de `file:` cohabitent : littéral '/voix/...' ou gabarit
// `${BASE}/...` (BASE = '/voix/fr-CI/prototype' — les 6 clips prototype).
const entree = readFileSync(
  join(ICI, '..', 'src', 'app', 'services', 'entreeVoix.ts'),
  'utf8',
);
const mBase = entree.match(/const BASE\s*=\s*'([^']+)'/);
const BASE = mBase ? mBase[1] : '';
const CLES = ['verrouCinqMinutes', 'dernierEssai', 'mauvaisCodeAttention', 'tropDEssais', 'codeErreur'];
for (const cle of CLES) {
  // Fin de bloc = `\n  }` (indentation des entrées), pas le PREMIER `}` :
  // les clips prototype écrivent `file: \`${BASE}/...\`` et ce `}` de
  // `${BASE}` tronquerait une capture non-greedy.
  const bloc = entree.match(new RegExp(`\\b${cle}\\s*:\\s*\\{[\\s\\S]*?\\n  \\}`));
  const mFile = bloc && bloc[0].match(/file:\s*('([^']+)'|`([^`]+)`)/);
  verifier(`clip « ${cle} » déclaré dans entreeVoix.ts avec un fichier`, !!mFile);
  if (mFile) {
    const brut = mFile[2] ?? mFile[3];
    const fichierRel = brut.replace('${BASE}', BASE);
    const fichier = join(ICI, '..', 'public', fichierRel);
    verifier(`fichier audio ${fichierRel} embarqué dans public/`, existsSync(fichier),
      'un clip déclaré mais absent du disque, c’est un silence qui se croit parlé.');
  }
}

if (echecs > 0) {
  console.log('\n✗ verrou de connexion — échec');
  process.exit(1);
}
console.log('\n✓ verrou de connexion — le serveur décide, l’écran dit ET SE FAIT ENTENDRE');
