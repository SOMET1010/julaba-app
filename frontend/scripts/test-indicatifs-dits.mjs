/**
 * GARDE : LES INDICATIFS DE L'AUTH SE DISENT — DÉCISION PATRICK, 26/10/2026.
 *
 * « Retire cet indicatif "Ce n'est pas le bon code. Attention : encore 2
 * essais, après il faudra attendre." mais plutôt ajoute-le comme clip, fais
 * pareil pour les autres indicatifs, fais des clips. »
 *
 * LE DÉFAUT QU'ON EMPÊCHE DE REVENIR. Les écrans d'authentification
 * écrivaient des messages d'état À LA MAIN : phrases interpolées (le compte
 * d'essais restants, la durée du verrou), constats de dictée avec émoji.
 * Aucun clip ne portait ces mots : l'effet `error → parle(error)` les
 * refusait (direEntreeTexte ne joue que l'enregistré), la voix disait AUTRE
 * CHOSE que la bannière — et pour quelqu'un qui ne lit pas, un indicatif
 * écrit mais jamais enregistré n'existe pas.
 *
 * LA RÈGLE, EN CLAIR : tout littéral de chaîne passé à `setError(...)` dans
 * les écrans d'authentification doit se retrouver MOT POUR MOT (normalisation
 * accents/ponctuation comprise) dans le catalogue vocal — `entreeVoix.ts`
 * (`texte:`) ou `tataUiClips.ts` (`text:`). Un gabarit `${...}` passé à
 * `setError` est un échec immédiat : une phrase dynamique n'existe nulle
 * part en voix, elle ne sera jamais qu'une copie muette. Les arguments qui
 * citent le catalogue directement (`ENTREE_VOICE_CLIPS.x.texte`) ou par une
 * constante du composant ne portent aucun littéral : ils passent par
 * construction — c'est le branchement voulu.
 *
 * Le périmètre est fermé et volontaire : les écrans d'entrée (avant
 * connexion), où chaque message d'état est une promesse de voix.
 *
 * Lancer : npm run test:indicatifs-dits
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const AUTH = join(ICI, '..', 'src', 'app', 'components', 'auth');
const ENTREE = join(ICI, '..', 'src', 'app', 'services', 'entreeVoix.ts');
const TATA = join(ICI, '..', 'src', 'app', 'services', 'tataUiClips.ts');

/** Même normalisation que tataUiClips.normalizeForClip : comparaison auditive. */
const normaliser = (s) => (s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9 ]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/** Le catalogue vocal, réuni : entreeVoix (texte:) + tataUiClips (text:). */
function lireCatalogue() {
  const catalogue = new Set();
  const entree = readFileSync(ENTREE, 'utf8');
  for (const m of entree.matchAll(/texte:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)) {
    const brut = m[1] ?? m[2];
    catalogue.add(normaliser(brut.replace(/\\'/g, "'").replace(/\\"/g, '"')));
  }
  const tata = readFileSync(TATA, 'utf8');
  for (const m of tata.matchAll(/text:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)) {
    const brut = m[1] ?? m[2];
    catalogue.add(normaliser(brut.replace(/\\'/g, "'").replace(/\\"/g, '"')));
  }
  return catalogue;
}

/** Extrait l'argument complet de chaque setError( ... ) (parenthèses équilibrées). */
function extraireSetError(src) {
  const sorties = [];
  const re = /setError\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    let profondeur = 1;
    let i = m.index + m[0].length;
    for (; i < src.length && profondeur > 0; i++) {
      const c = src[i];
      if (c === '(') profondeur++;
      else if (c === ')') profondeur--;
      else if (c === "'" || c === '"' || c === '`') {
        // sauter le littéral pour ne pas compter ses parenthèses
        const guillemet = c;
        i++;
        while (i < src.length && src[i] !== guillemet) {
          if (src[i] === '\\') i++;
          i++;
        }
      }
    }
    sorties.push({ arg: src.slice(m.index + m[0].length, i - 1), index: m.index });
  }
  return sorties;
}

/** Littéraux de chaîne ('...' ou "...") dans un fragment de code. */
function litteraux(fragment) {
  const sorties = [];
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g;
  let m;
  while ((m = re.exec(fragment)) !== null) {
    const brut = m[1] ?? m[2];
    sorties.push(brut.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, ' '));
  }
  return sorties;
}

const catalogue = lireCatalogue();
const ecrans = readdirSync(AUTH).filter((f) => f.endsWith('.tsx'));

let echecs = 0;
const verifier = (ok, quoi, pourquoi) => {
  if (ok) { console.log(`  ✓ ${quoi}`); return; }
  echecs++;
  console.log(`  ✗ ${quoi}`);
  if (pourquoi) console.log(`      ${pourquoi}`);
};

console.log('\nLes indicatifs de l’auth se disent : chaque setError est un clip enregistré');

verifier(catalogue.size > 100, `catalogue vocal lisible (${catalogue.size} textes)`,
  'un catalogue vide rendrait la garde muette — vérifier entreeVoix.ts / tataUiClips.ts.');

for (const ecran of ecrans) {
  const src = readFileSync(join(AUTH, ecran), 'utf8');
  const appels = extraireSetError(src);
  if (appels.length === 0) continue;
  for (const { arg, index } of appels) {
    const ligne = src.slice(0, index).split('\n').length;
    const ou = `${ecran}:${ligne}`;

    if (/^\s*''\s*$/.test(arg) || /^\s*""\s*$/.test(arg)) continue; // effacement

    // Les gabarits dynamiques ne seront JAMAIS des clips : refus immédiat.
    if (arg.includes('${')) {
      verifier(false, `${ou} — setError reçoit une phrase interpolée`,
        `« ${arg.trim().slice(0, 90)}… » : un gabarit n'existe nulle part en voix.`
        + ' Crée un clip par éventualité exacte (clips 72-77) et cite-le.');
      continue;
    }

    const textes = litteraux(arg);
    if (textes.length === 0) continue; // clé de catalogue ou constante du composant

    for (const t of textes) {
      const cle = normaliser(t);
      verifier(catalogue.has(cle), `${ou} — « ${t.slice(0, 60)}${t.length > 60 ? '…' : ''} » est enregistré`,
        `ce littéral n'est dans AUCUN clip (entreeVoix.ts / tataUiClips.ts).`
        + ` Génère le clip (edge-tts Denise → login-NN.mp3), enregistre-le, et passe par la clé.`);
    }
  }
}

if (echecs > 0) {
  console.log('\n✗ indicatifs de l’auth — échec');
  process.exit(1);
}
console.log('\n✓ indicatifs de l’auth — tout ce qui s’affiche s’entend (décision Patrick, 26/10)');
