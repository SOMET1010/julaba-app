/**
 * CAT-01 — CE QU'ELLE VEND EST DANS SON CATALOGUE, PAS DANS NOTRE LISTE.
 *
 * LE DÉFAUT, mesuré sur l'APK `0459dc0`. Le moteur d'extraction porte son
 * propre lexique en dur : 50 formes, 28 noms canoniques. Le catalogue maître
 * du pilote en compte 198. En disant le nom EXACT de chacun de ses produits :
 *
 *     le bon produit part au panier :   1 / 198
 *     « Je n'ai pas compris » :       111 / 198
 *     prix redemandé :                 86 / 198
 *
 * Lancer : npm run test:vente-au-catalogue
 */
import { readFileSync } from 'node:fs';
import { lireVenteAuCatalogue } from './venteAuCatalogue.js';
import { libelleVenteComprise } from './ecouteCaisse.js';
import { apparierProduit } from './venteVocale.js';
import { intentLocalCaisse } from '../voice-offline/localIntent.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

console.log('\nCAT-01 — la caisse relit la phrase contre SON catalogue\n');

/** Un étal de vivrier, pris tel quel dans le catalogue maître du pilote. */
const ETAL = [
  { id: '1', nom: 'Arachide grillée' },
  { id: '2', nom: 'Taro' },
  { id: '3', nom: 'Poivron rouge' },
  { id: '4', nom: 'Poivron vert' },
  { id: '5', nom: 'Riz parfumé' },
  { id: '6', nom: 'Riz local blanc' },
  { id: '7', nom: 'Tomate locale ronde' },
];

console.log('[1] Les produits que le lexique du moteur ignore');
{
  ok(intentLocalCaisse('deux arachides grillées') === null,
     'le moteur ne connaît pas « arachide » — c\'est le point de départ');
  const v = lireVenteAuCatalogue('vends deux arachides grillées', ETAL);
  ok(v?.produit === 'Arachide grillée', `son nom à elle, pas un canonique : ${JSON.stringify(v?.produit)}`);
  ok(v?.quantite === 2, `et deux, pas un : ${v?.quantite}`);
  ok(v?.montant === undefined, 'aucun montant inventé — le prix viendra de son catalogue');
  ok(apparierProduit(String(v?.produit), ETAL)?.id === '1', 'et il s\'apparie exactement à SON produit');
}

console.log('\n[2] LE NOMBRE ORPHELIN EST UNE QUANTITÉ, PAS UN PRIX — défaut d\'argent');
{
  // Sans produit reconnu, `extraire` range le nombre en MONTANT : une ligne
  // « Produit vocal » à 2 F partait au panier, en silence.
  const moteur = intentLocalCaisse('vends deux arachides grillées');
  ok(moteur?.action?.type === 'vendre' && moteur.action.montant === 2 && !moteur.action.produit,
     `le moteur lisait « deux » comme 2 francs : ${JSON.stringify(moteur?.action)}`);
  const v = lireVenteAuCatalogue('vends deux arachides grillées', ETAL);
  ok(v?.quantite === 2 && v?.montant === undefined,
     'la relecture rend « deux » à la quantité, et n\'annonce aucun prix');
}
{
  // Un VRAI prix arrive derrière un marqueur : il ne doit pas être confondu.
  const v = lireVenteAuCatalogue('vends cinq poivrons rouges à 200', ETAL);
  ok(v?.produit === 'Poivron rouge' && v?.quantite === 5 && v?.montant === 200,
     `« à 200 » reste un prix : ${JSON.stringify(v)}`);
}
{
  const v = lireVenteAuCatalogue('vends arachide grillée cinq mille', ETAL);
  ok(v === null, 'un nombre seul trop grand pour être une quantité : on ne devine pas, on se tait');
}

console.log('\n[3] LE PLUS PRÉCIS GAGNE, et le doute ne gagne jamais');
{
  const v = lireVenteAuCatalogue('vends trois riz parfumé', ETAL);
  ok(v?.produit === 'Riz parfumé',
     `« riz parfumé » l'emporte sur le « riz » du lexique : ${JSON.stringify(v?.produit)}`);
  ok(apparierProduit('riz', ETAL) === null,
     'alors que le mot « riz » seul ne désigne aucun de ses deux riz — c\'est tout le défaut');
}
{
  ok(lireVenteAuCatalogue('vends deux poivrons', ETAL) === null,
     'deux poivrons de son catalogue, aucun nommé en entier : rien ne part');
}

console.log('\n[4] CE QUI N\'EST PAS UNE VENTE N\'EN DEVIENT PAS UNE');
{
  ok(lireVenteAuCatalogue('j\'ai acheté deux taro', ETAL) === null,
     'une dépense reste une dépense — sinon on inverserait le sens de son argent');
  ok(lireVenteAuCatalogue('annule deux taro', ETAL) === null,
     'un refus qui nomme ce qu\'il refuse n\'est pas une vente');
  ok(lireVenteAuCatalogue('taro', ETAL) === null,
     'un nom dit tout seul, sans verbe ni quantité, n\'est pas une vente');
  ok(lireVenteAuCatalogue('bonjour tata', ETAL) === null, 'et une salutation encore moins');
  ok(lireVenteAuCatalogue('vends deux taro', []) === null, 'sans catalogue, aucune lecture');
  ok(lireVenteAuCatalogue('', ETAL) === null, 'ni sur le vide');
}

console.log('\n[5] LA MESURE, SUR LES 198 PRODUITS DU CATALOGUE MAÎTRE');
{
  const url = new URL('../../../../docs/data/catalogue-maitre-julaba.v1.json', import.meta.url);
  const maitre = JSON.parse(readFileSync(url, 'utf8')) as { produits: Array<{ nom: string }> };
  const boutique = maitre.produits.map((p, i) => ({ id: `p${i}`, nom: p.nom }));
  ok(boutique.length === 198, `le catalogue maître porte bien 198 produits : ${boutique.length}`);

  let bon = 0, faux = 0, rien = 0, redemande = 0, sansBandeau = 0;
  const exFaux: string[] = [];
  for (const prod of boutique) {
    const texte = `vends deux ${prod.nom.toLowerCase()}`;
    const local = intentLocalCaisse(texte);
    if (local && local.action?.type !== 'vendre') continue;
    const vente = lireVenteAuCatalogue(texte, boutique) ?? (local?.action?.type === 'vendre' ? local.action : null);
    if (!libelleVenteComprise(vente)) sansBandeau++;
    if (!vente?.produit) { rien++; continue; }
    const m = apparierProduit(String(vente.produit), boutique);
    if (!m) { redemande++; continue; }
    if (m.nom === prod.nom) bon++;
    else { faux++; if (exFaux.length < 5) exFaux.push(`${prod.nom} → ${m.nom}`); }
  }
  console.log(`      bon produit ${bon}/198 · mauvais ${faux}/198 · prix redemandé ${redemande}/198 · rien ${rien}/198`);
  ok(faux === 0, `AUCUN produit vendu à la place d'un autre${exFaux.length ? ' — ' + exFaux.join(' ; ') : ''}`);
  ok(rien === 0, 'plus aucun « Je n\'ai pas compris » sur un produit de son catalogue');
  ok(sansBandeau === 0, 'et le bandeau « J\'ai compris : … » a toujours quelque chose à montrer');
  ok(bon >= 196, `le bon produit part au panier ${bon}/198 (était 1/198 sur 0459dc0)`);
  // Les deux qui restent sont un DOUBLON du catalogue maître (« Champignon
  // séché » y figure deux fois) : `apparierProduit` refuse de choisir, et il a
  // raison. C'est une donnée à corriger, pas un code.
  ok(redemande <= 2, `au plus deux produits redemandent le prix (doublon du catalogue) : ${redemande}`);
}

console.log('\n[6] LA PREUVE TRAVERSE — l\'écran relit bien SON catalogue');
{
  const src = readFileSync(new URL('../components/marchand/MicroVenteCaisse.tsx', import.meta.url), 'utf8');
  ok(/lireVenteAuCatalogue\((?:texte|\(transcript)/.test(src),
     'l\'écran appelle la relecture au catalogue');
  ok((src.match(/lireVenteAuCatalogue\(/g) ?? []).length >= 2,
     'des DEUX côtés : ce qui s\'affiche, et ce qui part au panier — sinon le bandeau promettrait une vente qui n\'arrive pas');
  ok(/lireVenteAuCatalogue\(texte, products\) \?\? \(local\?\.action\?\.type === 'vendre'/.test(src),
     'le catalogue passe AVANT le lexique du moteur, et le moteur reste le repli');
  ok(/if \(local && local\.action\?\.type !== 'vendre'\) return;/.test(src),
     'une intention qui n\'est pas une vente n\'est jamais relue en vente');
}

console.log(`\n${echecs === 0 ? '✓ CAT-01 : aucun échec' : `✗ CAT-01 : ${echecs} échec(s)`}\n`);
process.exit(echecs === 0 ? 0 : 1);
