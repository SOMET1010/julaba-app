/**
 * CAI-06 — QUAND L'ÉTAL VIENT DU TÉLÉPHONE, L'ÉCRAN LE DIT.
 *
 * LE DÉFAUT. `etatCatalogueCaisse` distingue depuis CAI-01 cinq situations,
 * dont `memoire` : « le serveur n'a pas répondu, mais le téléphone se
 * souvient ». L'état était CALCULÉ et jamais MONTRÉ. `POSCaisse` ne lisait
 * `etatCatalogue` que dans la branche « liste vide » (`illisible`, `attente`) ;
 * dès qu'il y avait des produits à l'écran, la grille s'affichait telle quelle,
 * qu'ils viennent du serveur ou d'un souvenir vieux de trois jours.
 *
 * CE QUE ÇA COÛTE. Elle a retiré un produit hier soir, changé un prix ce matin
 * sur un autre téléphone : l'écran montre l'ancien état sans rien dire. Une
 * liste périmée présentée comme à jour, c'est la faute que ce dépôt combat
 * partout — une donnée dont on a perdu la fraîcheur et qui continue d'être
 * affirmée.
 *
 * CE QU'ON NE FAIT PAS : bloquer. Au marché, il n'y a pas de réseau — `memoire`
 * est la situation NORMALE, pas une panne. L'étal reste vendable, et le ton
 * reste factuel : on informe, on n'alarme pas.
 *
 * Lancer : npm run test:etal-garde
 */
import { readFileSync } from 'node:fs';
import { etatCatalogueCaisse, avertirEtalGarde } from './etatCatalogueCaisse.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};
const ECRAN = readFileSync(
  new URL('../components/marchand/POSCaisse.tsx', import.meta.url), 'utf-8');
const code = ECRAN.replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

console.log('\nL\'étal gardé sur le téléphone se présente pour ce qu\'il est\n');

console.log('[1] DONNÉES FRAÎCHES → AUCUN AVERTISSEMENT');
{
  const frais = etatCatalogueCaisse({ lecture: 'lu', nbProduits: 12, servisDepuisCache: false });
  ok(frais.type === 'liste', 'le serveur a répondu et il y a des produits');
  ok(avertirEtalGarde(frais) === false, 'rien à signaler : on ne met pas un bandeau pour rien');
  const vide = etatCatalogueCaisse({ lecture: 'lu', nbProduits: 0, servisDepuisCache: false });
  ok(avertirEtalGarde(vide) === false, 'ni sur un étal réellement vide');
}

console.log('\n[2] ÉTAL GARDÉ SUR LE TÉLÉPHONE → MESSAGE VISIBLE');
{
  const garde = etatCatalogueCaisse({ lecture: 'echec', nbProduits: 8, servisDepuisCache: true });
  ok(garde.type === 'memoire', 'le serveur n\'a pas répondu, le téléphone se souvient');
  ok(avertirEtalGarde(garde) === true, 'et l\'écran doit le dire');
  // Pendant la toute première lecture, on ne SAIT pas encore : on ne présente
  // donc pas ces produits comme à jour.
  const enCours = etatCatalogueCaisse({ lecture: 'chargement', nbProduits: 8, servisDepuisCache: true });
  ok(avertirEtalGarde(enCours) === true,
     'tant qu\'on ne sait pas, on ne laisse pas entendre « à jour »');
}

console.log('\n[3] ÉCHEC SANS MÉMOIRE → PAS DE FAUX CATALOGUE');
{
  const rien = etatCatalogueCaisse({ lecture: 'echec', nbProduits: 0, servisDepuisCache: false });
  ok(rien.type === 'illisible', 'rien lu, rien en réserve : on ne sait pas');
  ok(avertirEtalGarde(rien) === false,
     'et surtout pas de bandeau « derniers produits gardés » : il n\'y en a aucun');
  // CAI-01 tient toujours : « Aucun produit » reste réservé au serveur qui a répondu.
  ok(/etatCatalogue\.type === 'illisible'/.test(code),
     'l\'écran garde sa phrase propre pour « je n\'ai pas pu lire »');
}

console.log('\n[4] LA VENTE RESTE POSSIBLE AVEC L\'ÉTAL GARDÉ');
{
  // Le bandeau informe, il n'empêche pas. Au marché il n'y a pas de réseau :
  // `memoire` est la situation NORMALE. Un bandeau qui bloquerait fermerait la
  // caisse tous les jours.
  ok(!/avertirEtalGarde\([^)]*\)\s*\?\s*null\s*:/.test(code),
     'le bandeau ne remplace jamais la grille des produits');
  // BORNÉ AU BLOC DE RENDU. Chercher `avertirEtalGarde` n'importe où dans le
  // fichier attrapait l'IMPORT : le test passait avec le bandeau débranché.
  // C'est la cinquième fois de la session — le contre-essai est le seul juge.
  const rendu = /\{avertirEtalGarde\(etatCatalogue\) && \([\s\S]{0,900}?t\('CAISSE_ETAL_GARDE'\)/;
  ok(rendu.test(code), 'le bandeau est bel et bien RENDU quand la règle le demande');
  const grille = code.indexOf('filtered.map');
  const bandeau = code.search(rendu);
  ok(bandeau >= 0 && grille >= 0 && bandeau < grille,
     'il se pose AU-DESSUS de la grille, qui reste entière et touchable');
}

console.log('\n[5] LES MOTS SONT CEUX DU MARCHÉ, ET ILS VIENNENT DU CATALOGUE');
{
  const CATALOGUE = readFileSync(
    new URL('../i18n/voice/catalog.ts', import.meta.url), 'utf-8');
  ok(/CAISSE_ETAL_GARDE/.test(CATALOGUE), 'la phrase vit dans le catalogue i18n');
  ok(/CAISSE_ETAL_GARDE/.test(code), 'et l\'écran la lit par sa clé, sans la réécrire');
  const ligne = CATALOGUE.split('\n').find(l => l.includes('CAISSE_ETAL_GARDE')) ?? '';
  for (const jargon of ['cache', 'synchronis', 'serveur', 'réseau', 'hors ligne', 'hors-ligne']) {
    ok(!new RegExp(jargon, 'i').test(ligne.split('frActuel:')[1]?.split(',')[0] ?? ''),
       `la phrase ne dit pas « ${jargon} » — ce n'est pas un mot de marchande`);
  }
  ok(/téléphone/i.test(ligne), 'elle parle de SON téléphone, l\'objet qu\'elle tient');
}

console.log(echecs === 0
  ? '\n✅ Un étal gardé se présente pour ce qu\'il est — et il se vend quand même.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
