/**
 * L'UNITÉ QU'ELLE DIT POSE SON UNITÉ — VOIX-06, 26/10/2026.
 * Lancer : npm run test:unite-dite
 *
 * LE DÉFAUT QU'ON FERME. L'étape « {nom}, tu le vends comment ? » était la
 * SEULE question du parcours guidé qui n'écoutait pas : la réponse existait
 * en boutons écrits (« tas », « kg », « unité », « sac ») et en champ libre.
 * Pour une non-lectrice, entendre la question et devoir LIRE pour répondre,
 * c'est répondre au hasard. Mesuré au navigateur avant ce lot : dire « au
 * sac » ne servait strictement à rien.
 *
 * CE QUE CETTE GARDE TIENT :
 *  · sa VOIX écrit l'étiquette qu'elle aurait TOUCHÉE — au singulier près
 *    (« en sacs » pose « sac »), jamais une seconde orthographe ;
 *  · les synonymes rattachent vers l'écran (« kilo » → « kg » proposé), pas
 *    l'inverse — sinon deux vérités pour la même unité ;
 *  · SON mot du marché reste SON mot quand l'écran ne le propose pas (« au
 *    bol ») — le référentiel est une aide, jamais une porte (STK-25) ;
 *  · ce qui n'est ni proposé ni connu rend `null` — on relance, on n'invente
 *    pas une unité (STK-02 appliqué à l'unité) ;
 *  · l'écran porte bien l'oreille : BoutonDireUnite dans le parcours, micro
 *    ouvert tout seul (arbitrage VOX-03), dictée web + sherpa, refus DITS
 *    depuis le catalogue (STK-22), grille conservée.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { uniteDite } from './uniteDite.js';

const ici = dirname(fileURLToPath(import.meta.url));
const MARCHE = ['tas', 'kg', 'unité', 'sac'] as const;

let echecs = 0;
const ok = (c: boolean, quoi: string, detail = '') => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) { echecs++; if (detail) console.log(`     ${detail}`); }
};
const lit = (dit: string, proposees: readonly string[] = MARCHE) =>
  JSON.stringify(uniteDite(dit, proposees));

console.log('\nElle dit son unité, l\'écran écrit la même\n');

console.log('[1] LES ÉTIQUETTES PROPOSÉES — SA VOIX ÉCRIT CE QUE SON DOIGT AURAIT TOUCHÉ');
ok(lit('au sac') === '"sac"', '« au sac » → sac', lit('au sac'));
ok(lit('en sacs') === '"sac"', '« en sacs » → sac (singulier près)', lit('en sacs'));
ok(lit('tas') === '"tas"', '« tas » → tas — trois lettres, le « s » reste', lit('tas'));
ok(lit('aux tas') === '"tas"', '« aux tas » → tas', lit('aux tas'));
ok(lit('unite') === '"unité"', '« unite » (sans accent dicté) → unité', lit('unite'));

console.log('\n[2] LES SYNONYMES RATTACHENT VERS L\'ÉCRAN, JAMAIS L\'INVERSE');
ok(lit('au kilo') === '"kg"', '« au kilo » → kg, l\'étiquette du référentiel', lit('au kilo'));
ok(lit('kilos') === '"kg"', '« kilos » → kg', lit('kilos'));
ok(lit('au kilogramme') === '"kg"', '« au kilogramme » → kg', lit('au kilogramme'));
ok(uniteDite('kilo', ['kilo', 'tas']) === 'kilo', '« kilo » sans kg proposé reste kilo — SON mot');
ok(lit('à la pièce') === '"unité"', '« à la pièce » → unité, l\'étiquette du référentiel', lit('à la pièce'));
ok(uniteDite('pièce', ['pièce']) === 'pièce', '« pièce » proposé reste pièce');

console.log('\n[3] SON MOT DU MARCHÉ RESTE SON MOT — STK-25 AUX UNITÉS');
ok(uniteDite('au bol', MARCHE) === 'bol', '« au bol » → bol, même si le bol n\'est pas proposé');
ok(uniteDite('au plateau', MARCHE) === 'plateau', '« au plateau » → plateau');
ok(uniteDite('à la botte', MARCHE) === 'botte', '« à la botte » → botte (mot du marché)');
ok(uniteDite('au morceau', MARCHE) === 'morceau', '« au morceau » → morceau');
ok(uniteDite('des morceaux', MARCHE) === 'morceau', '« des morceaux » → morceau (x pluriel)');
ok(uniteDite('en bouteilles', MARCHE) === 'bouteille', '« en bouteilles » → bouteille');
// SES unités à elle passent devant : ce qu'elle vend avec, l'écran le propose.
ok(uniteDite('au grand sac', ['grand sac', 'tas']) === 'grand sac',
   '« au grand sac » avec « grand sac » proposé → l\'étiquette entière');

console.log('\n[4] CE QUI N\'EST NI PROPOSÉ NI CONNU : NULL — ON RELANCE, ON N\'INVENTE PAS');
ok(uniteDite('euh je sais pas trop', MARCHE) === null, '« euh je sais pas trop » → null');
ok(uniteDite('en vrac', MARCHE) === null, '« en vrac » → null (pas un mot d\'unité reconnu)');
ok(uniteDite('', MARCHE) === null, 'rien dit → null');
ok(uniteDite('au de', MARCHE) === null, '« au de » → null (« de » est une liaison, pas une unité)');

console.log('\n[5] L\'ÉCRAN PORTE L\'OREILLE — CÂBLAGE DU PARCOURS');
{
  const lire = (f: string) => readFileSync(join(ici, '..', 'components', 'marchand', f), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

  const guide = lire('AjoutProduitGuide.tsx');
  ok(/<BoutonDireUnite[\s/>]/.test(guide), 'AjoutProduitGuide : l\'étape de l\'unité peut être DITE');
  ok(/<BoutonDireUnite[^>]*\souvrirToutSeul[\s/>]/.test(guide),
     'et le micro s\'ouvre tout seul (même arbitrage que le prix, VOX-03)');
  ok(/TATA_UNITE_CHOISIE/.test(guide), 'l\'unité dite est RELITE — elle entend ce qui a été écrit');
  // LA GRILLE RESTE — la voix est le geste par défaut, pas le seul.
  ok(/unitesProposees\(sesUnites\)\.map/.test(guide), 'la grille de boutons reste disponible, en second');
  ok(/setUniteLibre\(true\)/.test(guide) && /Autre/.test(guide), 'et « Autre » reste — SON mot hors de tout lexique');

  const bouton = lire('BoutonDireUnite.tsx');
  ok(/uniteDite\(/.test(bouton), 'le micro lit l\'unité par la règle, pas à sa façon');
  ok(!/parseInt|parseFloat|Number\(/.test(bouton), 'et personne ne relit une unité à côté de la règle');
  ok(/demarrerRecoWeb\(/.test(bouton) && /recoWebDispo\(\)/.test(bouton),
     'dictée web branchée — le web écoute comme le nom et le prix');
  ok(/startLiveDictation\(/.test(bouton), 'sherpa reste le chemin de l\'APK');
  ok(/CONTRAINTES_MICRO_DICTEE/.test(bouton), 'anti-écho MIC-01 — les mêmes contraintes que tous les micros');
  ok(/DIRE_CLE\('STOCK_066', dire\)/.test(bouton), 'le silence est relancé à la voix (STOCK_066)');
  ok(/code === 'micro' \? 'STOCK_067' : 'STOCK_068'/.test(bouton), 'les pannes se disent (STOCK_067/068) — STK-22');
  ok(/resoudreMessage\('STOCK_067'\)/.test(bouton), 'l\'affichage de la panne sort de la même clé que la voix');
  ok(/cheminRef\.current === 'sherpa' && !aEntenduRef\.current/.test(bouton),
     'la relance du minuteur ne parle que si rien n\'a été compris');
  ok(!/Touche comment tu le vends/.test(bouton), 'plus aucune phrase en dur — tout passe par le catalogue');
}

console.log('\n[6] UNE SEULE NORMALISATION — LA MÊME QUE LA DICTÉE DE VENTE');
{
  const lecteur = readFileSync(join(ici, 'uniteDite.ts'), 'utf-8');
  ok(/from '\.\.\/voice-offline\/extraction'/.test(lecteur),
     'uniteDite réutilise `normalise` d\'extraction — une apostrophe U+2019 pliée une seule fois');
  // Le même mot doit passer dictée de vente ET unité : « un tas de piment »
  // a son « tas » lu des deux côtés sans divergence.
  ok(uniteDite('un tas de piment', MARCHE) === 'tas',
     '« un tas de piment » → tas — le même mot que la caisse lit');
}

console.log(echecs === 0
  ? '\n✅ Elle dit comment elle le vend, et l\'écran écrit la même chose.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
