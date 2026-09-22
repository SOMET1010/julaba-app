/**
 * LES DIX CAS D'ARGENT DE RÉFÉRENCE — et la preuve du défaut « trois zéro
 * zéro zéro » sur le VRAI chemin.
 * Lancer : npm run test:argent-parle   (tsx, sans DOM)
 *
 * ── CE QUE PATRICK A DEMANDÉ, MOT POUR MOT ────────────────────────────────
 *
 *   « Produire seulement 10 cas argent de référence, choisis pour couvrir :
 *     petit montant ; centaines ; milliers ; dizaines de milliers ; montant
 *     exact ; montant ambigu ; franc CFA explicite ; cas dɔrɔmɛ ; composition
 *     complexe ; cas qui doit être refusé. »
 *
 *   « On valide ces 10 cas linguistiquement AVANT de généraliser aux 125 clés. »
 *
 * Ce sont DIX CAS NOMMÉS ET FIGÉS, pas une suite exhaustive. Le dixième —
 * celui qui DOIT ÊTRE REFUSÉ — est le plus important : il prouve qu'une
 * sortie vocale d'argent est IMPOSSIBLE sans unité sémantique résolue.
 *
 * ── CE QUE CE FICHIER NE FAIT PAS ─────────────────────────────────────────
 *
 * Il ne traduit aucune des 124 clés d'argent manquantes en dioula, et il ne
 * juge la JUSTESSE d'aucune langue non validée. Le drapeau JULABA_DYU_ARGENT
 * reste expérimental ; rien ici ne le présente comme une validation.
 */
import { formeEcran, formeParlee, nombreEnMotsFr, type MotsMonnaie } from './deuxFormes';
import { enFrancs, resoudreMontant, type MoneyUtterance, type ResolvedMoney } from './enonceArgent';
import { journalArgent, viderJournalArgent } from './journalArgent';
import { formeParleeDuMessage, resoudreMessage, interpoler } from '../runtime';
import { manifest } from '../registry';
import { LOCALE_REFERENCE } from '../types';

let echecs = 0;
function ok(cond: boolean, label: string): void {
  if (cond) console.log('  ✅', label);
  else { console.log('  ❌', label); echecs++; }
}
function eq(recu: string, attendu: string, label: string): void {
  ok(recu === attendu, `${label} — « ${recu} »${recu === attendu ? '' : ` ≠ attendu « ${attendu} »`}`);
}

/** L'espace fine insécable du formatage fr-FR : le coupable, en clair. */
const FINE_INSECABLE = ' ';
const contientCoupure = (s: string) => /[   \s]\d/.test(s);

const FR: MotsMonnaie = { parlee: 'francs', symbole: 'F', formatNombre: 'fr-FR', uniteOraleParlee: 'dɔrɔmɛ' };

// ═══════════════════════════════════════════════════════════════════════════
// [0] LE DÉFAUT, SUR LE VRAI CHEMIN : « 3000 » → « trois zéro zéro zéro »
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n[0] Le défaut constaté sur un vrai téléphone, sur le chemin réel');

// Le rouge, tel qu'il était : LA MÊME CHAÎNE servait à l'œil et à l'oreille.
// `interpoler` est le formateur d'écran — il n'a pas changé d'un caractère.
const mFr = manifest(LOCALE_REFERENCE)!;
const ecrit = interpoler('Elle doit {total} {devise}.', { total: 3000 }, mFr);
ok(ecrit.includes(`3${FINE_INSECABLE}000`),
  `la forme ÉCRAN contient bien « 3 000 » avec U+202F (code ${FINE_INSECABLE.codePointAt(0)}) : « ${ecrit} »`);
ok(contientCoupure(ecrit), 'et cette chaîne coupe le nombre en deux jetons — « 3 », puis « 000 » : le moteur épelle');

// Le vert : c'est la forme PARLÉE qui part à la voix, et elle ne coupe rien.
const dit = resoudreMessage('TATA_DOIT', { total: 3000 });
eq(dit.texte, `Elle doit 3${FINE_INSECABLE}000 francs.`, "l'affichage n'a pas bougé d'un pixel");
eq(formeParleeDuMessage(dit), 'Elle doit trois mille francs.', 'la voix part désormais de la forme parlée');
ok(!formeParleeDuMessage(dit).includes(FINE_INSECABLE) && !/\d/.test(formeParleeDuMessage(dit)),
  'plus un seul chiffre ni une seule espace insécable dans ce qui part au moteur de synthèse');
ok(dit.texte !== formeParleeDuMessage(dit), 'les deux formes sont DISTINCTES, dérivées de la même source');

// Le même défaut sur la relecture spontanée (« Il manque 3 000 francs »).
const manque = resoudreMessage('TATA_MANQUE', { montant: 3000 });
eq(manque.texte, `Il manque 3${FINE_INSECABLE}000 francs.`, 'TATA_MANQUE à l\'écran');
eq(formeParleeDuMessage(manque), 'Il manque trois mille francs.', 'TATA_MANQUE à l\'oreille');

// Et sur la relecture financière complète, les trois nombres.
const relu = resoudreMessage('TATA_RELECTURE_MONNAIE', { total: 4000, recu: 5000, monnaie: 1000 });
eq(formeParleeDuMessage(relu),
  'Elle doit quatre mille francs. Elle t\'a donné cinq mille francs. Tu rends mille francs. Je valide ?',
  'la relecture financière complète, dite en toutes lettres');
ok(!/\d/.test(formeParleeDuMessage(relu)), 'aucun chiffre ne subsiste dans la relecture parlée');

// Une phrase SANS argent ne bouge pas : une seule forme, comme avant.
const sansArgent = resoudreMessage('TATA_INVITE');
ok(sansArgent.texte === formeParleeDuMessage(sansArgent), 'une phrase sans argent garde UNE seule forme (texteParle === texte)');

// ═══════════════════════════════════════════════════════════════════════════
// LES DIX CAS DE RÉFÉRENCE
// ═══════════════════════════════════════════════════════════════════════════

interface CasArgent {
  readonly numero: number;
  readonly nom: string;
  readonly couverture: string;
  readonly entree: Parameters<typeof resoudreMontant>[0];
  /** `null` quand le cas DOIT être refusé. */
  readonly parleAttendu: string | null;
  readonly ecranAttendu: string | null;
}

/** Les dix cas, nommés et figés. On ne les allonge pas : on les valide. */
export const DIX_CAS: readonly CasArgent[] = [
  {
    numero: 1, nom: 'petit montant', couverture: 'petit montant',
    entree: { amount: 25, currency: 'XOF', semanticUnit: 'franc_cfa', locale: 'fr-ci', source: 'reference' },
    parleAttendu: 'vingt-cinq francs', ecranAttendu: '25 F',
  },
  {
    numero: 2, nom: 'centaines', couverture: 'centaines',
    entree: { amount: 200, currency: 'XOF', semanticUnit: 'franc_cfa', locale: 'fr-ci', source: 'reference' },
    parleAttendu: 'deux cents francs', ecranAttendu: '200 F',
  },
  {
    numero: 3, nom: 'milliers — LE cas de Patrick', couverture: 'milliers',
    entree: { amount: 3000, currency: 'XOF', semanticUnit: 'franc_cfa', locale: 'fr-ci', source: 'reference' },
    parleAttendu: 'trois mille francs', ecranAttendu: `3${FINE_INSECABLE}000 F`,
  },
  {
    numero: 4, nom: 'dizaines de milliers', couverture: 'dizaines de milliers',
    entree: { amount: 80000, currency: 'XOF', semanticUnit: 'franc_cfa', locale: 'fr-ci', source: 'reference' },
    parleAttendu: 'quatre-vingt mille francs', ecranAttendu: `80${FINE_INSECABLE}000 F`,
  },
  {
    numero: 5, nom: 'montant exact (compte juste)', couverture: 'montant exact',
    entree: { amount: 15000, currency: 'XOF', semanticUnit: 'franc_cfa', locale: 'fr-ci', source: 'saisie' },
    parleAttendu: 'quinze mille francs', ecranAttendu: `15${FINE_INSECABLE}000 F`,
  },
  {
    numero: 6, nom: 'montant ambigu (unitaire ou total)', couverture: 'montant ambigu',
    // L'AMBIGUÏTÉ EST SUR LE RÔLE, PAS SUR L'UNITÉ. Le nombre est bien un
    // montant en francs — on sait le DIRE. Ce qu'on ignore, c'est s'il vaut
    // pour un seul ou pour tous : c'est la grammaire qui pose la question
    // (TATA_AMBIGUITE), et la voix doit la poser juste.
    entree: { amount: 400, currency: 'XOF', semanticUnit: 'franc_cfa', locale: 'fr-ci', source: 'dictee' },
    parleAttendu: 'quatre cents francs', ecranAttendu: '400 F',
  },
  {
    numero: 7, nom: 'franc CFA explicite', couverture: 'franc CFA explicite',
    entree: { amount: 5000, currency: 'XOF', semanticUnit: 'franc_cfa', locale: 'dyu', source: 'reference' },
    parleAttendu: 'cinq mille francs', ecranAttendu: `5${FINE_INSECABLE}000 F`,
  },
  {
    numero: 8, nom: 'cas dɔrɔmɛ', couverture: 'cas dɔrɔmɛ',
    // 1 dɔrɔmɛ = 5 F. Le nombre est en dɔrɔmɛ ; la voix dit les DEUX, parce
    // qu'au marché le mot est le plus souvent omis et que « mille » tout seul
    // vaudrait 1 000 F ou 5 000 F.
    entree: { amount: 1000, currency: 'XOF', semanticUnit: 'dorome', locale: 'dyu', source: 'dictee' },
    parleAttendu: "mille dɔrɔmɛ, c'est-à-dire cinq mille francs", ecranAttendu: `1${FINE_INSECABLE}000 dɔrɔmɛ`,
  },
  {
    numero: 9, nom: 'composition complexe', couverture: 'composition complexe',
    entree: { amount: 81675, currency: 'XOF', semanticUnit: 'franc_cfa', locale: 'fr-ci', source: 'reference' },
    parleAttendu: 'quatre-vingt-un mille six cent soixante-quinze francs', ecranAttendu: `81${FINE_INSECABLE}675 F`,
  },
  {
    numero: 10, nom: 'CAS QUI DOIT ÊTRE REFUSÉ — nombre nu, sans unité sémantique',
    couverture: 'cas qui doit être refusé',
    // `{ amount: 5000 }` : aucune unité. Francs ou dɔrɔmɛ — 5 000 F ou
    // 25 000 F. Aucune voix ne doit sortir de là.
    entree: { amount: 5000 },
    parleAttendu: null, ecranAttendu: null,
  },
];

console.log('\n[1..10] Les dix cas de référence');
for (const cas of DIX_CAS) {
  const r: ResolvedMoney = resoudreMontant(cas.entree);
  if (cas.parleAttendu === null) {
    // LE CAS 10. Deux preuves, pas une.
    ok(!r.resolved, `[${cas.numero}] ${cas.nom} : REFUSÉ — l'énoncé n'est pas résolu`);
    ok(!r.resolved && r.loss.kind === 'UNIT_MISSING',
      `[${cas.numero}] la perte est nommée : UNIT_MISSING (franc vs dɔrɔmɛ)`);
    ok(!r.resolved && r.candidates.length === 2 && r.candidates.some(c => c.semanticUnit === 'franc_cfa') && r.candidates.some(c => c.semanticUnit === 'dorome'),
      `[${cas.numero}] les DEUX lectures sont rendues, pour qu'on puisse DEMANDER au lieu de choisir`);
    // La garantie structurelle : sur la branche non résolue, `.value` N'EXISTE
    // PAS. Le compilateur refuse `r.value`, donc `formeParlee(r.value, …)` ne
    // compile pas. Un nombre nu ne PEUT pas atteindre la synthèse.
    ok(!('value' in r), `[${cas.numero}] et \`.value\` n'existe pas sur cette branche : la synthèse est inatteignable, pas seulement déconseillée`);
    continue;
  }
  ok(r.resolved, `[${cas.numero}] ${cas.nom} (${cas.couverture}) : énoncé résolu`);
  if (!r.resolved) continue;
  const v: MoneyUtterance = r.value;
  eq(formeParlee(v, FR), cas.parleAttendu, `[${cas.numero}] forme PARLÉE`);
  eq(formeEcran(v, FR), cas.ecranAttendu!, `[${cas.numero}] forme ÉCRAN`);
  ok(!/\d/.test(formeParlee(v, FR)), `[${cas.numero}] aucun chiffre dans la forme parlée`);
  ok(v.currency === 'XOF' && typeof v.semanticUnit === 'string' && v.locale.length > 0 && v.source.length > 0,
    `[${cas.numero}] les cinq champs sont portés : amount=${v.amount} currency=${v.currency} semanticUnit=${v.semanticUnit} locale=${v.locale} source=${v.source}`);
}

ok(DIX_CAS.length === 10, `il y a exactement dix cas de référence (${DIX_CAS.length})`);
ok(new Set(DIX_CAS.map(c => c.couverture)).size === 10, 'et ils couvrent dix axes distincts, un par axe demandé');
ok(enFrancs(DIX_CAS[7].entree as MoneyUtterance) === 5000, 'le cas dɔrɔmɛ vaut bien 5 000 F (1 dɔrɔmɛ = 5 F)');

// ═══════════════════════════════════════════════════════════════════════════
// LES PIÈGES DU FRANÇAIS
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n[11] Les pièges du français, déterministes');
const PIEGES: ReadonlyArray<readonly [number, string]> = [
  [0, 'zéro'], [1, 'un'], [7, 'sept'], [11, 'onze'], [16, 'seize'], [17, 'dix-sept'], [19, 'dix-neuf'],
  [20, 'vingt'], [21, 'vingt et un'], [22, 'vingt-deux'], [30, 'trente'], [50, 'cinquante'],
  [70, 'soixante-dix'], [71, 'soixante et onze'], [77, 'soixante-dix-sept'],
  [80, 'quatre-vingts'], [81, 'quatre-vingt-un'], [90, 'quatre-vingt-dix'], [91, 'quatre-vingt-onze'], [99, 'quatre-vingt-dix-neuf'],
  [100, 'cent'], [101, 'cent un'], [180, 'cent quatre-vingts'], [200, 'deux cents'], [201, 'deux cent un'], [999, 'neuf cent quatre-vingt-dix-neuf'],
  [1000, 'mille'], [1001, 'mille un'], [1500, 'mille cinq cents'], [2000, 'deux mille'], [3000, 'trois mille'],
  [10000, 'dix mille'], [12500, 'douze mille cinq cents'], [21000, 'vingt et un mille'],
  [80000, 'quatre-vingt mille'], [200000, 'deux cent mille'], [1000000, 'un million'], [2500000, 'deux millions cinq cent mille'],
];
for (const [n, attendu] of PIEGES) eq(nombreEnMotsFr(n), attendu, `${n}`);
ok(nombreEnMotsFr(1000) !== 'un mille', '1000 se dit « mille », jamais « un mille »');
ok(nombreEnMotsFr(80) === 'quatre-vingts' && nombreEnMotsFr(81) === 'quatre-vingt-un',
  '« quatre-vingts » prend son s quand rien ne suit, et le perd devant un chiffre');
ok(nombreEnMotsFr(100) === 'cent' && nombreEnMotsFr(200) === 'deux cents' && nombreEnMotsFr(201) === 'deux cent un',
  '« cent », « deux cents », « deux cent un »');
// 0 → 100, sans trou et sans chiffre.
let sansChiffre = 0;
for (let n = 0; n <= 100; n++) if (!/\d/.test(nombreEnMotsFr(n))) sansChiffre++;
ok(sansChiffre === 101, `0 à 100 : les 101 valeurs s'écrivent sans un seul chiffre (${sansChiffre})`);

// ═══════════════════════════════════════════════════════════════════════════
// LE JOURNAL
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n[12] Le journal d\'argent : valeur source · unité source · texte produit · chemin · drapeau');
viderJournalArgent();
resoudreMessage('TATA_RELECTURE_MONNAIE', { total: 4000, recu: 5000, monnaie: 1000 });
const lignes = journalArgent();
ok(lignes.length === 3, `trois montants, trois lignes de journal (${lignes.length})`);
ok(lignes.every(l => l.cle === 'TATA_RELECTURE_MONNAIE'), 'chaque ligne nomme la clé du message');
ok(lignes.every(l => typeof l.valeurSource === 'number'), 'valeur source : le nombre tel qu\'il est entré');
ok(lignes.every(l => l.uniteSource === 'franc_cfa'), 'unité source : franc_cfa, déclarée, jamais devinée');
ok(lignes.every(l => l.texteProduit.length > 0 && !/\d/.test(l.texteProduit)), 'texte produit : en toutes lettres');
ok(lignes.every(l => l.chemin === 'forme-parlee'), 'chemin utilisé : forme-parlee');
ok(lignes.every(l => l.experimental === false), 'drapeau expérimental : absent de ce build (JULABA_DYU_ARGENT non posé)');

// Une variable NON DÉCLARÉE d'un message d'argent est REFUSÉE et journalisée.
viderJournalArgent();
resoudreMessage('TATA_COMPTE_A_CHANGE', { suite: 'x', montantInconnu: 3000 } as never);
const refus = journalArgent().filter(l => l.variable === 'montantInconnu');
ok(refus.length === 0, 'une variable absente du gabarit ne produit rien (elle n\'est pas interpolée)');

console.log(echecs === 0
  ? '\nLes dix cas d\'argent sont verts. Le nombre part à la voix sous sa forme parlée. ✅\n'
  : `\n${echecs} échec(s) ❌\n`);
if (echecs > 0) process.exit(1);
