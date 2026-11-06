/**
 * LA GRAMMAIRE DE L'ACCUEIL QUI ÉCOUTE — deux portes dites à voix haute.
 * Lancer : npm run test:commandes-accueil
 *
 * L'ordre de Patrick (06/11) : ouvrir la caisse doit se faire par la voix, et
 * l'ajout d'un produit doit se lancer depuis l'accueil en parlant. Ces gardes
 * figent CE que l'oreille de l'accueil comprend, AVANT qu'elle n'existe dans
 * l'écran — la grammaire est prouvée pure, sans micro ni React.
 *
 * LES PIÈGES QU'ELLE GARDE FERMÉS :
 *   1. le refus déclaré gagne sur tout (« ouvre pas la caisse » ne fait RIEN) ;
 *   2. « la caisse est pleine », « combien dans ma caisse » ne naviguent pas —
 *      le mot caisse seul n'ouvre rien, il faut le VERBE ouvrir ;
 *   3. « ajoute des tomates » ne navigue pas — « ajoute » seul est un mot du
 *      stock (MOTS_PAS_UNE_VENTE), il faut le nom produit/article ;
 *   4. une phrase du marché (« le sac de riz est ouvert ») → null.
 */
import { intentionAccueil } from './commandesAccueil.js';

let failures = 0;
const eq = (obtenu: unknown, attendu: unknown, label: string, detail = '') => {
  if (obtenu === attendu) console.log('  ✅', label);
  else { console.log('  ❌', label, `\n     attendu: ${String(attendu)} — obtenu: ${String(obtenu)} ${detail}`); failures++; }
};

console.log('\n[1] LA PORTE DE LA CAISSE — le verbe et le nom ensemble');
for (const phrase of ['ouvre la caisse', 'ouvrir la caisse', 'ouvre ma caisse', 'ouvrir ma caisse',
                      'ouvre ta caisse', 'je veux ouvrir ma caisse', 'on ouvre la caisse',
                      'ouvre la journée', 'ouvrir ma journée', 'ouvre ma journee']) {
  eq(intentionAccueil(phrase), 'ouvrir_caisse', `« ${phrase} » → ouvrir_caisse`,
     `obtenu: ${String(intentionAccueil(phrase))}`);
}

console.log('\n[2] LA PORTE DU PRODUIT — le verbe d\u2019ajout et le nom ensemble');
for (const phrase of ['ajoute un produit', 'ajouter un produit', 'je veux ajouter un produit',
                      'ajoute un article', 'ajouter un article', 'pose un produit',
                      'ajouter un nouveau produit', 'nouveau produit', 'nouvelle article',
                      'rajoute un produit']) {
  eq(intentionAccueil(phrase), 'ajouter_produit', `« ${phrase} » → ajouter_produit`,
     `obtenu: ${String(intentionAccueil(phrase))}`);
}

console.log('\n[3] LE REFUS GAGNE TOUJOURS — même fil que « c\u2019est pas mon numéro »');
for (const phrase of ['ouvre pas la caisse', "n'ouvre pas la caisse", 'n ouvre pas la caisse',
                      'ne ouvre pas la caisse', 'n ouvre jamais la caisse',
                      'annule, ouvre la caisse', 'attends, ajoute un produit',
                      'pas maintenant, ouvre la caisse']) {
  eq(intentionAccueil(phrase), null, `« ${phrase} » → null (le refus d\u2019abord)`,
     `obtenu: ${String(intentionAccueil(phrase))}`);
}

console.log('\n[4] LES PHRASES DU MARCHÉ NE NAVIGUENT PAS — le doute rend null');
for (const phrase of ['', '   ', 'la caisse est pleine', 'combien dans ma caisse',
                      'ma caisse aujourd hui', 'ajoute des tomates', 'ajoute du stock',
                      'produit', 'caisse', 'ouvre', 'ajoute', 'le sac est ouvert',
                      'hein', 'bon alors', 'zéro sept zéro zéro']) {
  eq(intentionAccueil(phrase), null, `« ${phrase} » → null`,
     `obtenu: ${String(intentionAccueil(phrase))}`);
}

console.log('\n[5] LES ACCENTS ET LA PONCTUATION NE COMPTENT PAS');
eq(intentionAccueil('Ouvre la caisse !'), 'ouvrir_caisse', '« Ouvre la caisse ! » → ouvrir_caisse');
eq(intentionAccueil('Ajoute un produit.'), 'ajouter_produit', '« Ajoute un produit. » → ajouter_produit');
eq(intentionAccueil('Ouvrir la journée…'), 'ouvrir_caisse', '« Ouvrir la journée… » → ouvrir_caisse');

if (failures) {
  console.error(`\n${failures} échec(s)`);
  process.exit(1);
}
console.log('\nCommandes de l\u2019accueil (caisse, produit) : tous verts.');
