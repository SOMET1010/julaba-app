import {
  IMG_PRODUIT_RIZ, IMG_PRODUIT_TOMATE, IMG_PRODUIT_AUBERGINE,
  IMG_PRODUIT_PIMENT, IMG_PRODUIT_GOMBO, IMG_PRODUIT_MANIOC,
  IMG_PRODUIT_IGNAME, IMG_PRODUIT_MAIS, IMG_PRODUIT_BANANE,
  IMG_PRODUIT_PLANTAIN, IMG_PRODUIT_OIGNON, IMG_PRODUIT_AVOCAT,
  IMG_PRODUIT_HUILE, IMG_PRODUIT_MANGUE, IMG_PRODUIT_ANANAS,
  IMG_PRODUIT_ARACHIDE, IMG_PRODUIT_AUTRE, IMG_PRODUIT_AUTRE,
} from '../assets/images';

export interface ProduitCatalogue {
  nom: string;
  categorie: string;
  unite: string;
  prixAchat: number;
  prixVente: number;
  image: string;
  mots_cles: string[];
}

// Vignette LOCALE à partir d'un emoji (pictogramme reconnaissable, marche
// HORS-LIGNE, aucune image distante). Pour les produits vivriers sans vraie photo
// dans le catalogue : bien mieux qu'un panier générique pour une non-lectrice —
// une carotte 🥕, un citron 🍋 se reconnaissent d'un coup d'œil.
function emojiTile(emoji: string): string {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'>" +
    "<rect width='96' height='96' fill='#FBEEE1'/>" +
    "<text x='48' y='52' font-size='54' text-anchor='middle' dominant-baseline='central'>" + emoji + "</text></svg>"
  );
}

export const CATALOGUE_PRODUITS: ProduitCatalogue[] = [
  { nom: 'Riz', categorie: 'cereales', unite: 'kg', prixAchat: 400, prixVente: 500, image: IMG_PRODUIT_RIZ, mots_cles: ['riz', 'rice'] },
  { nom: 'Tomate', categorie: 'legumes', unite: 'kg', prixAchat: 300, prixVente: 400, image: IMG_PRODUIT_TOMATE, mots_cles: ['tomate', 'tomato'] },
  { nom: 'Aubergine', categorie: 'legumes', unite: 'kg', prixAchat: 700, prixVente: 800, image: IMG_PRODUIT_AUBERGINE, mots_cles: ['aubergine', 'eggplant'] },
  { nom: 'Piment', categorie: 'legumes', unite: 'tas', prixAchat: 100, prixVente: 150, image: IMG_PRODUIT_PIMENT, mots_cles: ['piment', 'pepper', 'pili pili'] },
  { nom: 'Gombo', categorie: 'legumes', unite: 'tas', prixAchat: 120, prixVente: 150, image: IMG_PRODUIT_GOMBO, mots_cles: ['gombo', 'okra'] },
  { nom: 'Manioc', categorie: 'tubercules', unite: 'kg', prixAchat: 150, prixVente: 200, image: IMG_PRODUIT_MANIOC, mots_cles: ['manioc', 'cassava', 'attiéké'] },
  { nom: 'Igname', categorie: 'tubercules', unite: 'kg', prixAchat: 350, prixVente: 400, image: IMG_PRODUIT_IGNAME, mots_cles: ['igname', 'yam'] },
  { nom: 'Maïs', categorie: 'cereales', unite: 'kg', prixAchat: 200, prixVente: 250, image: IMG_PRODUIT_MAIS, mots_cles: ['mais', 'maïs', 'corn'] },
  { nom: 'Banane', categorie: 'fruits', unite: 'régime', prixAchat: 500, prixVente: 700, image: IMG_PRODUIT_BANANE, mots_cles: ['banane', 'banana'] },
  { nom: 'Plantain', categorie: 'fruits', unite: 'régime', prixAchat: 600, prixVente: 800, image: IMG_PRODUIT_PLANTAIN, mots_cles: ['plantain', 'alloco', 'banane plantain'] },
  { nom: 'Oignon', categorie: 'legumes', unite: 'kg', prixAchat: 300, prixVente: 400, image: IMG_PRODUIT_OIGNON, mots_cles: ['oignon', 'onion'] },
  { nom: 'Avocat', categorie: 'fruits', unite: 'pièce', prixAchat: 100, prixVente: 150, image: IMG_PRODUIT_AVOCAT, mots_cles: ['avocat', 'avocado'] },
  { nom: 'Huile de palme', categorie: 'condiments', unite: 'L', prixAchat: 1400, prixVente: 1500, image: IMG_PRODUIT_HUILE, mots_cles: ['huile', 'huile de palme', 'palm oil'] },
  { nom: 'Mangue', categorie: 'fruits', unite: 'kg', prixAchat: 200, prixVente: 300, image: IMG_PRODUIT_MANGUE, mots_cles: ['mangue', 'mango'] },
  { nom: 'Ananas', categorie: 'fruits', unite: 'pièce', prixAchat: 300, prixVente: 400, image: IMG_PRODUIT_ANANAS, mots_cles: ['ananas', 'pineapple'] },
  { nom: 'Arachide', categorie: 'cereales', unite: 'kg', prixAchat: 600, prixVente: 700, image: IMG_PRODUIT_ARACHIDE, mots_cles: ['arachide', 'cacahuete', 'peanut'] },
  // ── Produits vivriers courants (pictogrammes emoji, hors-ligne) ──────────────
  { nom: 'Carotte', categorie: 'legumes', unite: 'kg', prixAchat: 300, prixVente: 400, image: emojiTile('🥕'), mots_cles: ['carotte', 'carrot'] },
  { nom: 'Concombre', categorie: 'legumes', unite: 'kg', prixAchat: 200, prixVente: 300, image: emojiTile('🥒'), mots_cles: ['concombre', 'cucumber'] },
  { nom: 'Courgette', categorie: 'legumes', unite: 'kg', prixAchat: 250, prixVente: 350, image: emojiTile('🥒'), mots_cles: ['courgette', 'zucchini'] },
  { nom: 'Chou', categorie: 'legumes', unite: 'pièce', prixAchat: 300, prixVente: 500, image: emojiTile('🥬'), mots_cles: ['chou', 'cabbage'] },
  { nom: 'Laitue', categorie: 'legumes', unite: 'pièce', prixAchat: 150, prixVente: 250, image: emojiTile('🥬'), mots_cles: ['laitue', 'salade', 'lettuce'] },
  { nom: 'Brocoli', categorie: 'legumes', unite: 'kg', prixAchat: 500, prixVente: 700, image: emojiTile('🥦'), mots_cles: ['brocoli', 'broccoli'] },
  { nom: 'Patate douce', categorie: 'tubercules', unite: 'kg', prixAchat: 200, prixVente: 300, image: emojiTile('🍠'), mots_cles: ['patate', 'patate douce', 'sweet potato'] },
  { nom: 'Pomme de terre', categorie: 'tubercules', unite: 'kg', prixAchat: 350, prixVente: 450, image: emojiTile('🥔'), mots_cles: ['pomme de terre', 'patate irlandaise', 'potato'] },
  { nom: 'Haricot', categorie: 'cereales', unite: 'kg', prixAchat: 500, prixVente: 700, image: emojiTile('🫘'), mots_cles: ['haricot', 'niebe', 'bean'] },
  { nom: 'Citron', categorie: 'fruits', unite: 'pièce', prixAchat: 25, prixVente: 50, image: emojiTile('🍋'), mots_cles: ['citron', 'lemon', 'lime'] },
  { nom: 'Orange', categorie: 'fruits', unite: 'pièce', prixAchat: 50, prixVente: 100, image: emojiTile('🍊'), mots_cles: ['orange'] },
  { nom: 'Pastèque', categorie: 'fruits', unite: 'pièce', prixAchat: 500, prixVente: 800, image: emojiTile('🍉'), mots_cles: ['pasteque', 'pastèque', 'watermelon'] },
  { nom: 'Papaye', categorie: 'fruits', unite: 'pièce', prixAchat: 200, prixVente: 300, image: emojiTile('🍈'), mots_cles: ['papaye', 'papaya'] },
  { nom: 'Fraise', categorie: 'fruits', unite: 'kg', prixAchat: 800, prixVente: 1200, image: emojiTile('🍓'), mots_cles: ['fraise', 'strawberry'] },
  { nom: 'Noix de coco', categorie: 'fruits', unite: 'pièce', prixAchat: 150, prixVente: 250, image: emojiTile('🥥'), mots_cles: ['coco', 'noix de coco', 'coconut'] },
  { nom: 'Café', categorie: 'autre', unite: 'kg', prixAchat: 1500, prixVente: 2000, image: emojiTile('☕'), mots_cles: ['cafe', 'café', 'coffee'] },
  { nom: 'Poisson', categorie: 'autre', unite: 'kg', prixAchat: 1000, prixVente: 1500, image: emojiTile('🐟'), mots_cles: ['poisson', 'fish'] },
  { nom: 'Poulet', categorie: 'autre', unite: 'pièce', prixAchat: 2000, prixVente: 2800, image: emojiTile('🍗'), mots_cles: ['poulet', 'poule', 'chicken'] },
  { nom: 'Œuf', categorie: 'autre', unite: 'plateau', prixAchat: 2000, prixVente: 2500, image: emojiTile('🥚'), mots_cles: ['oeuf', 'œuf', 'egg'] },
  { nom: 'Pain', categorie: 'autre', unite: 'pièce', prixAchat: 125, prixVente: 150, image: emojiTile('🍞'), mots_cles: ['pain', 'bread', 'baguette'] },
  { nom: 'Autre', categorie: 'autre', unite: 'unité', prixAchat: 0, prixVente: 0, image: IMG_PRODUIT_AUTRE, mots_cles: ['autre', 'divers'] },
];

export function getImageByNom(nom: string): string {
  const p = CATALOGUE_PRODUITS.find(p => p.nom.toLowerCase() === nom.toLowerCase() || p.mots_cles.some(mc => mc === nom.toLowerCase()));
  return p?.image || IMG_PRODUIT_AUTRE;
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
