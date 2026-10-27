/**
 * LA QUANTITÉ QU'ELLE DIT POSE SON NOMBRE — VOIX-06, 26/10/2026.
 * Lancer : npm run test:quantite-dite
 *
 * LE DÉFAUT QU'ON FERME. « Tu en as combien ? Si tu ne sais pas, passe. »
 * (STOCK_054) était DITE et n'écoutait PAS : pavé de chiffres, bouton
 * « Je ne sais pas ». La phrase disait elle-même qu'on pouvait passer — et
 * rien n'écoutait le mot « passe ». Seconde étape du parcours (avec l'unité,
 * fermée le même jour) où la voix ne suffisait pas à une non-lectrice.
 *
 * CE QUE CETTE GARDE TIENT :
 *  · la grammaire est CELLE DE L'APPLICATION (`extraire`) — « dix », « deux
 *    mille », l'ellipse « mille cinq » : un seul parseur de nombres, jamais
 *    un second qui divergerait ;
 *  · SON ZÉRO EST UNE RÉPONSE (STK-04) — « zéro » pose zéro (« elle n'en a
 *    plus ») ; c'est « passer » qui laisse le stock inconnu ;
 *  · CE QUI PASSE est une liste ÉTROITE de phrases sans ambiguïté — « ça
 *    passe pas » ne passe PAS (le doute profite à la relance) ;
 *  · le doute rend `null` : on relance, on n'invente pas un stock ;
 *  · l'écran porte l'oreille : BoutonDireQuantite dans le parcours, micro
 *    ouvert tout seul, dictée web + sherpa, refus DITS (STK-22), le « passe »
 *    déclenche EXACTEMENT le geste du bouton « Je ne sais pas », le pavé et
 *    le ✓ restent.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { quantiteDite } from './quantiteDite.js';

const ici = dirname(fileURLToPath(import.meta.url));

let echecs = 0;
const ok = (c: boolean, quoi: string, detail = '') => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) { echecs++; if (detail) console.log(`     ${detail}`); }
};
const lit = (dit: string) => JSON.stringify(quantiteDite(dit));

console.log('\nElle dit combien elle en a, l\'écran pose son nombre\n');

console.log('[1] LES NOMBRES — LA GRAMMAIRE DE L\'APPLICATION, PAS UNE SECONDE');
ok(lit('dix') === '{"genre":"nombre","nombre":10}', '« dix » → 10', lit('dix'));
ok(lit('trois') === '{"genre":"nombre","nombre":3}', '« trois » → 3', lit('trois'));
ok(lit('deux mille') === '{"genre":"nombre","nombre":2000}', '« deux mille » → 2000', lit('deux mille'));
ok(lit('j\'en ai quinze') === '{"genre":"nombre","nombre":15}', '« j\'en ai quinze » → 15', lit('j\'en ai quinze'));
ok(lit('vingt-cinq sacs') === '{"genre":"nombre","nombre":25}', '« vingt-cinq sacs » → 25 (composé hyphéné, VOIX-06)', lit('vingt-cinq sacs'));
ok(lit('soixante-douze') === '{"genre":"nombre","nombre":72}', '« soixante-douze » → 72 — la famille déjà connue ne bouge pas', lit('soixante-douze'));
ok(lit('mille cinq') === '{"genre":"nombre","nombre":1500}', '« mille cinq » → 1500 (ellipse du marché)', lit('mille cinq'));
ok(lit('12') === '{"genre":"nombre","nombre":12}', '« 12 » (chiffres dictés) → 12', lit('12'));

console.log('\n[2] SON ZÉRO EST UNE RÉPONSE — STK-04');
ok(lit('zéro') === '{"genre":"nombre","nombre":0}', '« zéro » → 0 : elle n\'en a plus', lit('zéro'));
ok(lit('zero') === '{"genre":"nombre","nombre":0}', '« zero » (sans accent) → 0', lit('zero'));
// ET CE N'EST PAS UN « PASSE » : le stock vaut ZÉRO, pas inconnu.

console.log('\n[3] CE QUI PASSE — EXACTEMENT LE GESTE DU BOUTON « JE NE SAIS PAS »');
ok(lit('passe') === '{"genre":"passe"}', '« passe » → passe', lit('passe'));
ok(lit('je ne sais pas') === '{"genre":"passe"}', '« je ne sais pas » → passe', lit('je ne sais pas'));
ok(lit('ben je ne sais pas trop') === '{"genre":"passe"}', '« je ne sais pas trop » → passe (groupe sans ambiguïté)', lit('ben je ne sais pas trop'));
ok(lit('plus tard') === '{"genre":"passe"}', '« plus tard » → passe', lit('plus tard'));
ok(lit("j'en sais rien") === '{"genre":"passe"}', '« j\'en sais rien » → passe', lit("j'en sais rien"));
// LE DOUTE NE PASSE PAS : « ça passe pas » contient un refus, pas un abandon.
ok(quantiteDite('ça passe pas') === null, '« ça passe pas » → null : le doute profite à la relance', lit('ça passe pas'));

console.log('\n[4] CE QUI N\'EST NI NOMBRE NI PASSE : NULL — ON RELANCE, ON N\'INVENTE PAS');
ok(quantiteDite('euh ben attends') === null, '« euh ben attends » → null', lit('euh ben attends'));
ok(quantiteDite('') === null, 'rien dit → null');
ok(quantiteDite('le sac') === null, '« le sac » → null (pas de nombre dans la phrase)', lit('le sac'));

console.log('\n[5] L\'ÉCRAN PORTE L\'OREILLE — CÂBLAGE DU PARCOURS');
{
  const lire = (f: string) => readFileSync(join(ici, '..', 'components', 'marchand', f), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

  const guide = lire('AjoutProduitGuide.tsx');
  ok(/<BoutonDireQuantite[\s/>]/.test(guide), 'AjoutProduitGuide : l\'étape de la quantité peut être DITE');
  ok(/<BoutonDireQuantite[^>]*\souvrirToutSeul[\s/>]/.test(guide),
     'et le micro s\'ouvre tout seul (même arbitrage que le prix et l\'unité)');
  ok(/STOCK_072/.test(guide), 'le nombre dit est RELIT (STOCK_072) — elle entend ce qui a été écrit');
  // SON « PASSE » DÉCLENCHE EXACTEMENT LE GESTE DU BOUTON — même appel
  // `poser(null)` : stock INCONNU, jamais un zéro inventé à sa place.
  ok(/onPasse=\{\(\) => \{ void poser\(null\); \}\}/.test(guide),
     'le « passe » du micro = le geste du bouton « Je ne sais pas » (poser(null))');
  // LE PAVÉ ET LE BOUTON RESTENT — la voix est le geste par défaut, pas le
  // seul ; et le ✓ reste le geste qui enregistre (rien n'avance seul).
  ok(/<ClavierQuantite/.test(guide), 'le pavé reste disponible, en second');
  ok(/aria-label="Je ne sais pas combien j'en ai"/.test(guide), 'le bouton « Je ne sais pas » reste');

  const bouton = lire('BoutonDireQuantite.tsx');
  ok(/quantiteDite\(/.test(bouton), 'le micro lit la quantité par la règle, pas à sa façon');
  ok(!/parseInt|parseFloat|Number\(/.test(bouton), 'et personne ne relit un nombre à côté de la règle');
  ok(!/montantDit/.test(bouton), 'et pas de lecteur de PRIX ici — les contrats ne se mélangent pas');
  ok(/demarrerRecoWeb\(/.test(bouton) && /recoWebDispo\(\)/.test(bouton),
     'dictée web branchée — le web écoute comme le nom, le prix et l\'unité');
  ok(/startLiveDictation\(/.test(bouton), 'sherpa reste le chemin de l\'APK');
  ok(/CONTRAINTES_MICRO_DICTEE/.test(bouton), 'anti-écho MIC-01 — les mêmes contraintes que tous les micros');
  ok(/DIRE_CLE\('STOCK_069', dire\)/.test(bouton), 'le silence est relancé à la voix (STOCK_069)');
  ok(/code === 'micro' \? 'STOCK_070' : 'STOCK_071'/.test(bouton), 'les pannes se disent (STOCK_070/071) — STK-22');
  ok(/resoudreMessage\('STOCK_070'\)/.test(bouton), 'l\'affichage de la panne sort de la même clé que la voix');
  ok(/cheminRef\.current === 'sherpa' && !aEntenduRef\.current/.test(bouton),
     'la relance du minuteur ne parle que si rien n\'a été compris');
  ok(!/Tape combien tu en as/.test(bouton), 'plus aucune phrase en dur — tout passe par le catalogue');
}

console.log('\n[6] UNE SEULE NORMALISATION — LA MÊME QUE LA DICTÉE DE VENTE');
{
  const lecteur = readFileSync(join(ici, 'quantiteDite.ts'), 'utf-8');
  ok(/from '\.\.\/voice-offline\/extraction'/.test(lecteur),
     'quantiteDite réutilise `normalise` et `extraire` — apostrophe U+2019 et nombres lus une seule fois');
  ok(lit('j\u2019en sais rien') === '{"genre":"passe"}',
     'l\'apostrophe du téléphone (U+2019) ne casse pas « j\'en sais rien »', lit('j\u2019en sais rien'));
}

console.log(echecs === 0
  ? '\n✅ Elle dit combien elle en a — ou elle passe, et on l\'a entendue.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
