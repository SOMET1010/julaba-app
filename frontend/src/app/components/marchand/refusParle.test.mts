/**
 * LE REFUS D'AVANCER SE DIT — STK-24.
 * Lancer : npm run test:refus-parle
 *
 * LE DÉFAUT QU'ON FERME. Le grand bouton « C'est bon » du parcours d'ajout au
 * stock était `disabled` tant que l'étape n'était pas complète. Une marchande
 * qui ne lit pas appuie dessus : rien ne bouge, et rien ne le lui dit.
 *
 * Un bouton grisé est une information PUREMENT VISUELLE au milieu d'un
 * parcours conçu pour l'oreille. « Aucune information importante uniquement
 * en texte » vaut aussi pour la couleur d'un bouton.
 *
 * ET LE SILENCE ÉTAIT DANS LA STRUCTURE, pas dans un appel oublié : un bouton
 * `disabled` ne reçoit même pas le clic. Le code n'avait aucun endroit où
 * réagir. C'est pour ça que la correction change le bouton, pas seulement ce
 * qu'il fait.
 *
 * CE QUE CETTE GARDE TIENT :
 *  · la raison du refus est une RÈGLE (`cleDuRefus`), pas une phrase dans un
 *    écran : elle se teste sans navigateur et traverse les langues ;
 *  · les trois boutons du parcours reçoivent le clic — seul `enCours`
 *    verrouille encore, parce qu'un double-clic poserait deux fois ;
 *  · « rien tapé » et « une seule lettre » restent DEUX refus : l'un doit
 *    parler, l'autre doit continuer ;
 *  · chaque refus nomme le GESTE, pas seulement le défaut (leçon AUTH_12).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { raisonDuRefus, peutValider, produitPret, NOM_PRODUIT_MINIMUM }
  from '../../services/premierProduit.js';

const ici = dirname(fileURLToPath(import.meta.url));
const app = join(ici, '..', '..');

const brut = readFileSync(join(ici, 'AjoutProduitGuide.tsx'), 'utf8');
const catalogue = readFileSync(join(app, 'i18n/voice/catalog.ts'), 'utf8');

/** On juge le CODE, pas ce qu'on en raconte. */
const src = brut
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');

let failures = 0;
const ok = (c: boolean, label: string, detail = '') => {
  if (c) console.log('  ✅', label);
  else { console.log('  ❌', label, detail ? `\n     ${detail}` : ''); failures++; }
};

const frActuel = (id: string) => {
  const m = new RegExp(`id: '${id}'[^}]*?frActuel: '((?:[^'\\\\]|\\\\.)*)'`).exec(catalogue);
  return m ? m[1].replace(/\\'/g, "'") : null;
};

const vide = { nom: '', unite: '', prix: null };

console.log('\n[1] chaque refus a sa raison, et elle est nommée');
ok(raisonDuRefus('nom', vide) === 'nom-absent', 'nom vide → nom-absent',
   `obtenu : ${raisonDuRefus('nom', vide)}`);
ok(raisonDuRefus('nom', { ...vide, nom: 't' }) === 'nom-trop-court',
   'nom d\'une seule lettre → nom-trop-court',
   'confondu avec « rien tapé », on enverrait recommencer quelqu\'un qui avait presque fini');
ok(raisonDuRefus('unite', { ...vide, nom: 'tomate' }) === 'unite-absente', 'aucune unité → unite-absente');
ok(raisonDuRefus('prix', { nom: 'tomate', unite: 'tas', prix: null }) === 'prix-absent',
   'prix absent → prix-absent');
ok(raisonDuRefus('prix', { nom: 'tomate', unite: 'tas', prix: 0 }) === 'prix-absent',
   'prix à zéro → prix-absent (un zéro n\'est pas un prix)');

console.log('\n[1bis] la règle ne connaît AUCUN identifiant de voix');
// Premier jet : `raisonDuRefus` rendait la clé du catalogue. La garde i18n l'a
// refusé — un fichier qui porte des identifiants de messages sans appartenir à
// la couche i18n est ce qu'elle écarte, et elle avait raison. Ce module sait ce
// qui MANQUE ; comment on le dit ne le regarde pas.
{
  const service = readFileSync(join(app, 'services/premierProduit.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
  ok(!/'[A-Z][A-Z0-9_]{3,}'/.test(service),
     'premierProduit.ts ne cite aucune clé de catalogue',
     'la règle métier n\'a pas à savoir qu\'il existe un catalogue de voix');
}

console.log('\n[2] quand elle PEUT avancer, il n\'y a rien à dire');
for (const [etape, b] of [
  ['nom', { ...vide, nom: 'tomate' }],
  ['unite', { nom: 'tomate', unite: 'tas', prix: null }],
  ['prix', { nom: 'tomate', unite: 'tas', prix: 500 }],
] as const) {
  ok(raisonDuRefus(etape, b) === null, `${etape} complète → aucun refus`);
  ok(peutValider(etape, b), `  (et peutValider dit bien oui)`);
}

console.log('\n[3] les quatre refus existent au catalogue et nomment le GESTE');
for (const id of ['STOCK_050', 'STOCK_051', 'STOCK_052', 'STOCK_053']) {
  const t = frActuel(id);
  ok(t !== null, `${id} est déclarée`);
  // Un refus qui ne nomme que le défaut laisse deviner la suite : c'est ce qui
  // avait fait écarter AUTH_12 deux fois.
  ok(!!t && /\b(dis|tape|mets|choisis|touche|appuie)\b/i.test(t),
     `${id} dit ce qu'elle doit FAIRE`, `texte : « ${t} »`);
}

console.log('\n[4] deux refus du nom, deux phrases');
ok(frActuel('STOCK_050') !== frActuel('STOCK_051'),
   'STOCK_050 et STOCK_051 ne disent pas la même chose',
   'une seule phrase pour les deux, et « presque fini » s\'entend comme « recommence »');

console.log('\n[5] l\'écran DIT le refus au lieu de ne rien faire');
ok(/raisonDuRefus\(etapeVue, brouillon\)/.test(src),
   '`avancer` demande la raison du refus');
ok((src.match(/raisonDuRefus\(/g) || []).length >= 2,
   'et `poser` aussi — le bouton final refusait en silence lui aussi');
ok((src.match(/direMessage\(PHRASE_DU_REFUS\[refus\]\)/g) || []).length >= 2,
   'les deux la DISENT, par le rendu');

console.log('\n[5bis] aucune raison ne peut rester sans phrase');
// Le `Record<RaisonRefus, string>` le tient à la COMPILATION : ajouter une
// raison sans lui donner de phrase ne compile plus. C'est la seule façon qu'un
// refus ne redevienne pas muet par oubli — et c'est par un oubli qu'il l'était.
ok(/const PHRASE_DU_REFUS: Record<RaisonRefus, string>/.test(src),
   'la table est un Record exhaustif sur RaisonRefus',
   'un `Partial` ou un index signature laisserait repasser le silence');
for (const [raison, cle] of [['nom-absent', 'STOCK_050'], ['nom-trop-court', 'STOCK_051'],
                             ['unite-absente', 'STOCK_052'], ['prix-absent', 'STOCK_053']] as const) {
  ok(new RegExp(`'${raison}': '${cle}'`).test(src), `${raison} → ${cle}`);
}

console.log('\n[6] les boutons reçoivent le clic — sinon rien ne peut parler');
// `disabled` sur la complétude, et le clic n'atteint jamais le code : le
// silence serait de nouveau dans la structure, pas dans un appel oublié.
// `aria-disabled=` CONTIENT `disabled=` : sans l'ancre, la garde accusait
// la correction elle-même. Deuxième fois qu'une garde d'ici désigne le bon
// texte pour la mauvaise raison — on ancre.
ok(!/(?<![-\w])disabled=\{!peutAvancer\}/.test(src),
   'le bouton d\'étape n\'est plus désactivé sur la complétude');
ok(!/(?<![-\w])disabled=\{!aCreer/.test(src),
   'le bouton final non plus');
ok(/aria-disabled=\{!peutAvancer\}/.test(src) && /aria-disabled=\{!aCreer\}/.test(src),
   'mais ils restent annoncés désactivés au lecteur d\'écran');
// Le seul verrou qui reste est celui de l'argent.
ok(/(?<![-\w])disabled=\{enCours\}/.test(src),
   '`enCours` reste un verrou dur',
   'sur l\'argent, un double-clic poserait deux fois le même produit');
ok(/if \(enCours\) return;/.test(src), 'et `poser` le vérifie aussi');

console.log('\n[7] la règle des deux lettres vit aux DEUX portes');
// `peutValider` l'exigeait, `produitPret` non. Chemin non atteignable le jour
// où on l'a mesuré — mais deux portes, deux règles, c'est une porte qui attend
// un chemin.
ok(NOM_PRODUIT_MINIMUM === 2, 'le minimum est bien de deux lettres');
ok(!produitPret({ nom: 't', unite: 'tas', prix: 500 }),
   '`produitPret` refuse « t », comme `peutValider`',
   'sinon le serveur refuse au bout du parcours, après trois questions');
ok(produitPret({ nom: 'ka', unite: 'tas', prix: 500 }),
   'et « ka » passe — deux caractères suffisent pour un nom du marché');

console.log('\n[8] le refus du prix reste sous le régime de l\'argent');
ok(/id: 'STOCK_053'[^}]*critiqueArgent: true/.test(catalogue),
   'STOCK_053 porte critiqueArgent: true');

console.log(failures === 0
  ? '\nLe refus d\'avancer ne se fait plus en silence ✅\n'
  : `\n${failures} échec(s).\n`);
process.exit(failures === 0 ? 0 : 1);
