/**
 * LE PARCOURS GUIDÉ POSE SES QUESTIONS À VOIX HAUTE — STK-23.
 * Lancer : npm run test:parcours-guide-parle
 *
 * LE DÉFAUT QU'ON FERME. Le parcours d'ajout au stock pose trois questions —
 * « Qu'est-ce que tu vends ? », « {nom}, tu le vends comment ? », « Le
 * {unite}, à combien ? ». Les trois étaient ÉCRITES, aucune n'était DITE.
 *
 * L'écran n'émettait que des ACCUSÉS de réception : l'unité choisie, le
 * montant tapé, le produit posé. Une marchande qui ne lit pas entendait donc
 * uniquement qu'on avait pris note de ce qu'elle venait de faire — jamais ce
 * qu'on attendait d'elle. Elle savait qu'on l'écoutait, pas quoi dire.
 *
 * Retour terrain du 26/09, sur Render : « elle ne parle pas à toutes les
 * étapes ». Mesuré étape par étape : trois sur trois muettes.
 *
 * CE QUE CETTE GARDE TIENT :
 *  · chaque étape déclenche SA question, et une seule ;
 *  · le texte dit est EXACTEMENT le texte affiché — jamais deux sens pour la
 *    même donnée ; un mot d'écart et l'oreille reçoit autre chose que l'œil ;
 *  · la question passe par `direMessage`, donc par `rendreMessage`, donc par
 *    la forme PARLÉE (leçon du 24/09 : `.texte` faisait épeler « 2 zéro zéro
 *    zéro ») ;
 *  · la question de l'argent reste marquée `critiqueArgent`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ici = dirname(fileURLToPath(import.meta.url));
const app = join(ici, '..', '..');

const brut = readFileSync(join(ici, 'AjoutProduitGuide.tsx'), 'utf8');
const catalogue = readFileSync(join(app, 'i18n/voice/catalog.ts'), 'utf8');

/** On juge le CODE, pas ce qu'on en raconte : le commentaire qui explique le
 *  défaut cite les phrases, et passerait sinon pour un branchement. */
const src = brut
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');

let failures = 0;
const ok = (c: boolean, label: string, detail = '') => {
  if (c) console.log('  ✅', label);
  else { console.log('  ❌', label, detail ? `\n     ${detail}` : ''); failures++; }
};

/** Le `frActuel` d'une entrée du catalogue, apostrophes déséchappées. */
const frActuel = (id: string) => {
  const m = new RegExp(`id: '${id}'[^}]*?frActuel: '((?:[^'\\\\]|\\\\.)*)'`).exec(catalogue);
  return m ? m[1].replace(/\\'/g, "'") : null;
};

const ETAPES = [
  { etape: 'nom',   id: 'STOCK_047', vars: '',                affiche: "Qu'est-ce que tu vends ?" },
  { etape: 'unite', id: 'STOCK_048', vars: ", { nom }",       affiche: '{nom}, tu le vends comment ?' },
  { etape: 'prix',  id: 'STOCK_049', vars: ", { unite }",     affiche: 'Le {unite}, à combien ?' },
] as const;

console.log('\n[1] les trois questions existent au catalogue');
for (const e of ETAPES) {
  ok(frActuel(e.id) !== null, `${e.id} est déclarée`);
}

console.log('\n[2] chaque étape DIT sa question');
for (const e of ETAPES) {
  const motif = new RegExp(`etapeVue === '${e.etape}'\\)?\\s*direMessage\\('${e.id}'`);
  ok(motif.test(src.replace(/\s+/g, ' ')),
     `étape « ${e.etape} » → direMessage('${e.id}')`,
     'sans ça l\'étape s\'affiche et se tait : elle ne saura pas quoi dire');
}

console.log('\n[3] le texte DIT est le texte AFFICHÉ, au mot près');
// La question affichée porte les valeurs réelles (`{nom}` dans le JSX, `{unite}`
// dans le texte) ; le catalogue porte les mêmes variables. On compare les deux
// formes une fois les accolades JSX ramenées à la notation du catalogue.
for (const e of ETAPES) {
  const cat = frActuel(e.id);
  ok(cat === e.affiche, `${e.id} : « ${e.affiche} »`, `catalogue : « ${cat} »`);
  // Le JSX écrit ses interpolations `{nom}` / `{unite}` avec les mêmes noms
  // que le catalogue : la comparaison est directe, sans traduction.
  ok(brut.includes(e.affiche),
     `${e.id} : l'écran affiche ce texte exact`,
     'deux formulations du même moment, et l\'oreille reçoit autre chose que l\'œil');
}

console.log('\n[4] on passe par le RENDU, pas par la forme écran');
// `direMessage` appelle `rendreMessage`, qui choisit la forme PARLÉE. Le
// raccourci `dire(resoudreMessage(id).texte)` faisait épeler les montants.
ok(/const direMessage = /.test(src), '`direMessage` existe');
ok(/rendreMessage\(m, dire\)/.test(src), '`direMessage` passe par `rendreMessage`');
for (const e of ETAPES) {
  ok(!new RegExp(`dire\\([^)]*${e.id}`).test(src),
     `${e.id} n'est pas envoyée à \`dire\` en contournant le rendu`);
}

console.log('\n[5] la question n\'est pas redite à chaque frappe');
// L'effet ne dépend que de l'ÉTAPE. Ajouter `nom` ou `unite` aux dépendances
// relancerait la question à chaque lettre tapée : inaudible et épuisant.
{
  const dep = /\}, \[([^\]]*)\]\);/.exec(
    src.slice(src.indexOf("etapeVue === 'nom'")));
  ok(!!dep && dep[1].trim() === 'etapeVue',
     'l\'effet ne dépend que de `etapeVue`',
     `dépendances : [${dep?.[1]}]`);
}

console.log('\n[6] la question de l\'argent reste marquée « critique »');
ok(/id: 'STOCK_049'[^}]*critiqueArgent: true/.test(catalogue),
   'STOCK_049 porte critiqueArgent: true',
   'c\'est la question du prix — elle relève du régime de l\'argent');
// Et elle REDIT l'unité : « à combien ? » seul est ambigu entre le tas et le kilo.
ok((frActuel('STOCK_049') || '').includes('{unite}'),
   'STOCK_049 nomme l\'unité',
   '« à combien ? » sans l\'unité laisse le prix du tas passer pour celui du kilo');

console.log(failures === 0
  ? '\nLes trois questions du parcours guidé se disent ✅\n'
  : `\n${failures} échec(s).\n`);
process.exit(failures === 0 ? 0 : 1);
