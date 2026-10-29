/**
 * LA GRAMMAIRE DE LA CONFIRMATION VOCALE DU NUMÉRO — parcours voix seule.
 * Lancer : npm run test:commandes-entree
 *
 * L'audit remis par Patrick (26/10) ferme la boucle : « il n'existe pas
 * encore de reconnaissance de commandes vocales comme "oui", "c'est mon
 * numéro" ou "utiliser les chiffres" ». Ces gardes figent CE que l'écoute
 * comprend, AVANT qu'elle n'existe dans l'écran — la grammaire est prouvée
 * pure, sans micro ni React.
 *
 * LES TROIS PIÈGES QU'ELLE GARDE FERMÉS :
 *   1. « c'est pas mon numéro » contient « mon numéro » — le refus déclaré
 *      (testé d'abord) doit gagner, sinon on confirme le numéro qu'elle
 *      conteste ;
 *   2. « oui mais recommence » porte un oui ET un redit — le redit gagne ;
 *   3. une dictée parasite (« zéro sept… ») ne devient JAMAIS une commande.
 */
import { intentionConfirmationNumero } from './commandesEntree.js';

let failures = 0;
const eq = (obtenu: unknown, attendu: unknown, label: string, detail = '') => {
  if (obtenu === attendu) console.log('  ✅', label);
  else { console.log('  ❌', label, `\n     attendu: ${String(attendu)} — obtenu: ${String(obtenu)} ${detail}`); failures++; }
};

console.log('\n[1] LE OUI — les mots déclarés comme l\'explicitent');
for (const phrase of ['oui', 'ouais', "d'accord", 'ok', "c'est bon", "c'est ça", 'voilà', 'oui oui']) {
  eq(intentionConfirmationNumero(phrase), 'confirmer', `« ${phrase} » → confirmer`,
     `obtenu: ${String(intentionConfirmationNumero(phrase))}`);
}

console.log('\n[2] LE NOM DU BOUTON, DIT À VOIX HAUTE');
eq(intentionConfirmationNumero("c'est mon numéro"), 'confirmer', '« c\'est mon numéro » → confirmer');
eq(intentionConfirmationNumero('mon numéro'), 'confirmer', '« mon numéro » → confirmer');
eq(intentionConfirmationNumero('c\'est mon numéro oui'), 'confirmer', '« c\'est mon numéro oui » → confirmer');
eq(intentionConfirmationNumero('je confirme'), 'confirmer', '« je confirme » → confirmer');
eq(intentionConfirmationNumero('vas-y'), 'confirmer', '« vas-y » → confirmer');

console.log('\n[3] LE NON — le refus déclaré gagne TOUJOURS');
for (const phrase of ['non', 'non non', "c'est pas bon", 'pas ça']) {
  eq(intentionConfirmationNumero(phrase), 'redire', `« ${phrase} » → redire`,
     `obtenu: ${String(intentionConfirmationNumero(phrase))}`);
}

console.log('\n[3bis] LE PIÈGE DU NUMÉRO CONTESTÉ');
// « c'est pas mon numéro » contient « mon numéro » : le refus est testé
// d'abord, sinon on valide le numéro qu'elle refuse exactement.
eq(intentionConfirmationNumero("c'est pas mon numéro"), 'redire',
   '« c\'est pas mon numéro » → redire (jamais confirmer)',
   `obtenu: ${String(intentionConfirmationNumero("c'est pas mon numéro"))}`);
eq(intentionConfirmationNumero('non, c\'est pas mon numéro'), 'redire',
   '« non, c\'est pas mon numéro » → redire');

console.log('\n[4] LE REDIT EXPLICITE, AVANT TOUT OUI');
for (const phrase of ['recommence', 'recommencer', 'refais', 'redis', 'redire', 'encore une fois']) {
  eq(intentionConfirmationNumero(phrase), 'redire', `« ${phrase} » → redire`,
     `obtenu: ${String(intentionConfirmationNumero(phrase))}`);
}
eq(intentionConfirmationNumero('oui mais recommence'), 'redire',
   '« oui mais recommence » → redire (le redit gagne sur le oui)',
   `obtenu: ${String(intentionConfirmationNumero('oui mais recommence'))}`);

console.log('\n[5] LE PAVÉ NOMMÉ — « utiliser les chiffres » de l\'audit');
for (const phrase of ['utiliser les chiffres', 'les chiffres', 'le clavier', 'je veux taper']) {
  eq(intentionConfirmationNumero(phrase), 'clavier', `« ${phrase} » → clavier`,
     `obtenu: ${String(intentionConfirmationNumero(phrase))}`);
}

console.log('\n[6] RIEN D\'INVENTÉ — le doute rend null, l\'écoute continue');
for (const phrase of ['', '   ', 'zéro sept zéro zéro', 'ça fait combien', 'attends',
                      'septante', 'hein', 'bon alors']) {
  eq(intentionConfirmationNumero(phrase), null, `« ${phrase} » → null`,
     `obtenu: ${String(intentionConfirmationNumero(phrase))}`);
}

console.log('\n[7] LES ACCENTS ET LA PONCTUATION NE COMPTENT PAS');
eq(intentionConfirmationNumero('Oui !'), 'confirmer', '« Oui ! » → confirmer');
eq(intentionConfirmationNumero("C'est bon."), 'confirmer', "« C'est bon. » → confirmer");
eq(intentionConfirmationNumero('C\'est mon numéro…'), 'confirmer', '« C\'est mon numéro… » → confirmer');

// ──────────────────────────────────────────────────────────────────────────
// SECOND VOLET DE L'AUDIT (26/10) : L'ENTRÉE S'ÉCOUTE. L'accueil et la
// présentation se commandent à la voix (« entrer »), la proposition de
// reconnaissance s'entend répondre (« oui » / « non »). Ces gardes figent CE
// que les deux nouvelles oreilles comprennent — mêmes pièges, mêmes doctrines.
// ──────────────────────────────────────────────────────────────────────────

import { intentionEntree, intentionOuiNon } from './commandesEntree.js';

console.log('\n[8] L\'ENTRÉE SE COMMANDE — « entrer » de l\'audit (écrans 1 et 2)');
for (const phrase of ['entrer', 'entre', 'commencer', 'commence', 'continuer', 'continue',
                      'avancer', 'on y va', "c'est parti", "d'accord", 'ok']) {
  eq(intentionEntree(phrase), 'entrer', `« ${phrase} » → entrer`,
     `obtenu: ${String(intentionEntree(phrase))}`);
}

console.log('\n[9] LE OUI DÉCLARÉ OUVRE AUSSI — même acquiescement que le numéro');
for (const phrase of ['oui', 'ouais', "c'est bon", 'voilà']) {
  eq(intentionEntree(phrase), 'entrer', `« ${phrase} » → entrer`,
     `obtenu: ${String(intentionEntree(phrase))}`);
}

console.log('\n[10] « RÉPÈTE » REJOUE — et gagne sur le oui (« non, répète »)');
for (const phrase of ['répète', 'repète', 'réécouter', 'rejoue', 'encore', 'redis', 'recommence',
                      'oui mais répète', 'non, répète']) {
  eq(intentionEntree(phrase), 'repeter', `« ${phrase} » → repeter`,
     `obtenu: ${String(intentionEntree(phrase))}`);
}

console.log('\n[11] LE DOUTE N\'AVANCE JAMAIS — le marché ne déclenche pas la porte');
for (const phrase of ['', '   ', 'non', 'pas encore', 'attends', 'hein', 'bon alors',
                      'ça fait combien', 'zéro sept zéro zéro']) {
  eq(intentionEntree(phrase), null, `« ${phrase} » → null`,
     `obtenu: ${String(intentionEntree(phrase))}`);
}
// « PAS ENCORE » NE REJOUE PAS — le refus déclaré gagne sur le « encore »
// qu'il contient (même piège que « c'est pas mon numéro » au lot A).

console.log('\n[12] LA PROPOSITION S\'ENTEND RÉPONDRE — oui clair, non clair');
for (const phrase of ['oui', 'ouais', "d'accord", "c'est bon"]) {
  eq(intentionOuiNon(phrase), 'oui', `« ${phrase} » → oui`,
     `obtenu: ${String(intentionOuiNon(phrase))}`);
}
for (const phrase of ['non', 'non merci', 'jamais', 'pas maintenant', 'pas besoin',
                      'pas envie', 'annule', 'arrête', "c'est pas bon",
                      'oui mais pas maintenant', 'oui enfin non']) {
  eq(intentionOuiNon(phrase), 'non', `« ${phrase} » → non`,
     `obtenu: ${String(intentionOuiNon(phrase))}`);
}

console.log('\n[13] LE DOUTE NE PROFITE NI AU OUI NI AU NON — le pire des deux serait un refus mémorisé');
for (const phrase of ['', '   ', 'hein', 'bon alors', 'peut-être', 'on verra']) {
  eq(intentionOuiNon(phrase), null, `« ${phrase} » → null`,
     `obtenu: ${String(intentionOuiNon(phrase))}`);
}
// LE REFUS DÉCLARÉ GAGNE SUR LE OUI QU'IL CONTIENT — même doctrine que
// « c'est pas mon numéro » → redire au lot A : « oui mais pas maintenant »
// et « oui enfin non » portent un refus explicite (l'acquiescement déclaré
// le voit d'abord) → NON. On n'enrôle pas quelqu'un qui nuance.

if (failures) {
  console.error(`\n${failures} échec(s)`);
  process.exit(1);
}
console.log('\nCommandes de la confirmation, de l\'entrée et oui/non : tous verts.');
