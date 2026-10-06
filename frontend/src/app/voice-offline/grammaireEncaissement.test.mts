/**
 * GRAMMAIRE D'ENCAISSEMENT — table de phrases réelles (VOIX-01, lot C).
 * Lancer : npm run test:grammaire-encaissement   (tsx, sans DOM)
 *
 * LA BASE, MESURÉE SUR `cc26647` (pas supposée) : « encaisse », « on
 * encaisse », « combien elle doit », « oui valide », « valide », « oui » et
 * « d'accord » renvoyaient TOUS `null` à `intentLocal` — c'est-à-dire « Je
 * n'ai pas bien compris ». Ce module n'existait pas ; ce test est donc rouge
 * de fait sur cette base (import impossible), et il reste la référence de ce
 * que la grammaire DOIT et NE DOIT PAS reconnaître.
 *
 * CE QUE CE TEST TIENT, ET POURQUOI C'EST UNE TABLE. Une grammaire de marché
 * se juge sur des phrases, pas sur des regex : on écrit ce que Tata entend
 * réellement — dans le bruit, avec les tournures ivoiriennes — et on fige ce
 * qu'elle doit en faire. Les REFUS comptent autant que les reconnaissances :
 * « oui » seul, « d'accord », « valide » seul ne doivent JAMAIS devenir la
 * phrase qui écrit de l'argent, et une vente ou une question sur les chiffres
 * du jour ne doivent jamais être détournées vers l'encaissement.
 *
 * Ce test ne dit rien du paiement : reconnaître « oui valide » n'autorise
 * rien, c'est machineEncaissement.test.mts qui prouve la porte.
 */
import { readFileSync } from 'node:fs';
import { intentLocal } from './localIntent.js';
import { detecterEncaissement, INTENTIONS_ENCAISSEMENT, estIntentionEncaissement, type IntentionEncaissement } from './grammaireEncaissement.js';

let echecs = 0;
const ok = (cond: boolean, quoi: string) => {
  if (cond) console.log('  ✓', quoi);
  else { console.log('  ✗', quoi); echecs++; }
};

/** Une ligne de la table : la phrase telle qu'entendue, et ce qu'on en attend. */
type Cas = [phrase: string, attendu: IntentionEncaissement | null];

const table = (titre: string, cas: Cas[]) => {
  console.log(`\n${titre}`);
  for (const [phrase, attendu] of cas) {
    const obtenu = detecterEncaissement(phrase);
    ok(obtenu === attendu, `« ${phrase} » → ${String(attendu)}${obtenu === attendu ? '' : ` (obtenu : ${String(obtenu)})`}`);
  }
};

table('[1] « encaisse » PRÉPARE — sous ses formes réellement dites', [
  ['encaisse', 'encaisser'],
  ['on encaisse', 'encaisser'],
  ['Encaisse !', 'encaisser'],
  ['on encaisse ça', 'encaisser'],
  ['encaisse maintenant', 'encaisser'],
  ["j'encaisse", 'encaisser'],
  ['bon, on encaisse', 'encaisser'],
  ['encaisser', 'encaisser'],
  ['termine la vente', 'encaisser'],
  ['finis la vente', 'encaisser'],
]);

table('[2] « combien elle doit » — lecture seule, plus accueillante', [
  ['combien elle doit ?', 'combien_doit'],
  ['combien elle doit', 'combien_doit'],
  ['combien il doit', 'combien_doit'],
  ['combien la cliente doit', 'combien_doit'],
  ['elle doit combien', 'combien_doit'],
  ['ça fait combien', 'combien_doit'],
  ["c'est combien", 'combien_doit'],
  ['le total', 'combien_doit'],
  ['total', 'combien_doit'],
]);

table('[3] La validation est une LISTE BLANCHE de réponses autonomes — la phrase ENTIÈRE, rien avant, rien après', [
  ['oui valide', 'oui_valide'],
  ['oui, valide', 'oui_valide'],
  ['Oui, valide !', 'oui_valide'],
  ['  oui   valide  ', 'oui_valide'],
  ['oui je valide', 'oui_valide'],
  ['ouais valide', 'oui_valide'],
  ['ouais je valide', 'oui_valide'],
  ['oui validé', 'oui_valide'],
  ["oui c'est bon valide", 'oui_valide'],
  ["oui c’est bon valide", 'oui_valide'],
  ['oui on valide', 'oui_valide'],
  ['oui valide ça', 'oui_valide'],
  ['valide oui', 'oui_valide'],
]);

table("[4] Ce qui ne vaut RIEN — le bruit du marché ne paie pas", [
  ['oui', null],
  ['ouais', null],
  ["d'accord", null],
  ['ok', null],
  ["c'est bon", null],
  ["ouais c'est ça", null],
  ['valide', null],
  ['validé', null],
  ['je valide', null],
  ['ok valide', null],
  ['ça va valider', null],
  ['voilà, valide', null],
  ['oui je regarderai si je valide demain', null],
  ['bonjour', null],
  ['', null],
  ['   ', null],
  ['fini', null],
  ["c'est tout", null],
  ['voilà', null],
]);

table('[4b] VOIX-02 — « oui valide » AU MILIEU D\'AUTRE CHOSE ne paie JAMAIS (rouge sur b752c78)', [
  // Reproduit par le QA et l'orchestrateur sur b752c78 : « oui je valide
  // pas » → oui_valide → après relecture, effet `encaisser`. Le montant
  // était bien celui relu ; c'est l'esprit du critère qui était contredit :
  // un refus écrivait de l'argent. La regex cherchait « oui … valide »
  // quelque part dans la phrase. Décision de Patrick : une phrase qui écrit
  // de l'argent se reconnaît par sa FORME EXACTE — liste blanche fermée —
  // pas par des mots qui traînent. Tout le reste : rien, ou annulation si un
  // mot d'annulation est présent.
  ['oui je valide pas', null],
  ['oui valide pas', null],
  ['oui, je valide pas', null],
  ['oui valide la dépense', null],
  ['ma cliente a dit oui valide', null],
  ['oui je valide mon panier plus tard', null],
  ['oui valide rien', null],
  ['oui je ne valide plus', null],
  ['jamais valide', null],
  ['oui valide pour elle', null],
  ['bon oui valide', null],
  ['oui valide merci', null],
  ['oui valide oui valide', null],
  ['oui valide non', 'annuler_validation'],
  ['non oui valide', 'annuler_validation'],
  ['oui valide, attends', 'annuler_validation'],
]);

table('[5] L\'annulation passe AVANT la validation — « non, pas valide » contient « valid »', [
  ['non, pas valide', 'annuler_validation'],
  ['non', 'annuler_validation'],
  ['non non', 'annuler_validation'],
  ['non valide', 'annuler_validation'],
  ['annule', 'annuler_validation'],
  ['attends', 'annuler_validation'],
  ['arrête', 'annuler_validation'],
  ['pas encore', 'annuler_validation'],
  ['laisse', 'annuler_validation'],
  ['oui valide, non attends', 'annuler_validation'],
]);

table("[6] Une vente ou une question du jour n'est PAS un encaissement", [
  ['vends 3 tomates à 500 francs', null],
  ['vends 2 tas de piment', null],
  ['deux kilos d\'oignons à 1000', null],
  ["j'ai dépensé 1000 pour le taxi", null],
  ["combien j'ai vendu aujourd'hui", null],
  ["combien j'ai gagné aujourd'hui", null],
  ['quel est mon bénéfice', null],
  ['ma meilleure vente', null],
]);

console.log('\n[7] La liste des intentions est la source unique des deux listes du micro');
ok(INTENTIONS_ENCAISSEMENT.length === 4, `quatre intentions, pas une de plus (${INTENTIONS_ENCAISSEMENT.length})`);
for (const i of ['encaisser', 'combien_doit', 'oui_valide', 'annuler_validation'] as const) {
  ok(INTENTIONS_ENCAISSEMENT.includes(i) && estIntentionEncaissement(i), `« ${i} » en fait partie`);
}
ok(!estIntentionEncaissement('vendre') && !estIntentionEncaissement('depense') && !estIntentionEncaissement(''),
  'ni « vendre », ni « depense », ni la chaîne vide');

console.log("\n[8] LE MOT QUE L'ÉCRAN DICTE EST CELUI QUE LA MACHINE COMPREND");
{
  // Retour terrain du 24/09 : « à la fonctionnalité Encaisser, "Dis Encaisser
  // pour terminer", on a beaucoup répété Encaisser, il met "Je n'ai pas
  // compris, redis-moi" ».
  //
  // MESURÉ le 24/09, sur le code d'aujourd'hui : NON REPRODUIT. La grammaire
  // reconnaît toutes les formes, et `intentLocal` les transmet. Le retour porte
  // sur l'APK `6a3663e` (23/09 19h25), soit DEUX HEURES avant VOX-02 — l'écran
  // mort après la première vente. Or l'encaissement arrive juste après une
  // vente : le micro était inerte, elle répétait dans le vide.
  //
  // On ne corrige donc rien ici. On FIGE ce qui a été mesuré, pour que ce
  // chemin ne se casse plus en silence — c'est exactement le défaut STK-05,
  // où l'écran dictait une phrase que plus rien ne comprenait.

  // 1. Le mot imprimé à l'écran, relu dans le source — pas recopié à la main.
  const micro = readFileSync(
    new URL('../components/marchand/MicroVenteCaisse.tsx', import.meta.url), 'utf-8');
  const dicte = micro.match(/Dis\s*<strong>«\s*([a-zà-ÿ']+)\s*»<\/strong>/i)?.[1];
  ok(!!dicte, `l'écran dicte bien un mot (${JSON.stringify(dicte)})`);

  // 2. Ce mot EXACT doit être compris. Sinon l'écran donne tort à la marchande.
  ok(!!dicte && detecterEncaissement(dicte) === 'encaisser',
     `« ${dicte} » — le mot dicté est compris par la grammaire`);
  ok(!!dicte && intentLocal(dicte)?.intent === 'encaisser',
     `« ${dicte} » — et il traverse jusqu'à l'intention, pas seulement la grammaire`);

  // 3. Les formes qu'une marchande emploie vraiment.
  for (const f of ['encaisser', 'encaisse', 'on encaisse', "c'est bon encaisse",
                   'ok encaisser', 'oui encaisser', 'encaisser.']) {
    ok(detecterEncaissement(f) === 'encaisser', `« ${f} » est reconnu`);
  }

  // 4. ET CE QUI NE DOIT PAS PASSER NE PASSE PAS. Sur l'argent, une porte
  //    large est pire qu'une porte fermée : « c'est fini » n'est pas un ordre
  //    d'encaisser tant que le produit n'en a pas décidé ainsi.
  for (const f of ['termine', "c'est fini", 'bonjour', '']) {
    ok(detecterEncaissement(f) === null, `« ${f} » n'encaisse PAS`);
  }
}

console.log(echecs === 0 ? '\nTous les tests de la grammaire passent.' : `\n${echecs} échec(s).`);
if (echecs > 0) process.exit(1);
