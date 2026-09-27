/**
 * A1 — « LA BOÎTE ME DIT ZÉRO FRANC » PENDANT QUE L'ÉCRAN AFFICHE 3 150 F.
 *
 * LE DÉFAUT TERRAIN, APK `0459dc0`, capture de Patrick. Il ouvre
 * l'application : la voix annonce zéro franc, l'écran affiche 3 150 F. Puis,
 * ses mots : « Quand j'appuie à nouveau sur le haut-parleur pour rejouer, il
 * me donne le bon montant. »
 *
 * CE N'EST PAS LA VALEUR QUI EST FAUSSE, C'EST L'INSTANT. L'écran et la voix
 * lisent la MÊME source (`etatCaisse.montant`) et la clé est saine
 * (`ACCUEIL_CAISSE_CONNUE { caisse: 3150 }` → « trois mille cent cinquante
 * francs »). Mais au montage, la lecture du serveur n'a pas fini : la session
 * du jour est déjà connue (donc `aDesDonnees` est vrai) tandis que les
 * transactions n'ont pas encore été reçues, et `getTodayStats` rend 0.
 *
 * `etatCaisseAccueil` rend alors `partielle` avec un montant de 0 — et
 * l'annonce du montage ne s'abstient que sur `attente`. Pire :
 * `ditAuMontage` passe à vrai, donc la voix NE SE CORRIGE JAMAIS. L'écran, lui,
 * se corrige tout seul au rendu suivant. C'est tout l'écart que Patrick voit.
 *
 * LA FAUTE DE FOND : `partielle` a DEUX SENS. « un plancher réel, connu »
 * (lecture d'avant la panne, ventes encore sur le téléphone) et « on est en
 * train de charger ». L'écran a le droit d'afficher les deux pareil — il se
 * rafraîchira. La voix, non : ce qu'elle a dit est dit.
 * Ne jamais donner deux sens à la même donnée.
 *
 * CE QUE CE TEST INTERDIT AUSSI, et qui serait la correction paresseuse :
 * se taire quand le montant vaut zéro. Un vrai zéro est une réponse — elle
 * n'a rien vendu et elle a le droit de l'entendre. Le discriminant est l'état
 * de la LECTURE, jamais le montant.
 *
 * Lancer : npm run test:accueil-caisse-dite
 */
import { readFileSync } from 'node:fs';
import { etatCaisseAccueil, caisseDigneDEtreDite } from './etatCaisseAccueil.js';
import type { FaitsCaisseAccueil } from './etatCaisseAccueil.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

console.log('\nA1 — la voix de l\'accueil ne parle pas avant d\'avoir lu (terrain 0459dc0)\n');

/** L'instant du montage, tel qu'il se produit sur le téléphone de Patrick. */
const AU_MONTAGE: FaitsCaisseAccueil = {
  lecture: 'chargement',
  montant: 0,          // getTodayStats n'a pas encore les transactions
  aDesDonnees: true,   // mais la session du jour, elle, est déjà connue
  ventesEnFile: 0,
};
/** Le même écran, une fraction de seconde plus tard. */
const APRES_LECTURE: FaitsCaisseAccueil = {
  lecture: 'lu', montant: 3150, aDesDonnees: true, ventesEnFile: 0,
};

console.log('[1] L\'instant du montage');
{
  const e = etatCaisseAccueil(AU_MONTAGE);
  ok(e.type === 'partielle', `l'état est « ${e.type} » — donc pas « attente », donc la voix parlait`);
  ok(e.type === 'partielle' && e.montant === 0, 'avec un montant de zéro, qui n\'est pas sa caisse');
  ok(caisseDigneDEtreDite(e) === false,
     'ET LA VOIX DOIT S\'ABSTENIR : la lecture n\'est pas finie, ce zéro ne veut rien dire');
}

console.log('\n[2] Une fraction de seconde plus tard');
{
  const e = etatCaisseAccueil(APRES_LECTURE);
  ok(e.type === 'connue' && e.montant === 3150, `la caisse est connue : ${JSON.stringify(e)}`);
  ok(caisseDigneDEtreDite(e) === true, 'et là, elle le dit — c\'est le montant que l\'écran affiche');
}

console.log('\n[3] UN VRAI ZÉRO RESTE UNE RÉPONSE — on ne se tait pas sur le montant');
{
  const e = etatCaisseAccueil({ lecture: 'lu', montant: 0, aDesDonnees: true, ventesEnFile: 0 });
  ok(e.type === 'connue' && e.montant === 0, 'serveur répondu, rien vendu : la caisse EST à zéro');
  ok(caisseDigneDEtreDite(e) === true,
     'elle a le droit de l\'entendre — le discriminant est la LECTURE, pas le montant');
}

console.log('\n[4] Les autres états, un par un');
{
  const attente = etatCaisseAccueil({ lecture: 'jamais', montant: 0, aDesDonnees: false, ventesEnFile: 0 });
  ok(attente.type === 'attente' && caisseDigneDEtreDite(attente) === false,
     'rien lu, rien en mémoire : silence, comme avant');

  const illisible = etatCaisseAccueil({ lecture: 'echec', montant: Number.NaN, aDesDonnees: false, ventesEnFile: 0 });
  ok(illisible.type === 'illisible' && caisseDigneDEtreDite(illisible) === true,
     'lecture échouée : elle DOIT l\'entendre — se taire lui laisserait croire que tout va bien');

  // Un plancher RÉEL : la panne est survenue après qu'on a lu quelque chose.
  const planchePanne = etatCaisseAccueil({ lecture: 'echec', montant: 3150, aDesDonnees: true, ventesEnFile: 0 });
  ok(planchePanne.type === 'partielle' && caisseDigneDEtreDite(planchePanne) === true,
     '« au moins 3 150 F » après une panne : c\'est un chiffre réel, il se dit');

  // Un plancher RÉEL : des ventes dorment sur le téléphone.
  const plancherFile = etatCaisseAccueil({ lecture: 'lu', montant: 3150, aDesDonnees: true, ventesEnFile: 2 });
  ok(plancherFile.type === 'partielle' && caisseDigneDEtreDite(plancherFile) === true,
     '« au moins 3 150 F » avec deux ventes en file : réel aussi, il se dit');
}

console.log('\n[5] L\'ÉCRAN N\'A PAS CHANGÉ — on ne corrige pas ce qu\'elle voit');
{
  // La correction ne doit toucher QUE la parole. Le type rendu pour l'instant
  // du montage est le même qu'avant, avec le même montant : l'affichage se
  // corrigera tout seul au rendu suivant, comme il le faisait déjà.
  const e = etatCaisseAccueil(AU_MONTAGE);
  ok(e.type === 'partielle' && e.montant === 0,
     'au montage, l\'écran affiche toujours ce qu\'il affichait');
  const apres = etatCaisseAccueil(APRES_LECTURE);
  ok(apres.type === 'connue' && apres.montant === 3150, 'et se corrige tout seul ensuite');
}

console.log('\n[6] LA PREUVE TRAVERSE — l\'accueil s\'abstient ET ne se verrouille pas');
{
  const src = readFileSync(new URL('../components/marchand/MarchandAccueilVoice.tsx', import.meta.url), 'utf8');
  const i = src.indexOf('const [ditAuMontage');
  const effet = i >= 0 ? src.slice(i, src.indexOf('}, [', i) + 40) : '';
  ok(effet !== '', 'l\'effet d\'annonce au montage existe toujours');
  ok(/caisseDigneDEtreDite\(etatCaisse\)/.test(effet),
     'il demande à la règle pure s\'il a le droit de parler');
  ok(!/etatCaisse\.type === 'attente'/.test(effet),
     'et il ne juge plus lui-même sur le seul « attente » — la règle est le seul juge');
  // LE VERROU : si `setDitAuMontage(true)` est posé AVANT l'abstention, la
  // voix se tait pour toujours et on a remplacé un mensonge par un silence.
  const posVerrou = effet.indexOf('setDitAuMontage(true)');
  const posAbstention = effet.indexOf('caisseDigneDEtreDite');
  ok(posAbstention >= 0 && posVerrou > posAbstention,
     'le verrou « déjà dit » est posé APRÈS l\'abstention — sinon la voix ne se corrigerait jamais');
}

console.log(`\n${echecs === 0 ? '✓ A1 : aucun échec' : `✗ A1 : ${echecs} échec(s) — le défaut terrain est reproduit`}\n`);
process.exit(echecs === 0 ? 0 : 1);
