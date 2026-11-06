import { nombreEnMotsFr } from '../i18n/voice/argent/deuxFormes';
import { extraire, normalise } from './extraction';

export interface DepenseVocale {
  montant: number;
  description: string;
}

export function estActionDepenseValide<T extends { type: string; montant?: unknown }>(
  action: T,
): action is T & { type: 'depense'; montant: number } {
  return action.type === 'depense'
    && typeof action.montant === 'number'
    && action.montant > 0;
}

const MOTS_STRUCTURE = new Set([
  'achat', 'achats', 'achete', 'achetee', 'achetes', 'achetees',
  'acheté', 'achetée', 'achetés', 'achetées',
  'depense', 'depenses', 'depensee', 'depensees', 'dépense', 'dépenses', 'dépensé', 'dépensée', 'dépensés', 'dépensées',
  'paye', 'payee', 'payes', 'payé', 'payée', 'payés', 'payer',
  'pris', 'prise', 'j', "j'", 'ai', 'je', 'de', 'du', 'des',
  'la', 'le', 'les', 'un', 'une', 'pour', 'au', 'aux', 'a', 'et',
  'franc', 'francs', 'fcfa', 'cfa',
]);

function echapperRegExp(texte: string): string {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sansMontant(texte: string, montant: number): string {
  const chiffres = String(Math.round(montant)).replace(/\B(?=(\d{3})+(?!\d))/g, '[\\s.]?');
  let resultat = texte.replace(new RegExp(`\\b${chiffres}\\b`, 'g'), ' ');
  const mots = normalise(nombreEnMotsFr(montant));
  const variantes = new Set([
    mots,
    mots.replace(/\bcents\b/g, 'cent'),
    mots.replace(/\bquatre-vingts\b/g, 'quatre-vingt'),
  ]);
  for (const variante of variantes) {
    if (variante) resultat = resultat.replace(new RegExp(`\\b${echapperRegExp(variante)}\\b`, 'g'), ' ');
  }
  return resultat;
}

export function descriptionDepenseVocale(texte: string, montant: number): string {
  const mots = sansMontant(normalise(texte), montant)
    .replace(/\b(?:franc|francs|fcfa|cfa)\b/g, ' ')
    .split(/\s+/)
    .filter((mot) => mot && !MOTS_STRUCTURE.has(mot));
  return mots.join(' ').trim();
}

/** Lit une commande sur l'écran des dépenses, où le geste précise l'intention. */
export function lireDepenseVocale(texte: string): DepenseVocale | null {
  const extrait = extraire(texte);
  if (extrait.intention !== null && extrait.intention !== 'depense') return null;
  if (extrait.montant == null || extrait.montant <= 0) return null;
  const description = descriptionDepenseVocale(texte, extrait.montant);
  if (!description) return null;
  return { montant: extrait.montant, description };
}

export function phraseDepenseVocale(depense: DepenseVocale): string {
  return `Dépense de ${depense.montant} francs pour ${depense.description}`;
}
