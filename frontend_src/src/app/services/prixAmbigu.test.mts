/**
 * SUR UN MONTANT, ON NE DEVINE JAMAIS — ARG-12 (retour terrain #3 + #6).
 *
 * LE DÉFAUT, remonté par le testeur le 23/09 : « Si ma phrase est : j'ai vendu
 * 2 tas de piments à 1000, alors il applique le prix unitaire de 1000. Il
 * considère que le prix unitaire est le montant lu dans ma phrase. À
 * corriger. »
 *
 * CE N'ÉTAIT PAS UN BUG, C'ÉTAIT UNE DÉCISION — et c'est ce qui la rend
 * intéressante. `extraction.ts` tranchait « à » = prix de l'unité, en le
 * documentant : « c'est son mot qui tranche, pas notre devinette ». Sauf que
 * « à » ne tranche rien au marché : selon les habitudes, « 2 tas à 1000 »
 * veut dire 1000 le tas OU 1000 pour les deux. Prendre « à » pour une
 * décision, c'était déjà deviner.
 *
 * ARBITRAGE DE PATRICK, 23/09 : « Quand quantité > 1 et que la phrase ne dit
 * pas explicitement chacun / le tas / pour les deux / le tout, JULABA
 * demande. » Et l'optimisation qui compte autant : « l'ambiguïté n'est levée
 * que lorsqu'elle existe vraiment » — une question de trop sur chaque vente
 * ferait abandonner l'outil aussi sûrement qu'un faux prix.
 *
 * CE QUE ÇA COÛTE QUAND ON DEVINE. « 5 tas de gombos à 1500 » posait 7 500 F
 * au panier. Si elle voulait dire 1 500 pour les cinq, l'écart est de 6 000 F
 * sur UNE vente — et elle n'a rien confirmé.
 *
 * Lancer : npm run test:prix-ambigu
 */
import { extraire } from '../voice-offline/extraction.js';
import { intentLocalCaisse } from '../voice-offline/localIntent.js';
import { vendreVocalUnifie } from './vendreVocalUnifie.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};
const lecture = (p: string) => (extraire(p) as { lecturePrix: unknown }).lecturePrix;

console.log('\nSur un montant, on ne devine jamais — mais on ne demande pas pour rien\n');

console.log('[1] AMBIGU → ON DEMANDE (quantité > 1, aucun mot qui tranche)');
for (const p of [
  '2 tas de piments à 1000',
  "j'ai vendu 2 tas de piments à 1000",
  '5 tas de gombos à 1500',
  '3 kilos de tomate à 500',
]) {
  ok(lecture(p) === null, `${JSON.stringify(p)} → on demandera`);
}

console.log('\n[2] EXPLICITEMENT L\'UNITÉ → AUCUNE QUESTION');
for (const p of [
  '2 tas de piments à 1000 chacun',
  '2 tas de piments à 1000 chaque',
  '2 tas de piments à 1000 le tas',
  '3 kilos de tomate à 500 le kilo',
  "2 piments à 1000 l'unité",
  '2 piments à 1000 la pièce',
]) {
  ok(lecture(p) === 'unitaire', `${JSON.stringify(p)} → elle a dit l'unité`);
}

console.log('\n[3] EXPLICITEMENT LE LOT → AUCUNE QUESTION');
for (const p of [
  '2 tas de piments pour 1000',
  '2 tas de piments le tout à 1000',
  'les deux tas à 1000',
  'les trois tas à 1300',
  '2 tas de piments à 1000 en tout',
  'je te fais les 3 tas à 1300',
]) {
  ok(lecture(p) === 'total', `${JSON.stringify(p)} → elle a dit le lot`);
}

console.log('\n[4] UNE SEULE UNITÉ → RIEN À DEMANDER');
{
  // Avec une quantité de 1, « à 1000 » ne peut vouloir dire qu'une chose.
  // Demander ici serait une question pour rien, et Patrick l'a nommé :
  // « l'ambiguïté n'est levée que lorsqu'elle existe vraiment ».
  ok(lecture('1 tas de piments à 1000') === 'unitaire', 'un seul tas : le prix est le prix');
  ok(lecture('un tas de piments à 1000') === 'unitaire', 'écrit en toutes lettres aussi');
  ok(lecture('du piment à 1000') === 'unitaire', 'sans quantité dite : une unité, donc pas d\'ambiguïté');
}

console.log('\n[5] LA RÈGLE, ÉNONCÉE COMME TELLE');
{
  // On ne rend JAMAIS 'unitaire' par défaut sur une quantité multiple sans mot
  // explicite : c'est précisément la devinette qui coûtait 6 000 F.
  const ambigus = ['2 tas à 1000', '4 sacs à 2000', '10 piments à 100'];
  ok(ambigus.every(p => lecture(p) === null),
     'AUCUNE quantité multiple ne reçoit un prix deviné');
  // Et « pour » garde son sens : il désigne le lot, il n'a jamais été ambigu.
  ok(lecture('4 sacs pour 2000') === 'total', '« pour » reste le lot');
}

console.log('\n[6] RIEN N\'ENTRE AU PANIER AVANT SA RÉPONSE — le point #6');
{
  // AUCUNE DETTE NE SE FERME PAR EFFET DE BORD : #6 tombe avec #3, mais on le
  // MESURE et on le NOMME. « 5 tas de gombos à 1500 » posait 7 500 F au panier
  // sans qu'elle ait rien confirmé — 6 000 F d'écart si elle voulait dire
  // 1 500 pour les cinq.
  const P = '5 tas de gombos à 1500';
  const lu = extraire(P) as { uniteParlee: string | null; lecturePrix: 'unitaire' | 'total' | null };
  const a = intentLocalCaisse(P)?.action as { produit?: string; quantite?: number; montant?: number } | undefined;
  const panier: unknown[] = [];
  let question = '';
  await vendreVocalUnifie(a?.produit, Number(a?.quantite) || 1, Number(a?.montant) || 0, {
    products: [], addToCart: (...x: unknown[]) => { panier.push(x); },
    speak: () => {}, vibrerSucces: () => {}, notifierAjoutPanier: () => {},
    proposerCreationProduit: () => {},
    stockage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } as unknown as Storage,
    estEnLigne: () => false, planifier: (e: () => void) => setTimeout(e, 0) as unknown as number,
    guidageVocalActif: () => false, creerIdLigne: () => 'arg12',
    demanderPrix: undefined,
    signalerBlocage: ({ texte }: { texte: string }) => { question = texte; },
  } as never, lu.uniteParlee, lu.lecturePrix);

  ok(panier.length === 0, 'le panier reste VIDE tant qu\'elle n\'a pas répondu');
  ok(/un seul/i.test(question) && /5/.test(question),
     `et la question nomme les deux lectures — « ${question} »`);
  ok(!/7\s?500/.test(question), 'sans jamais annoncer un total qu\'elle n\'a pas choisi');
}

console.log(echecs === 0
  ? '\n✅ On demande quand c\'est ambigu, et seulement là.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
