/**
 * ARGENT-3 — une vente hors stock se voit, et se dit.
 *
 * Dette B3, fermée sur instruction de Patrick (19/09/2026) : « on ne part pas
 * au terrain avec des dettes connues et atteignables sous prétexte qu'elles
 * sont documentées ».
 *
 * LE DÉFAUT : le backend filtrait `AND sm.quantite_retranchee <> 0`. Une vente
 * faite sur un stock à zéro — le cas NORMAL, puisque le stock ne bloque jamais
 * une vente et qu'un article adopté démarre à zéro — n'apparaissait nulle part.
 * Son stock restait à zéro, aucune sortie ne s'affichait, et rien ne lui
 * apprenait ce qu'elle avait réellement écoulé. C'est sur ce panneau qu'elle
 * décide ses réapprovisionnements.
 *
 * Le maillon serveur est tenu par `backend/test/invariants/argent-3-*.spec.ts`.
 * Ici : le maillon écran.
 *
 * Lancer : npm run test:mouvements-hors-stock
 */
import { mapApiMouvements } from './mouvementsStock.js';

let echecs = 0;
function eq(a: unknown, b: unknown, label: string) {
  if (JSON.stringify(a) === JSON.stringify(b)) console.log('  ✅', label);
  else { console.log('  ❌', label, `(attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`); echecs++; }
}

const maintenant = new Date('2026-09-19T12:00:00');

console.log('\nUne vente hors stock');
{
  const [m] = mapApiMouvements([{
    id: 'x', type: 'vente', quantite: 0, quantite_affichee: 4, manquant: 4,
    hors_stock: true, produit_nom: 'Igname', unite: 'kg',
    date: '2026-09-19T09:00:00',
  }], maintenant);
  eq(m.qtyAffichee, 4, 'le nombre montré est ce qui est SORTI (4), pas le delta de stock (0)');
  eq(m.horsStock, true, '…et l’écran sait qu’il doit dire « hors stock »');
  eq(m.unit, 'kg', 'l’unité vient du mouvement');
}

console.log('\nUne vente couverte par le stock — rien ne change pour elle');
{
  const [m] = mapApiMouvements([{
    id: 'y', type: 'vente', quantite: -3, quantite_affichee: 3, manquant: 0,
    hors_stock: false, produit_nom: 'Tomate', unite: 'kg',
    date: '2026-09-19T09:00:00',
  }], maintenant);
  eq(m.qtyAffichee, 3, 'trois kilos sortis, trois affichés');
  eq(m.horsStock, false, 'aucune mention « hors stock »');
  eq(m.qty < 0, true, 'le signe reste négatif : c’est lui qui porte la couleur et la flèche');
}

console.log('\nUne annulation rend ce qui avait été pris');
{
  const [m] = mapApiMouvements([{
    id: 'z', type: 'annulation', quantite: 5, quantite_affichee: 5, manquant: 0,
    hors_stock: false, produit_nom: 'Piment', unite: 'tas',
    date: '2026-09-18T09:00:00',
  }], maintenant);
  eq(m.qty > 0, true, 'le signe est positif : c’est rentré');
  eq(m.qtyAffichee, 5, 'cinq tas rendus');
  eq(m.unit, 'tas', 'dans l’unité où ils avaient été pris — B2');
}

console.log('\nRéponse d’un backend antérieur : on ne fabrique pas un zéro');
{
  const [m] = mapApiMouvements([{
    id: 'w', type: 'vente', quantite: -2, produit_nom: 'Gombo', unite: 'tas',
    date: '2026-09-19T09:00:00',
  }], maintenant);
  eq(m.qtyAffichee, 2, 'sans les nouveaux champs : repli sur |quantite|, l’ancien affichage');
  eq(m.horsStock, false, 'et aucune mention inventée');
}

console.log(echecs === 0 ? '\n✓ vente hors stock — tous les cas passent' : `\n✗ ${echecs} échec(s)`);
process.exit(echecs === 0 ? 0 : 1);
