/**
 * TOUT CLIP EMBARQUÉ EST JOUABLE, TOUT CLIP DÉCLARÉ EXISTE — CLIP-01.
 * Lancer : npm run test:clips-embarques
 *
 * CE QUI A ÉTÉ TROUVÉ, 25/09/2026. L'agent de contrôle signale qu'en test V8,
 * aucune phrase n'a joué de clip. En mesurant plutôt qu'en supposant : le
 * mécanisme d'appariement n'est PAS cassé — 119 des 180 phrases fixes dites par
 * le code trouvent bien leur clip. Mais deux choses sont vraies quand même.
 *
 * 1. NEUF FICHIERS EMBARQUÉS QUE RIEN NE PEUT JOUER. `public/voix/tata/`
 *    contient 137 mp3 ; `TATA_UI_CLIPS` en déclare 128. Les neuf autres
 *    (ui-037, 041, 059, 062, 085, 086, 096, 105, 108) ne sont nommés nulle
 *    part — ni ici, ni dans `tataVoice.ts`. Ils sont pourtant PRÉ-CACHÉS par le
 *    service worker (vite.config.ts balaie le dossier, pas la table) et
 *    embarqués dans l'APK. Environ 230 ko de voix qu'aucune marchande
 *    n'entendra jamais.
 *
 *    Le commit d'origine s'appelle « Tata Nanti Lou parle 128 messages » : la
 *    table n'a jamais eu ces neuf-là. L'écart vient de la livraison, pas d'une
 *    régression. Mais il n'était écrit nulle part — on répétait « 137 clips ».
 *
 * 2. DEUX COMPTES POUR UNE MÊME CHOSE. « Combien de clips a-t-on ? » avait deux
 *    réponses selon qu'on comptait les fichiers ou les entrées. C'est la même
 *    faute que partout ailleurs : ne jamais donner deux sens à la même donnée.
 *
 * CE QUE CETTE GARDE NE FAIT PAS. Elle ne dit pas si un clip SONNE juste, ni si
 * son texte correspond à ce qu'on y entend — ça s'écoute, ça ne se teste pas.
 * Elle tient seulement les deux bouts : rien d'embarqué qui soit injouable,
 * rien de déclaré qui soit absent.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = join(ici, '..', '..', '..');              // frontend_src
const dossier = join(racine, 'public', 'voix', 'tata');

let failures = 0;
const ok = (cond: boolean, label: string, detail = '') => {
  if (cond) console.log('  ✅', label);
  else { console.log('  ❌', label, detail ? `\n     ${detail}` : ''); failures++; }
};

const srcUi = readFileSync(join(ici, 'tataUiClips.ts'), 'utf8');
const srcVoice = existsSync(join(ici, 'tataVoice.ts'))
  ? readFileSync(join(ici, 'tataVoice.ts'), 'utf8') : '';

const declares = [...srcUi.matchAll(/file:\s*"([^"]+)"/g)].map((m) => m[1]);
const surDisque = readdirSync(dossier).filter((f) => f.endsWith('.mp3')).sort();

console.log('\n[1] tout clip DÉCLARÉ existe sur le disque');
const absents = declares.filter((f) => !existsSync(join(racine, 'public', f)));
ok(absents.length === 0,
   `${declares.length} clips déclarés, tous présents`,
   absents.slice(0, 8).join(', '));

console.log('\n[2] tout fichier EMBARQUÉ est déclaré quelque part');
const nommeQuelquePart = (f: string) => srcUi.includes(f) || srcVoice.includes(f);
const orphelins = surDisque.filter((f) => !nommeQuelquePart(f));
// CLIQUET. Neuf orphelins connus au 25/09/2026, hérités de la livraison
// d'origine. Le compte ne doit pas MONTER : un dixième serait un clip qu'on
// vient d'embarquer sans le brancher — c'est-à-dire un enregistrement payé et
// jamais entendu. Le faire baisser demande une écoute, pas un test.
const PLAFOND_ORPHELINS = 8;
ok(orphelins.length <= PLAFOND_ORPHELINS,
   `${orphelins.length} fichier(s) embarqué(s) sans déclaration (plafond : ${PLAFOND_ORPHELINS})`,
   orphelins.length > PLAFOND_ORPHELINS
     ? `nouveaux : ${orphelins.slice(PLAFOND_ORPHELINS).join(', ')} — déclare-les dans TATA_UI_CLIPS ou retire les fichiers`
     : '');

console.log('\n[3] le compte annoncé est le compte JOUABLE, pas le compte de fichiers');
ok(declares.length === new Set(declares).size,
   `aucun fichier déclaré deux fois (${declares.length} entrées)`);
console.log(`  · sur le disque : ${surDisque.length} fichiers`);
console.log(`  · jouables      : ${declares.length}`);
console.log(`  · injouables    : ${orphelins.length}`);

console.log('\n[4] deux textes différents ne pointent pas le même clip');
const parFichier = new Map<string, number>();
for (const f of declares) parFichier.set(f, (parFichier.get(f) ?? 0) + 1);
const doubles = [...parFichier].filter(([, n]) => n > 1);
ok(doubles.length === 0, 'chaque clip sert au plus un texte',
   doubles.map(([f, n]) => `${f} ×${n}`).join(', '));

console.log(failures === 0
  ? '\nLes clips embarqués et les clips jouables se rejoignent ✅\n'
  : `\n${failures} échec(s).\n`);
process.exit(failures === 0 ? 0 : 1);
