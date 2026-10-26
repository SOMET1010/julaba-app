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

if (failures) {
  console.error(`\n${failures} échec(s)`);
  process.exit(1);
}
console.log('\nCommandes de la confirmation : tous verts.');
