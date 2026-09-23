/**
 * POSER UN PRODUIT SUR SON ÉTAL — STK-03 §2.
 *
 * Trois questions, pas une de plus : son nom, comment elle le vend, à combien.
 * Ni famille, ni catégorie, ni stock, ni seuil, ni prix d'achat — rien de ce
 * qu'une marchande ne dirait pas d'elle-même en montrant son étal.
 *
 * LE PRIX NE SE DEVINE JAMAIS. C'est STK-02, et c'est ici que ça se joue :
 * tant qu'elle n'a pas donné son prix, le produit N'EXISTE PAS. Pas de 0, pas
 * de prix de catalogue, pas de « on complétera plus tard » — un produit sans
 * prix entrerait en caisse et fausserait chaque vente.
 *
 * Lancer : npm run test:premier-produit
 */
import { readFileSync } from 'node:fs';
import {
  etapeCourante, unitesProposees, produitPret, produitACreer,
  UNITES_DU_MARCHE, type BrouillonProduit,
} from './premierProduit.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};
const vide: BrouillonProduit = { nom: '', unite: '', prix: null };

console.log('\nPoser un produit sur son étal — trois questions, pas une de plus\n');

console.log('[1] KPONAN → TAS → 1500 : le parcours complet');
{
  ok(etapeCourante(vide) === 'nom', 'on commence par lui demander CE QU\'ELLE VEND');
  const nomme = { ...vide, nom: 'Kponan' };
  ok(etapeCourante(nomme) === 'unite', 'puis COMMENT elle le vend');
  const unite = { ...nomme, unite: 'tas' };
  ok(etapeCourante(unite) === 'prix', 'puis À COMBIEN — et c\'est fini');
  ok(!produitPret(unite), 'sans prix, le produit n\'est PAS prêt : il n\'existe pas encore');

  const complet = { ...unite, prix: 1500 };
  ok(produitPret(complet), 'avec son prix, il est prêt');
  const aCreer = produitACreer(complet);
  ok(aCreer?.nom === 'Kponan', `le nom qu'ELLE a donné — ${aCreer?.nom}`);
  ok(aCreer?.unite === 'tas', 'SON unité');
  ok(aCreer?.prix === 1500, `SON prix — ${aCreer?.prix}`);
  ok(aCreer?.stock === 0, 'aucune quantité inventée : elle n\'a pas compté son stock');
  ok(aCreer?.categorie === '', 'et aucune catégorie inventée — « autre » serait un mot qu\'elle n\'a pas dit');
}

console.log('\n[2] PRODUIT INCONNU DU RÉFÉRENTIEL → LA CRÉATION PASSE QUAND MÊME');
{
  // Le référentiel est une aide, jamais une porte. `catalogue_maitre` est de
  // surcroît présumée VIDE en production : un parcours qui en dépendrait ne
  // marcherait chez personne.
  const inconnu = { nom: 'Djoumgblé de ma tante', unite: 'bassine', prix: 2000 };
  ok(produitPret(inconnu), 'un nom que le référentiel ne connaît pas se pose quand même');
  ok(produitACreer(inconnu)?.nom === 'Djoumgblé de ma tante',
     'et il est enregistré TEL QU\'ELLE L\'A DIT, sans être corrigé');
}

console.log('\n[3] LES UNITÉS PROPOSÉES VIENNENT D\'ELLE, PUIS DU MARCHÉ');
{
  const sesUnites = ['tas', 'bassine'];
  const u = unitesProposees(sesUnites);
  ok(u[0] === 'tas' && u[1] === 'bassine',
     `SES unités d'abord — celles qu'elle emploie déjà : ${u.slice(0, 2).join(', ')}`);
  ok(u.includes('kg') && u.includes('sac'),
     'puis les plus fréquentes du marché, mesurées sur les 198');
  ok(new Set(u).size === u.length, 'aucune unité en double');
  ok(u.length <= 6, `la liste reste courte — ${u.length} boutons, pas une encyclopédie`);
  // Aucune unité connue : elle n'est jamais devant rien.
  const seule = unitesProposees([]);
  ok(seule.length > 0 && seule.every(x => (UNITES_DU_MARCHE as readonly string[]).includes(x)),
     'étal neuf : les unités du marché suffisent à démarrer');
  ok(!u.includes('Autre'), '« Autre » n\'est PAS une unité : c\'est un geste, l\'écran le porte à part');
}

console.log('\n[4] UNITÉ LIBRE — ELLE DIT SON MOT À ELLE');
{
  const sien = { nom: 'Gombo', unite: 'demi-panier', prix: 300 };
  ok(produitPret(sien), 'une unité hors de toute liste est acceptée');
  ok(produitACreer(sien)?.unite === 'demi-panier', 'et conservée telle quelle');
  ok(!produitPret({ nom: 'Gombo', unite: '   ', prix: 300 }),
     'mais du blanc n\'est pas une unité');
}

console.log('\n[5] AUCUN PRIX DEVINÉ, JAMAIS');
{
  ok(produitACreer({ nom: 'Riz', unite: 'kg', prix: null }) === null,
     'prix absent → rien à créer ; on ne complète pas à notre idée');
  ok(produitACreer({ nom: 'Riz', unite: 'kg', prix: 0 }) === null,
     'zéro n\'est pas un prix : il entrerait en caisse et fausserait chaque vente');
  ok(produitACreer({ nom: 'Riz', unite: 'kg', prix: -5 }) === null,
     'un prix négatif non plus');
  ok(produitACreer({ nom: '  ', unite: 'kg', prix: 500 }) === null,
     'et un produit sans nom n\'est pas un produit');
}

console.log('\n[6] UNE SEULE PERSISTANCE — `addProduct`, ET RIEN D\'AUTRE');
{
  const ECRAN = readFileSync(
    new URL('../components/marchand/AjoutProduitGuide.tsx', import.meta.url), 'utf-8');
  const code = ECRAN.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
  ok(/addProduct\s*\(/.test(code), 'l\'écran appelle la primitive existante `addProduct`');
  ok(!/fetch\s*\(|axios|stocksApi|creerStock|localStorage/.test(code),
     'et AUCUN second chemin d\'écriture : une donnée écrite à deux endroits diverge');
  // Ce qu'on ne demande PAS : une marchande ne décrit pas son produit, elle le vend.
  for (const mot of ['categorie', 'famille', 'seuil', 'prixAchat', 'prix_achat', 'peremption']) {
    ok(!new RegExp(`${mot}\\s*[:=]\\s*(?!undefined|null)[^,\\n]*[A-Za-z0-9'"]`, 'i').test(code)
       || /categorie:\s*''/.test(code),
       `l'écran ne demande pas « ${mot} »`);
  }
  ok(!/famille|sous.famille|domaine/i.test(code), 'et aucune taxonomie n\'apparaît');
}

console.log('\n[7] LA PREUVE TRAVERSE — l\'étal vide ouvre bien CE parcours');
{
  const SG = readFileSync(
    new URL('../components/marchand/SaisieGuidee.tsx', import.meta.url), 'utf-8');
  const code = SG.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
  // Borné au BLOC DE RENDU : chercher le nom ailleurs ne prouverait rien —
  // la leçon de STK-03d, où deux jets sont passés pour la mauvaise raison.
  ok(/premier-produit'\s*\?\s*\([\s\S]{0,400}?onClick=\{\(\) => setPoseOuverte\(true\)\}/.test(code),
     'le bouton de l\'étal vide ouvre la POSE d\'un produit, pas la saisie d\'une vente');
  ok(/if \(poseOuverte\)[\s\S]{0,300}?<AjoutProduitGuide/.test(code),
     'et c\'est bien l\'écran des trois questions qui s\'affiche');
  ok(/sesUnites=\{etal\.map/.test(code),
     'à qui l\'on passe SES unités déjà employées');
}

console.log('\n[8] STK-03c — LE STOCK ADOPTE PAR LE MÊME PARCOURS QUE LA CAISSE');
{
  const GS = readFileSync(
    new URL('../components/marchand/GestionStock.tsx', import.meta.url), 'utf-8');
  const gs = GS.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
  // Le bloc de CRÉATION seul : l'édition et le réapprovisionnement d'un produit
  // DÉJÀ adopté gardent leurs champs — on ne touche qu'à la naissance.
  const modalAjout = gs.slice(gs.indexOf('{showAdd && ('), gs.indexOf('{showEdit &&'));

  ok(!/CATALOGUE_PRODUITS/.test(modalAjout),
     'aucune des 37 tuiles génériques ne sert plus à créer un produit');
  ok(!/champsDepuisTuile|suggererProduits/.test(modalAjout),
     'ni par une suggestion de nom, qui posait le même produit générique');
  ok(/<AjoutProduitGuide[\s/>]/.test(modalAjout),
     'le bouton « Ajouter un produit » ouvre LE MÊME parcours que la caisse');
  ok(!/addProduct\s*\(\s*\{\s*nom\s*:\s*newStock/.test(gs),
     'et l\'ancien formulaire n\'écrit plus rien : une seule naissance, un seul chemin');
  // Ce que le stock garde : modifier et réapprovisionner un produit adopté.
  ok(/updateProduct\s*\(/.test(gs), 'la modification d\'un produit adopté reste en place');
  ok(/showEdit/.test(gs), 'et son écran d\'édition aussi');

  // MÊME PRODUIT DES DEUX CÔTÉS : les deux écrans montent le même composant,
  // qui appelle la même règle pure. Kponan → tas → 1500 ne peut pas naître
  // différemment selon la porte par laquelle elle est passée.
  const SG = readFileSync(
    new URL('../components/marchand/SaisieGuidee.tsx', import.meta.url), 'utf-8');
  ok(/<AjoutProduitGuide[\s/>]/.test(SG) && /<AjoutProduitGuide[\s/>]/.test(gs),
     'caisse et stock montent le MÊME composant — pas deux formulaires jumeaux');
  const AP = readFileSync(
    new URL('../components/marchand/AjoutProduitGuide.tsx', import.meta.url), 'utf-8');
  ok(/produitACreer/.test(AP),
     'et ce composant passe par la règle pure : un seul endroit décide ce qui naît');
}

console.log(echecs === 0
  ? '\n✅ Trois questions, son prix, un seul enregistrement.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
