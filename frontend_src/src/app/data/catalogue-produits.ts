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
