/**
 * LE PERSONNAGE N'A QU'UN SEUL NOM — NOM-01.
 * Lancer : npm run test:nom-personnage
 *
 * LA DÉCISION. Patrick a tranché le 20/09/2026 : « Tantie Nanti Lou ».
 * `services/loginVoiceScript.ts` l'écrit noir sur blanc — « Il remplace
 * "Tata Nanti Lou", qui ne doit plus apparaître à l'écran ni dans une phrase
 * dite. » Quatre entrées du catalogue ne l'avaient pas appliquée, dont AUTH_01
 * et INTRO_ACCUEIL : les deux toutes premières phrases qu'une marchande entend.
 *
 * POURQUOI UNE GARDE, ET PAS SEULEMENT UNE CORRECTION. Un clip n'est pas choisi
 * par son nom de fichier. `tataUiClips.normalizeForClip` compare le TEXTE, en
 * minuscules et sans accents — et « tata » n'y est pas « tantie ». Un clip
 * enregistré sur l'une des deux formes ne serait JAMAIS joué pour l'autre :
 * pas d'erreur, pas de trace, juste la voix de synthèse à la place de la vraie
 * voix. C'est le genre de panne que personne ne signale parce que personne ne
 * la voit.
 *
 * Le coût de la remettre est réel : 92 clips à réenregistrer en studio.
 *
 * CE QUE CETTE GARDE NE COUVRE PAS, VOLONTAIREMENT. Les COMMENTAIRES du code
 * parlent encore de « Tata Nanti Lou » — ils racontent l'histoire du dépôt et
 * doivent pouvoir la raconter. On ne vise que ce qui est DIT ou AFFICHÉ.
 *
 * Et `AKWABA_ACCUEIL` porte un écart assumé, écrit dans le catalogue : son
 * texte dit « Tantie » pendant que le clip enregistré dit encore « Tata »
 * (RÉENREGISTREMENT REQUIS). On ne réaligne pas un texte sur un son périmé.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = join(ici, '..', '..');           // src/app

let failures = 0;
const ok = (condition: boolean, label: string, detail = '') => {
  if (condition) console.log('  ✅', label);
  else { console.log('  ❌', label, detail ? `\n     ${detail}` : ''); failures++; }
};

/** Retire commentaires de ligne et de bloc — on ne juge que le texte servi. */
function sansCommentaires(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1'))
    .join('\n');
}

const INTERDIT = /Tata\s+Nanti\s+Lou/i;

const FICHIERS = [
  'i18n/voice/catalog.ts',
  'services/loginVoiceScript.ts',
  'services/onboardingVoix.ts',
  'services/accueilMarchandVoix.ts',
  'services/tataUiClips.ts',
  'components/auth/PropositionReconnaissance.tsx',
  'components/auth/Welcome.tsx',
];

console.log('\n[1] aucun texte DIT ou AFFICHÉ ne dit encore « Tata Nanti Lou »');
for (const rel of FICHIERS) {
  let src: string;
  try { src = readFileSync(join(racine, rel), 'utf8'); }
  catch { console.log('  ·', rel, '— absent, ignoré'); continue; }
  const corps = sansCommentaires(src);
  const fautes = corps.split('\n')
    .map((l, i) => ({ n: i + 1, l }))
    .filter(({ l }) => INTERDIT.test(l));
  ok(fautes.length === 0, rel,
     fautes.map((f) => `ligne ${f.n} : ${f.l.trim().slice(0, 110)}`).join('\n     '));
}

console.log('\n[2] le nom validé, lui, est bien là où il doit être');
const script = readFileSync(join(racine, 'services/loginVoiceScript.ts'), 'utf8');
ok(/Tantie\s+Nanti\s+Lou/.test(script),
   'loginVoiceScript.ts nomme « Tantie Nanti Lou »');

const catalogue = readFileSync(join(racine, 'i18n/voice/catalog.ts'), 'utf8');
ok(/Tantie\s+Nanti\s+Lou/.test(catalogue),
   'le catalogue aussi');

console.log('\n[3] AUTH_01 dit la MÊME chose dans le catalogue et dans sa source');
const texteDe = (src: string, motif: RegExp) => (src.match(motif) || [])[1] ?? null;
const auth01Script = texteDe(
  script,
  /id:\s*'AUTH_01'[^}]*?texteFr:\s*"([^"]+)"/,
);
const auth01Catalogue = texteDe(
  catalogue,
  /id:\s*'AUTH_01'[^}]*?frActuel:\s*'((?:[^'\\]|\\.)*)'/,
);
ok(auth01Script !== null, 'AUTH_01 trouvé dans loginVoiceScript.ts');
ok(auth01Catalogue !== null, 'AUTH_01 trouvé dans le catalogue');
if (auth01Script && auth01Catalogue) {
  const normalise = (s: string) =>
    s.replace(/\\'/g, "'").replace(/\s+/g, ' ').trim();
  ok(normalise(auth01Script) === normalise(auth01Catalogue),
     'les deux textes sont identiques — un identifiant, un seul sens',
     `script    : ${normalise(auth01Script)}\n     catalogue : ${normalise(auth01Catalogue)}`);
}

console.log('\n[4] « tata » et « tantie » ne sont PAS la même chaîne pour le code');
const normalizeForClip = (s: string) => (s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
ok(normalizeForClip('Tata Nanti Lou') !== normalizeForClip('Tantie Nanti Lou'),
   'la normalisation des clips ne les confond pas — d\'où le risque de clip muet');
ok(normalizeForClip('TANTIE NANTI LOU !') === normalizeForClip('Tantie Nanti Lou'),
   'mais casse, accents et ponctuation, eux, sont bien absorbés');

console.log(failures === 0
  ? '\nUn seul nom pour le personnage : « Tantie Nanti Lou » ✅\n'
  : `\n${failures} échec(s).\n`);
process.exit(failures === 0 ? 0 : 1);
