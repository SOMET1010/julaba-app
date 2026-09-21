/**
 * UNE VENTE DICTÉE SANS PRIX NE SE PERD PAS — défaut terrain du 21/09/2026.
 * Lancer : npm run test:vente-sans-prix   (tsx, sans DOM ni navigateur)
 *
 * CE QUI A ÉTÉ VU SUR UN VRAI TÉLÉPHONE (propriétaire du produit, catalogue
 * VIDE) : elle dicte « cinq tomates », le bandeau vert « J'ai compris : Cinq
 * tomates » s'affiche… et c'est TOUT. Aucune ligne, aucun prix demandé, aucun
 * mot. Ses mots : « je peux vendre un article sans prix il ne fais que ecrire
 * ce que jai dis 3 tomates et cest tout ».
 *
 * CE QUE CE TEST EXÉCUTE (il ne recopie aucune chaîne attendue) : le VRAI
 * chemin de la dictée, maillon par maillon —
 *   extraire → intentLocal → vendreVocalUnifie → ce qui arrive au panier.
 * Plus un garde-fou de SOURCE : la demande de prix doit être CÂBLÉE de la voix
 * (`MicroVenteCaisse`) vers le chemin d'adoption qui existe déjà dans la
 * caisse (`POSCaisse`) — celui qui demande « Quel est ton prix ? » puis met
 * l'article au catalogue ET au panier.
 *
 * LA RÈGLE QU'IL FIGE, et elle porte sur son argent :
 *   1. aucune ligne n'entre au panier sans montant — jamais 0 F en silence ;
 *   2. mais une vente comprise ne disparaît pas non plus : le prix est
 *      DEMANDÉ, l'écran s'ouvre PRÉ-REMPLI (nom et quantité dits) ;
 *   3. et aucun prix n'est inventé — ni dernier prix connu, ni moyenne.
 *
 * CE QU'IL NE PROUVE PAS : le rendu React réel ni le moteur STT. Le parcours
 * joué de bout en bout, lui, est au banc : `apercu-caisse/parcours.mjs`
 * (il exige Chromium, donc il reste hors de `verify`).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extraire } from '../../voice-offline/extraction.js';
import { intentLocal, intentLocalCaisse } from '../../voice-offline/localIntent.js';
import { vendreVocalUnifie, type DependancesVendreVocalUnifie, type ProduitPourPanier } from '../../services/vendreVocalUnifie.js';
import type { ProduitAppariable } from '../../services/venteVocale.js';

let echecs = 0;
const ok = (cond: boolean, quoi: string) => {
  if (cond) console.log('  ✅', quoi);
  else { console.log('  ❌', quoi); echecs++; }
};

/** Les sources voisines (rejouable sur un autre état du dépôt : passer le dossier en argument). */
const dossier = process.argv[2] ?? fileURLToPath(new URL('.', import.meta.url));
const sansCommentaires = (src: string) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const micro = sansCommentaires(readFileSync(join(dossier, 'MicroVenteCaisse.tsx'), 'utf8'));
const caisse = sansCommentaires(readFileSync(join(dossier, 'POSCaisse.tsx'), 'utf8'));

/** Journal des effets réels d'un appel — rien n'est simulé côté module testé. */
function creerDeps(products: ProduitAppariable[], guidage = true) {
  const panier: [ProduitPourPanier, number, number | undefined][] = [];
  const dits: string[] = [];
  const demandes: { nom: string; quantite: number; unite: string | null }[] = [];
  const deps: DependancesVendreVocalUnifie = {
    products,
    addToCart: (produit, quantite, totalExact) => { panier.push([produit, quantite, totalExact]); },
    speak: (t) => { dits.push(t); },
    vibrerSucces: () => {},
    notifierAjoutPanier: () => {},
    proposerCreationProduit: () => {},
    stockage: null,
    estEnLigne: () => false,
    planifier: () => {},
    guidageVocalActif: () => guidage,
    creerIdLigne: () => 'test-1',
    demanderPrix: (d) => { demandes.push({ nom: d.nom, quantite: d.quantite, unite: d.unite }); },
  };
  return { deps, panier, dits, demandes };
}

/** Le vrai parcours, de la transcription au panier. */
function dicter(phrase: string, products: ProduitAppariable[], guidage = true) {
  const p = extraire(phrase);
  const local = intentLocalCaisse(phrase);
  const j = creerDeps(products, guidage);
  if (local?.action?.type === 'vendre') {
    const brut = Number(local.action.montant);
    const montant = Number.isFinite(brut) && brut > 0 ? brut : 0;
    // `p.lecturePrix` : ce que la GRAMMAIRE a entendu du montant (« à » →
    // unitaire, « pour » → le lot). Ce harnais s'annonce comme « le vrai
    // parcours » ; l'oublier ici le ferait diverger de MicroVenteCaisse, qui
    // le transmet — et un harnais qui ne rejoue plus le vrai chemin ne prouve
    // plus rien de ce chemin.
    vendreVocalUnifie(local.action.produit, local.action.quantite || 1, montant, j.deps, p.uniteParlee, p.lecturePrix);
  }
  return { extraction: p, local, ...j };
}

// Le catalogue du compte de terrain : VIDE (« Produits : Aucun produit »).
const CATALOGUE_VIDE: ProduitAppariable[] = [];
// Produit connu MAIS sans prix de vente — l'autre branche du même trou.
const TOMATE_SANS_PRIX: ProduitAppariable[] = [{ id: 'p1', nom: 'Tomate', prix: 0, stock: 10, unite: 'unité' }];
// Produit connu, prix réel — le cas qui marchait déjà et ne doit pas bouger.
const TOMATE: ProduitAppariable[] = [{ id: 'p1', nom: 'Tomate', prix: 500, prix_achat: 300, stock: 10, unite: 'unité' }];

console.log("\n[0] La lecture COMMUNE ne bouge pas : la caisse seule a sa porte");
for (const phrase of ['cinq tomates', '3 tomates']) {
  ok(intentLocal(phrase) === null,
    `${JSON.stringify(phrase)} reste null pour intentLocal (stock, assistante, rejeu hors ligne : rien ne change)`);
}

console.log("\n[1] « cinq tomates » : sur la CAISSE, ce qu'elle dit est une vente");
for (const phrase of ['cinq tomates', '3 tomates']) {
  const { extraction, local } = dicter(phrase, CATALOGUE_VIDE);
  ok(extraction.produit === 'tomate' && extraction.quantite != null,
    `${JSON.stringify(phrase)} : l'extraction voit le produit et la quantité (obtenu ${JSON.stringify({ produit: extraction.produit, quantite: extraction.quantite })})`);
  ok(local !== null, `${JSON.stringify(phrase)} : la dictée n'est pas jetée par intentLocal (obtenu ${JSON.stringify(local)})`);
  ok(local?.action?.type === 'vendre', `${JSON.stringify(phrase)} : c'est une VENTE (obtenu ${JSON.stringify(local?.action)})`);
  ok(local?.action?.montant == null, `${JSON.stringify(phrase)} : et aucun montant n'est inventé au passage`);
}

console.log("\n[1b] …mais la règle reste étroite : on ne vend pas dans le doute");
for (const [phrase, pourquoi] of [
  ['bonjour', 'ni produit ni quantité'],
  ['tomate', 'un produit sans quantité'],
  ['ajoute 10 tomates au stock', 'un mot de stock'],
  ['enleve 2 tomates', 'un retrait'],
] as [string, string][]) {
  const { local } = dicter(phrase, CATALOGUE_VIDE);
  ok(local?.action?.type !== 'vendre', `${JSON.stringify(phrase)} n'est pas une vente (${pourquoi}) — obtenu ${JSON.stringify(local?.action ?? null)}`);
}
{
  const a = dicter('annule les 3 tomates', CATALOGUE_VIDE);
  ok(a.local?.action?.type === 'annuler_validation', `« annule les 3 tomates » reste une annulation (obtenu ${JSON.stringify(a.local?.action)})`);
}

console.log('\n[2] Catalogue VIDE : rien au panier, mais le prix est DEMANDÉ');
{
  const { panier, demandes } = dicter('cinq tomates', CATALOGUE_VIDE);
  ok(panier.length === 0, `aucune ligne n'entre au panier (obtenu ${JSON.stringify(panier)})`);
  ok(demandes.length === 1, `le prix est demandé exactement une fois (obtenu ${demandes.length})`);
  ok(demandes[0]?.nom?.toLowerCase().includes('tomate'), `la demande porte le produit dit (obtenu ${JSON.stringify(demandes[0])})`);
  ok(demandes[0]?.quantite === 5, `et la quantité dite, pour qu'elle n'ait pas à la redire (obtenu ${JSON.stringify(demandes[0]?.quantite)})`);
}

console.log("\n[3] Le silence n'est plus possible, même quand la voix est coupée (profil « je lis »)");
{
  const { panier, dits, demandes } = dicter('cinq tomates', CATALOGUE_VIDE, false);
  ok(dits.length === 0, 'profil « je lis » : Tata ne parle pas — comme avant');
  ok(panier.length === 0, 'et rien ne part au panier');
  ok(demandes.length === 1, `mais l'écran, lui, demande le prix (obtenu ${demandes.length})`);
}

console.log('\n[4] Produit CONNU mais sans prix de vente : même règle');
{
  const { panier, demandes } = dicter('cinq tomates', TOMATE_SANS_PRIX);
  ok(panier.length === 0, `aucune ligne à 0 F (obtenu ${JSON.stringify(panier)})`);
  ok(demandes.length === 1, `le prix est demandé (obtenu ${demandes.length})`);
}

console.log('\n[5] Ce qui marchait marche encore : prix au catalogue, et montant dicté');
{
  const a = dicter('cinq tomates', TOMATE);
  ok(a.panier.length === 1 && a.panier[0][2] === 2500, `prix catalogue × quantité (obtenu ${JSON.stringify(a.panier[0]?.[2])})`);
  ok(a.demandes.length === 0, 'aucune demande de prix quand le catalogue en a un');
  const b = dicter('vends cinq tomates pour 2000 francs', CATALOGUE_VIDE);
  ok(b.panier.length === 1 && b.panier[0][2] === 2000, `montant dicté prioritaire, même sans catalogue (obtenu ${JSON.stringify(b.panier[0]?.[2])})`);
  ok(b.demandes.length === 0, "et rien à demander : elle a dit le prix");
}

console.log('\n[6] La demande de prix est CÂBLÉE de la voix vers la caisse (source)');
ok(/intentLocalCaisse\(texte\)/.test(micro), 'la caisse relit elle-même ce que le moteur n\'a pas compris (intentLocalCaisse)');
ok(/if \(intentLocal\(texte\)\) return;/.test(micro), 'et seulement cela : elle ne repasse jamais derrière une phrase déjà comprise');
ok(/demanderPrix\s*:/.test(micro), 'MicroVenteCaisse câble demanderPrix dans les dépendances de vendreVocalUnifie');
ok(/demanderPrixAuParent\(/.test(micro), 'et la transmet à la caisse (FournisseurDemandePrix), au lieu de se taire');
ok(/<FournisseurDemandePrix demander=\{ouvrirPrixManquant\}>/.test(caisse), 'POSCaisse s\'abonne à cette demande');
ok(/const ouvrirPrixManquant/.test(caisse) && /setShowLibre\(true\)/.test(caisse),
  "et ouvre lui-même l'écran qui demande le prix — la marchande n'a plus à le trouver");

console.log("\n[7] L'écran ouvert par la dictée est PRÉ-REMPLI, et n'invente aucun prix (source)");
ok(/setVenteDictee\(\{ nom: propre, quantite: qte, unite: uniteDite \}\)/.test(caisse), 'le nom, la quantité et l\'unité dits sont retenus');
ok(/setLibreDesc\(propre\)/.test(caisse), 'le libellé est pré-rempli : plus de ligne sans nom quand elle a parlé');
ok(/setLibreMontant\(''\)/.test(caisse), "le montant, lui, reste VIDE : c'est à elle de le donner");
ok(/quantiteDictee/.test(caisse), 'et la quantité dite part sur la ligne, pas 1 par défaut');
ok(!/venteDictee[\s\S]{0,200}prixVente|dernierPrix|moyennePrix/.test(caisse), 'aucun prix de repli n\'est pioché ailleurs');

console.log(echecs === 0 ? '\n✅ Tout est vert\n' : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
