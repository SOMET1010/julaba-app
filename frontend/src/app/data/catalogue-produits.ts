import { emojiTile } from '../utils/emojiTile';
import { produitCorrespondant } from '../services/correspondanceProduit';
import {
  IMG_PRODUIT_RIZ, IMG_PRODUIT_TOMATE, IMG_PRODUIT_AUBERGINE,
  IMG_PRODUIT_PIMENT, IMG_PRODUIT_GOMBO, IMG_PRODUIT_MANIOC,
  IMG_PRODUIT_IGNAME, IMG_PRODUIT_MAIS, IMG_PRODUIT_BANANE,
  IMG_PRODUIT_PLANTAIN, IMG_PRODUIT_OIGNON, IMG_PRODUIT_AVOCAT,
  IMG_PRODUIT_HUILE, IMG_PRODUIT_MANGUE, IMG_PRODUIT_ANANAS,
  IMG_PRODUIT_ARACHIDE, IMG_PRODUIT_AUTRE,
} from '../assets/images';

export interface ProduitCatalogue {
  nom: string;
  categorie: string;
  unite: string;
  image: string;
  mots_cles: string[];
}

// C-C1 — DÉCISION DE PATRICK, 20/10 : LES PRIX SONT VIDÉS. Ils étaient
// inventés (Tomate 300/400, Aubergine 700/800…), jamais énoncés par une
// marchande. Depuis STK-02 plus personne ne les lit (prixDeLaMarchande :
// « Le prix ne se déduit jamais d'un catalogue : il vient d'elle, ou il
// n'existe pas encore ») — ils ne servaient plus qu'à tromper un futur
// lecteur. Un catalogue sait ce qu'est un produit : nom, photo, unité,
// famille. Ce qu'ELLE le vend, lui seul le sait.
//
// Vignette LOCALE à partir d'un emoji (pictogramme reconnaissable, marche
// HORS-LIGNE, aucune image distante). Pour les produits vivriers sans vraie photo
// dans le catalogue : bien mieux qu'un panier générique pour une non-lectrice.
// La fabrique de vignettes vit désormais dans utils/emojiTile (les dépenses
// s'en servent aussi).

export const CATALOGUE_PRODUITS: ProduitCatalogue[] = [
  { nom: 'Riz', categorie: 'cereales', unite: 'kg',  image: IMG_PRODUIT_RIZ, mots_cles: ['riz', 'rice'] },
  { nom: 'Tomate', categorie: 'legumes', unite: 'kg',  image: IMG_PRODUIT_TOMATE, mots_cles: ['tomate', 'tomato'] },
  { nom: 'Aubergine', categorie: 'legumes', unite: 'kg',  image: IMG_PRODUIT_AUBERGINE, mots_cles: ['aubergine', 'eggplant'] },
  { nom: 'Piment', categorie: 'legumes', unite: 'tas',  image: IMG_PRODUIT_PIMENT, mots_cles: ['piment', 'pepper', 'pili pili'] },
  { nom: 'Gombo', categorie: 'legumes', unite: 'tas',  image: IMG_PRODUIT_GOMBO, mots_cles: ['gombo', 'okra'] },
  { nom: 'Manioc', categorie: 'tubercules', unite: 'kg',  image: IMG_PRODUIT_MANIOC, mots_cles: ['manioc', 'cassava'] },
  { nom: 'Igname', categorie: 'tubercules', unite: 'kg',  image: IMG_PRODUIT_IGNAME, mots_cles: ['igname', 'yam'] },
  { nom: 'Maïs', categorie: 'cereales', unite: 'kg',  image: IMG_PRODUIT_MAIS, mots_cles: ['mais', 'maïs', 'corn'] },
  { nom: 'Banane', categorie: 'fruits', unite: 'régime',  image: IMG_PRODUIT_BANANE, mots_cles: ['banane', 'banana'] },
  { nom: 'Plantain', categorie: 'fruits', unite: 'régime',  image: IMG_PRODUIT_PLANTAIN, mots_cles: ['plantain', 'alloco', 'banane plantain'] },
  { nom: 'Oignon', categorie: 'legumes', unite: 'kg',  image: IMG_PRODUIT_OIGNON, mots_cles: ['oignon', 'onion'] },
  { nom: 'Avocat', categorie: 'fruits', unite: 'pièce',  image: IMG_PRODUIT_AVOCAT, mots_cles: ['avocat', 'avocado'] },
  { nom: 'Huile de palme', categorie: 'condiments', unite: 'L',  image: IMG_PRODUIT_HUILE, mots_cles: ['huile', 'huile de palme', 'palm oil'] },
  { nom: 'Mangue', categorie: 'fruits', unite: 'kg',  image: IMG_PRODUIT_MANGUE, mots_cles: ['mangue', 'mango'] },
  { nom: 'Ananas', categorie: 'fruits', unite: 'pièce',  image: IMG_PRODUIT_ANANAS, mots_cles: ['ananas', 'pineapple'] },
  { nom: 'Arachide', categorie: 'cereales', unite: 'kg',  image: IMG_PRODUIT_ARACHIDE, mots_cles: ['arachide', 'cacahuete', 'peanut'] },
  // ── Produits vivriers courants (pictogrammes emoji, hors-ligne) ──────────────
  { nom: 'Carotte', categorie: 'legumes', unite: 'kg',  image: emojiTile('🥕'), mots_cles: ['carotte', 'carrot'] },
  { nom: 'Concombre', categorie: 'legumes', unite: 'kg',  image: emojiTile('🥒'), mots_cles: ['concombre', 'cucumber'] },
  { nom: 'Courgette', categorie: 'legumes', unite: 'kg',  image: emojiTile('🥒'), mots_cles: ['courgette', 'zucchini'] },
  { nom: 'Chou', categorie: 'legumes', unite: 'pièce',  image: emojiTile('🥬'), mots_cles: ['chou', 'cabbage'] },
  { nom: 'Laitue', categorie: 'legumes', unite: 'pièce',  image: emojiTile('🥬'), mots_cles: ['laitue', 'salade', 'lettuce'] },
  { nom: 'Brocoli', categorie: 'legumes', unite: 'kg',  image: emojiTile('🥦'), mots_cles: ['brocoli', 'broccoli'] },
  { nom: 'Patate douce', categorie: 'tubercules', unite: 'kg',  image: emojiTile('🍠'), mots_cles: ['patate', 'patate douce', 'sweet potato'] },
  { nom: 'Pomme de terre', categorie: 'tubercules', unite: 'kg',  image: emojiTile('🥔'), mots_cles: ['pomme de terre', 'patate irlandaise', 'potato'] },
  { nom: 'Haricot', categorie: 'cereales', unite: 'kg',  image: emojiTile('🫘'), mots_cles: ['haricot', 'niebe', 'bean'] },
  { nom: 'Citron', categorie: 'fruits', unite: 'pièce',  image: emojiTile('🍋'), mots_cles: ['citron', 'lemon', 'lime'] },
  { nom: 'Orange', categorie: 'fruits', unite: 'pièce',  image: emojiTile('🍊'), mots_cles: ['orange'] },
  { nom: 'Pastèque', categorie: 'fruits', unite: 'pièce',  image: emojiTile('🍉'), mots_cles: ['pasteque', 'pastèque', 'watermelon'] },
  { nom: 'Papaye', categorie: 'fruits', unite: 'pièce',  image: emojiTile('🍈'), mots_cles: ['papaye', 'papaya'] },
  { nom: 'Fraise', categorie: 'fruits', unite: 'kg',  image: emojiTile('🍓'), mots_cles: ['fraise', 'strawberry'] },
  { nom: 'Noix de coco', categorie: 'fruits', unite: 'pièce',  image: emojiTile('🥥'), mots_cles: ['coco', 'noix de coco', 'coconut'] },
  { nom: 'Café', categorie: 'autre', unite: 'kg',  image: emojiTile('☕'), mots_cles: ['cafe', 'café', 'coffee'] },
  { nom: 'Poisson', categorie: 'autre', unite: 'kg',  image: emojiTile('🐟'), mots_cles: ['poisson', 'fish'] },
  { nom: 'Poulet', categorie: 'autre', unite: 'pièce',  image: emojiTile('🍗'), mots_cles: ['poulet', 'poule', 'chicken'] },
  { nom: 'Œuf', categorie: 'autre', unite: 'plateau',  image: emojiTile('🥚'), mots_cles: ['oeuf', 'œuf', 'egg'] },
  { nom: 'Pain', categorie: 'autre', unite: 'pièce',  image: emojiTile('🍞'), mots_cles: ['pain', 'bread', 'baguette'] },
  { nom: 'Autre', categorie: 'autre', unite: 'unité',  image: IMG_PRODUIT_AUTRE, mots_cles: ['autre', 'divers'] },
];

/** L'image d'un produit nommé librement — SEULE correspondance nom → image
 *  (règle : services/correspondanceProduit.ts). Inconnu → image générique,
 *  jamais la photo d'un autre produit. L'attiéké n'a pas de photo au
 *  catalogue : il prend l'image générique, pas celle du manioc. */
export function getImageByNom(nom: string): string {
  return produitCorrespondant(CATALOGUE_PRODUITS, nom)?.image || IMG_PRODUIT_AUTRE;
}

/** Repli 100 % embarqué pour la caisse. La photo reste prioritaire quand elle
 * charge, mais une vendeuse ne voit jamais un panier générique à la place d'un
 * produit courant quand le réseau tombe. */
export function getPictogrammeByNom(nom: string): string {
  const q = nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const pictos: Array<[string[], string]> = [
    [['riz'], '🍚'], [['tomate'], '🍅'], [['aubergine'], '🍆'],
    [['piment'], '🌶️'], [['gombo'], '🫛'], [['manioc'], '🥔'],
    [['igname', 'patate douce'], '🍠'], [['mais'], '🌽'],
    [['banane', 'plantain'], '🍌'], [['oignon'], '🧅'], [['avocat'], '🥑'],
    [['huile'], '🫙'], [['mangue'], '🥭'], [['ananas'], '🍍'],
    [['arachide'], '🥜'], [['carotte'], '🥕'], [['concombre', 'courgette'], '🥒'],
    [['chou', 'laitue'], '🥬'], [['brocoli'], '🥦'], [['haricot'], '🫘'],
    [['citron'], '🍋'], [['orange'], '🍊'], [['pasteque'], '🍉'],
    [['papaye'], '🍈'], [['fraise'], '🍓'], [['coco'], '🥥'],
    [['cafe'], '☕'], [['poisson'], '🐟'], [['poulet'], '🍗'],
    [['oeuf'], '🥚'], [['pain'], '🍞'],
  ];
  const trouve = pictos.find(([mots]) => mots.some(mot => q.includes(mot)));
  return emojiTile(trouve?.[1] || '🧺');
}

export function getCleImage(nom: string): string {
  const map: Record<string, string> = {
    'Riz': 'riz', 'Tomate': 'tomate', 'Aubergine': 'aubergine',
    'Piment': 'piment', 'Gombo': 'gombo', 'Manioc': 'manioc',
    'Igname': 'igname', 'Maïs': 'mais', 'Banane': 'banane',
    'Plantain': 'plantain', 'Oignon': 'oignon', 'Avocat': 'avocat',
    'Huile de palme': 'huile', 'Mangue': 'mangue', 'Ananas': 'ananas',
    'Arachide': 'arachide',   };
  return map[nom] || 'autre';
}

export function rechercherProduitCatalogue(query: string): ProduitCatalogue | null {
  const q = query.toLowerCase().trim();
  return CATALOGUE_PRODUITS.find(p =>
    p.mots_cles.some(mc => mc.includes(q) || q.includes(mc)) ||
    p.nom.toLowerCase().includes(q)
  ) || null;
}

export function suggererProduits(query: string): ProduitCatalogue[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return CATALOGUE_PRODUITS.filter(p =>
    p.nom.toLowerCase().includes(q) ||
    p.mots_cles.some(mc => mc.includes(q) || q.includes(mc))
  );
}
