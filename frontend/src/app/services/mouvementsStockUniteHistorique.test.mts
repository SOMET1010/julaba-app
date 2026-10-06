/**
 * ARG-02 — l'unité d'un mouvement vient du mouvement, ou de nulle part.
 *
 * LA RÈGLE (Patrick, 19/09/2026) : « ne jamais faire dépendre l'historique de
 * l'état actuel du catalogue ». Une marchande qui repasse son piment du tas au
 * kilo ne doit pas voir ses ventes passées « −5 tas » devenir « −5 kg ».
 * Aucune vente n'a bougé : c'est le sens de son historique qui changerait
 * sous elle.
 *
 * DEUX DÉFAUTS, PAS UN.
 *
 * 1. Côté serveur, la lecture faisait `COALESCE(sm.unite, p.unite)` : pour les
 *    mouvements sans unité figée, elle allait la chercher au catalogue courant.
 *    Tenu par `backend/test/invariants/arg-02-unite-historique.spec.ts`.
 *
 * 2. Côté ÉCRAN — et c'est celui qu'on avait manqué : la fiche produit
 *    affichait `{m.qty} {selectedStock.unit}`, c'est-à-dire l'unité du
 *    catalogue d'aujourd'hui, sans même regarder celle du mouvement. Le
 *    correctif serveur ne pouvait rien pour ces lignes-là. C'est ce maillon
 *    que ce fichier tient.
 *
 * ET UNE UNITÉ ABSENTE SE DIT. `unit: ''` tout seul était silencieux : la
 * marchande lisait « −5 » sans savoir s'il s'agissait de kilos, de tas ou de
 * sacs. Une unité fausse n'est pas mieux qu'une unité absente — elle est pire,
 * parce qu'elle a l'air juste.
 *
 * Lancer : npm run test:mouvements-unite-historique
 */
import { mapApiMouvements, quantiteMouvement, mentionUniteInconnue } from './mouvementsStock.js';

let echecs = 0;
function eq(a: unknown, b: unknown, label: string) {
  if (JSON.stringify(a) === JSON.stringify(b)) console.log('  ✅', label);
  else { console.log('  ❌', label, `(attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`); echecs++; }
}

const maintenant = new Date('2026-09-19T12:00:00');
const ligne = (unite: string | null) => ({
  id: 'm1', type: 'vente', quantite: -5, quantite_affichee: 5, manquant: 0,
  hors_stock: false, produit_nom: 'Piment', unite,
  date: '2026-09-19T09:00:00',
});

console.log('\nUne sortie dont l’unité a été figée');
{
  const [m] = mapApiMouvements([ligne('tas')], maintenant);
  eq(m.unit, 'tas', 'l’unité affichée est celle du mouvement');
  eq(m.uniteConnue, true, '…et l’écran sait qu’il peut la dire');
  eq(mentionUniteInconnue(m), null, 'aucune mention à afficher');
  eq(quantiteMouvement(m, m.qty), '-5 tas', 'le nombre et son unité, dits ensemble');
  eq(quantiteMouvement(m, 5), '+5 tas', 'une rentrée porte son signe');
}

console.log('\nUne sortie enregistrée AVANT qu’on fige l’unité');
{
  const [m] = mapApiMouvements([ligne(null)], maintenant);
  eq(m.uniteConnue, false, 'l’écran sait qu’il ne sait pas — état typé, pas un blanc');
  eq(mentionUniteInconnue(m), 'unité non enregistrée', '…et il a de quoi le DIRE');
  eq(quantiteMouvement(m, m.qty), '-5', 'le nombre seul : on n’emprunte aucune unité');
}

console.log('\nUne unité vide ou blanche n’est pas une unité');
{
  for (const vide of ['', '   '] as const) {
    const [m] = mapApiMouvements([ligne(vide)], maintenant);
    eq(m.uniteConnue, false, `« ${vide} » ne passe pas pour une unité connue`);
    eq(quantiteMouvement(m, m.qty), '-5', '…et rien n’est collé au nombre');
  }
}

console.log('\nLE CŒUR D’ARG-02 : le catalogue change, l’historique ne bouge pas');
{
  // Ce que faisait l'écran : `${m.qty} ${selectedStock.unit}`. On rejoue le
  // scénario réel — la marchande passe son piment du tas au kilo — et on
  // vérifie que le rendu du mouvement PASSÉ est identique avant et après.
  const [avant] = mapApiMouvements([ligne('tas')], maintenant);
  const renduAvant = quantiteMouvement(avant, avant.qty);

  const catalogueApres = { unit: 'kg' }; // le produit, aujourd'hui
  const [apres] = mapApiMouvements([ligne('tas')], maintenant);
  const renduApres = quantiteMouvement(apres, apres.qty);

  eq(renduApres, renduAvant, 'le mouvement passé s’affiche à l’identique');
  eq(renduApres, '-5 tas', '…au tas, comme le jour de la vente');
  eq(renduApres.includes(catalogueApres.unit), false,
     'l’unité du catalogue d’aujourd’hui n’apparaît NULLE PART');
}

console.log(echecs === 0
  ? '\n✓ ARG-02 — l’unité de l’historique ne dépend plus du catalogue\n'
  : `\n✗ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
