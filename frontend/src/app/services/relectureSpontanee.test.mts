/**
 * RELECTURE SPONTANÉE — tests du module pur (VOIX-01, lot D).
 * Lancer : npm run test:relecture-spontanee
 *
 * CE QU'ON TIENT. Tata dit le reçu, la monnaie et le manque D'ELLE-MÊME, et
 * seulement quand quelque chose a changé : jamais deux fois la même phrase
 * pour le même état, jamais un mot sur un panier vide, jamais un montant
 * recopié d'un rendu précédent — la monnaie est recalculée à partir du reçu
 * et du total à chaque décision.
 *
 * AUCUNE CHAÎNE MONÉTAIRE N'EST TAPÉE À LA MAIN. `toLocaleString('fr-FR')`
 * sépare les milliers par une espace insécable (U+202F ou U+00A0) selon le
 * moteur ICU : un « 2 000 » tapé au clavier ne serait égal à rien. Les
 * montants attendus sont donc toujours produits par `fr()` ci-dessous, la
 * même fonction que le module.
 */
import { phraseRelecture, phraseLigneAjoutee, memeEtat, type EtatEncaissement } from './relectureSpontanee.js';

let echecs = 0;
const ok = (cond: boolean, quoi: string) => {
  if (cond) console.log('  ✓', quoi);
  else { console.log('  ✗', quoi); echecs++; }
};
const eq = (obtenu: unknown, attendu: unknown, quoi: string) => {
  if (obtenu === attendu) console.log('  ✓', quoi);
  else { console.log('  ✗', quoi, `\n     attendu : ${JSON.stringify(attendu)}\n     obtenu  : ${JSON.stringify(obtenu)}`); echecs++; }
};

const fr = (n: number) => n.toLocaleString('fr-FR');
const etat = (total: number, recu: number, nbLignes = 1): EtatEncaissement => ({ total, recu, nbLignes });

/**
 * Rejoue la caisse comme le useEffect la jouera : chaque état SOUMIS devient
 * le précédent, qu'une phrase ait été dite ou non (voir l'en-tête du module).
 */
function rejouer(etats: EtatEncaissement[]): (string | null)[] {
  let precedent: EtatEncaissement | null = null;
  return etats.map(e => {
    const p = phraseRelecture(e, precedent);
    precedent = e;
    return p;
  });
}

console.log('\n[1] Le reçu devient suffisant : elle entend ce qu\'on lui a donné et ce qu\'elle rend');
eq(phraseRelecture(etat(1500, 2000), null),
  `Elle t'a donné ${fr(2000)} francs. Tu rends ${fr(500)} francs.`,
  'reçu 2 000 pour 1 500 → « Elle t\'a donné 2 000 francs. Tu rends 500 francs. »');
eq(phraseRelecture(etat(12500, 15000), null),
  `Elle t'a donné ${fr(15000)} francs. Tu rends ${fr(2500)} francs.`,
  'les milliers sont formatés comme à l\'écran (fr-FR)');
ok(!/\bF\b/.test(phraseRelecture(etat(1500, 2000), null) ?? ''), 'jamais « F » seul : la synthèse le lirait comme une lettre');

console.log('\n[2] Compte juste');
eq(phraseRelecture(etat(1500, 1500), null), 'Compte juste.', 'reçu = total → « Compte juste. »');

console.log('\n[3] Le reçu change mais reste insuffisant : elle entend ce qui manque');
eq(phraseRelecture(etat(1500, 1000), null), `Il manque ${fr(500)} francs.`, 'reçu 1 000 pour 1 500 → « Il manque 500 francs. »');
{
  // Elle pose un billet de 1 000, puis un de 500, puis un de 2 000 : trois
  // phrases différentes, la dernière dit la monnaie.
  const dites = rejouer([etat(2500, 1000), etat(2500, 1500), etat(2500, 3500)]);
  eq(dites[0], `Il manque ${fr(1500)} francs.`, 'premier billet : il manque 1 500');
  eq(dites[1], `Il manque ${fr(1000)} francs.`, 'deuxième billet : il manque 1 000');
  eq(dites[2], `Elle t'a donné ${fr(3500)} francs. Tu rends ${fr(1000)} francs.`, 'troisième billet : elle rend 1 000');
}

console.log('\n[4] NÉGATIF — jamais la même phrase deux fois pour le même état');
{
  const dites = rejouer([etat(1500, 2000), etat(1500, 2000), etat(1500, 2000)]);
  ok(dites[0] !== null, 'la première fois, Tata parle');
  eq(dites[1], null, 'le même état resoumis (re-render) → silence');
  eq(dites[2], null, 'et encore → silence');
}
ok(memeEtat(etat(1, 2, 3), etat(1, 2, 3)), 'memeEtat : mêmes chiffres → même état');
ok(!memeEtat(etat(1, 2, 3), etat(1, 2, 4)), 'memeEtat : une ligne de plus → état différent');
ok(!memeEtat(null, etat(1, 2, 3)), 'memeEtat : sans précédent, rien n\'est « déjà dit »');

console.log('\n[5] NÉGATIF — panier vide : muet, quoi que dise le reçu');
eq(phraseRelecture(etat(0, 0, 0), null), null, 'rien au panier, rien reçu → silence');
eq(phraseRelecture(etat(0, 2000, 0), null), null, 'rien au panier mais un billet posé → silence (pas d\'argent en jeu)');
eq(phraseRelecture(etat(1500, 0, 1), null), null, 'panier plein mais rien reçu → silence (le total a été dit à l\'ajout)');

console.log('\n[6] NÉGATIF — la monnaie est RECALCULÉE, jamais recopiée');
{
  // Le reçu ne bouge pas (2 000), mais elle ajoute une ligne : le total passe
  // de 1 500 à 2 500. La phrase doit suivre le NOUVEAU total — « il manque
  // 500 » — et non ressortir « tu rends 500 » d'avant.
  const dites = rejouer([etat(1500, 2000, 1), etat(2500, 2000, 2)]);
  eq(dites[0], `Elle t'a donné ${fr(2000)} francs. Tu rends ${fr(500)} francs.`, 'avant l\'ajout : elle rend 500');
  eq(dites[1], `Il manque ${fr(500)} francs.`, 'après l\'ajout, même reçu : il manque 500 (recalculé)');
}
{
  // Elle retire une ligne : le même reçu devient suffisant.
  const dites = rejouer([etat(2500, 2000, 2), etat(1000, 2000, 1)]);
  eq(dites[1], `Elle t'a donné ${fr(2000)} francs. Tu rends ${fr(1000)} francs.`, 'ligne retirée, même reçu : elle rend 1 000');
}

console.log('\n[7] Deux ventes identiques d\'affilée : la seconde N\'EST PAS muette');
{
  // Le piège décrit dans l'en-tête du module : vente A, panier vidé, vente B
  // identique. Le passage par l'état vide fait que B n'est pas « déjà dite ».
  const dites = rejouer([etat(1000, 2000, 1), etat(0, 0, 0), etat(1000, 2000, 1)]);
  ok(dites[0] !== null, 'vente A : dite');
  eq(dites[1], null, 'panier vidé : silence');
  eq(dites[2], dites[0], 'vente B, identique : dite à nouveau');
}

console.log('\n[8] Ajout tactile d\'une ligne : quantité, unité, prix de la ligne, TOTAL du panier');
eq(phraseLigneAjoutee({ nom: 'tomate', quantite: 3, unite: 'tas', totalLigne: 1500, totalPanier: 4000 }),
  `3 tas de tomate, ${fr(1500)} francs. Total : ${fr(4000)} francs.`,
  '« 3 tas de tomate, 1 500 francs. Total : 4 000 francs. »');
eq(phraseLigneAjoutee({ nom: 'riz', quantite: 2, unite: 'kg', totalLigne: 1600, totalPanier: 1600 }),
  `2 kg de riz, ${fr(1600)} francs. Total : ${fr(1600)} francs.`,
  'abréviation « kg » invariable, comme phraseCompris');
eq(phraseLigneAjoutee({ nom: 'tomate', quantite: 2, unite: 'unité', totalLigne: 1000, totalPanier: 3000 }),
  `2 tomates, ${fr(1000)} francs. Total : ${fr(3000)} francs.`,
  '« unité » n\'apprend rien : on pluralise le produit (« 2 tomates »)');
eq(phraseLigneAjoutee({ nom: 'tomate', quantite: 1, unite: null, totalLigne: 500, totalPanier: 500 }),
  `1 tomate, ${fr(500)} francs. Total : ${fr(500)} francs.`,
  'quantité 1, sans unité : singulier');
eq(phraseLigneAjoutee({ nom: 'sel', quantite: 1, unite: 'sachet', totalLigne: 100, totalPanier: 12100 }),
  `1 sachet de sel, ${fr(100)} francs. Total : ${fr(12100)} francs.`,
  'le total du panier est dit même quand la ligne est petite : c\'est lui qu\'elle annonce à la cliente');
ok(phraseLigneAjoutee({ nom: 'tomate', quantite: 3, unite: 'tas', totalLigne: 1500, totalPanier: 4000 }).includes(fr(4000)),
  'le total est formaté par toLocaleString(fr-FR), donc identique à l\'écran');

if (echecs > 0) {
  console.log(`\n✗ relecture spontanée — ${echecs} échec(s)`);
  process.exit(1);
}
console.log('\n✓ relecture spontanée — ce que la caisse recalcule, Tata le redit d\'elle-même, une seule fois');
