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

table('[3] La validation exige DEUX mots concordants et VOISINS', [
  ['oui valide', 'oui_valide'],
  ['oui, valide', 'oui_valide'],
  ['Oui, valide !', 'oui_valide'],
  ['oui je valide', 'oui_valide'],
  ['ouais valide', 'oui_valide'],
  ['oui validé', 'oui_valide'],
  ["oui c'est bon valide", 'oui_valide'],
  ['valide oui', 'oui_valide'],
  ['voilà, valide', 'oui_valide'],
]);

table("[4] Ce qui ne vaut RIEN — le bruit du marché ne paie pas", [
  ['oui', null],
  ['ouais', null],
  ["d'accord", null],
  ['ok', null],
  ["c'est bon", null],
  ['valide', null],
  ['validé', null],
  ['je valide', null],
  ['oui je regarderai si je valide demain', null],
  ['bonjour', null],
  ['', null],
  ['   ', null],
  ['fini', null],
  ["c'est tout", null],
  ['voilà', null],
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

console.log(echecs === 0 ? '\nTous les tests de la grammaire passent.' : `\n${echecs} échec(s).`);
if (echecs > 0) process.exit(1);
