import { Intention, INTENTIONS_MAP, PRODUITS_FORMES } from './vocabulaire';

export interface ExtractionResult {
  intention: Intention | null;
  produit: string | null;
  quantite: number | null;
  montant: number | null;
}

// ──────────────────────────────────────────────
// Parseur de nombres en lettres françaises
// ──────────────────────────────────────────────

const UNITES: Record<string, number> = {
  zéro: 0, zero: 0,
  un: 1, une: 1,
  deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9,
  dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
  'dix-sept': 17, 'dix-huit': 18, 'dix-neuf': 19,
  'vingt-et-un': 21, 'vingt-et-une': 21,
  'trente-et-un': 31, 'trente-et-une': 31,
  'quarante-et-un': 41, 'quarante-et-une': 41,
  'cinquante-et-un': 51, 'cinquante-et-une': 51,
  'soixante-et-un': 61, 'soixante-et-une': 61,
  'soixante-et-onze': 71,
};

const DIZAINES: Record<string, number> = {
  vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60,
  'soixante-dix': 70,
  'soixante-onze': 71, 'soixante-douze': 72, 'soixante-treize': 73,
  'soixante-quatorze': 74, 'soixante-quinze': 75, 'soixante-seize': 76,
  'soixante-dix-sept': 77, 'soixante-dix-huit': 78, 'soixante-dix-neuf': 79,
  'quatre-vingts': 80, 'quatre-vingt': 80,
  'quatre-vingt-un': 81, 'quatre-vingt-une': 81,
  'quatre-vingt-deux': 82, 'quatre-vingt-trois': 83,
  'quatre-vingt-quatre': 84, 'quatre-vingt-cinq': 85,
  'quatre-vingt-six': 86, 'quatre-vingt-sept': 87,
  'quatre-vingt-huit': 88, 'quatre-vingt-neuf': 89,
  'quatre-vingt-dix': 90, 'quatre-vingt-onze': 91,
  'quatre-vingt-douze': 92, 'quatre-vingt-treize': 93,
  'quatre-vingt-quatorze': 94, 'quatre-vingt-quinze': 95,
  'quatre-vingt-seize': 96, 'quatre-vingt-dix-sept': 97,
  'quatre-vingt-dix-huit': 98, 'quatre-vingt-dix-neuf': 99,
};

type NumberToken = { value: number; start: number; end: number };

function isNumberWord(w: string): boolean {
  return w in UNITES || w in DIZAINES || w === 'cent' || w === 'cents' || w === 'mille' || w === 'et';
}

function parseSequence(tokens: string[]): number {
  const toks = tokens.filter((t) => t !== 'et');
  let result = 0;
  let courant = 0;
  let sawMille = false;
  let courantHasCent = false;
  let courantSingleUnit = false; // courant vaut exactement une unité 1-9, sans "cent"
  for (const tok of toks) {
    if (tok in UNITES) {
      courant += UNITES[tok];
      courantSingleUnit = !courantHasCent && courant === UNITES[tok] && UNITES[tok] >= 1 && UNITES[tok] <= 9;
    } else if (tok in DIZAINES) {
      courant += DIZAINES[tok];
      courantSingleUnit = false;
    } else if (tok === 'cent' || tok === 'cents') {
      courant = courant > 0 ? courant * 100 : 100;
      courantHasCent = true;
      courantSingleUnit = false;
    } else if (tok === 'mille') {
      result += courant > 0 ? courant * 1000 : 1000;
      courant = 0;
      courantHasCent = false;
      courantSingleUnit = false;
      sawMille = true;
    }
  }
  // Ellipse du marché : « mille cinq » = 1500, « deux mille cinq » = 2500.
  // Un chiffre isolé (1-9) juste après « mille », sans « cent », sous-entend
  // les centaines. N'affecte pas « mille cinquante » (1050) ni « mille cinq cents ».
  if (sawMille && courantSingleUnit) {
    courant = courant * 100;
  }
  return result + courant;
}

function extractNumberTokens(words: string[]): NumberToken[] {
  const tokens: NumberToken[] = [];
  let i = 0;
  while (i < words.length) {
    if (isNumberWord(words[i]) && words[i] !== 'et') {
      const start = i;
      const seq: string[] = [];
      while (i < words.length && isNumberWord(words[i])) {
        seq.push(words[i]);
        i++;
      }
      const clean = seq.filter((t) => t !== 'et');
      if (clean.length > 0) {
        tokens.push({ value: parseSequence(seq), start, end: i - 1 });
      }
    } else {
      if (/^\d+$/.test(words[i])) {
        tokens.push({ value: parseInt(words[i], 10), start: i, end: i });
      }
      i++;
    }
  }
  return tokens;
}

// ──────────────────────────────────────────────
// Marqueurs syntaxiques
// ──────────────────────────────────────────────

// Marqueurs AVANT le nombre → montant (« à 2000 », « pour 1000 »)
const MARQUEURS_AVANT = new Set(['à', 'a', 'pour']);
// Marqueurs APRÈS le nombre → montant (« 2000 francs »)
const MARQUEURS_APRES = new Set(['francs', 'franc']);
// Mots intermédiaires tolérés entre le nombre et le produit (pour la quantité)
const MOTS_UNITE = new Set([
  'tas', 'sac', 'sacs', 'kilo', 'kilos', 'kilogramme', 'kilogrammes',
  'bidon', 'bidons', 'botte', 'bottes', 'sachet', 'sachets', 'boite', 'boites',
  'paquet', 'paquets', 'morceau', 'morceaux', 'litre', 'litres', 'régime', 'regime', 'regimes', 'régimes',
  'carton', 'cartons', 'caisse', 'caisses', 'bouteille', 'bouteilles', 'panier', 'paniers',
  'de',
]);

// ──────────────────────────────────────────────
// Normalisation
// ──────────────────────────────────────────────

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/j'ai\b/g, "j' ai")
    .replace(/\bd'/g, 'de ')
    .replace(/\bl'/g, 'le ')
    .replace(/[.,!?;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ──────────────────────────────────────────────
// Extraction principale
// ──────────────────────────────────────────────

export function extraire(transcription: string): ExtractionResult {
  const texte = normalise(transcription);
  const mots = texte.split(' ').filter(Boolean);

  // 1. Intention — premier mot-clé trouvé
  let intention: Intention | null = null;
  for (const mot of mots) {
    if (mot in INTENTIONS_MAP) { intention = INTENTIONS_MAP[mot]; break; }
  }

  // 2. Produit — bigrammes d'abord (exhaustifs), puis unigrammes
  //    On épuise TOUS les bigrammes avant de regarder les unigrammes.
  let produit: string | null = null;
  let produitStart = -1;
  let produitEnd = -1;

  for (let i = 0; i < mots.length - 1; i++) {
    const bi = `${mots[i]} ${mots[i + 1]}`;
    if (bi in PRODUITS_FORMES) {
      produit = PRODUITS_FORMES[bi];
      produitStart = i;
      produitEnd = i + 1;
      break;
    }
  }
  if (!produit) {
    for (let i = 0; i < mots.length; i++) {
      if (mots[i] in PRODUITS_FORMES) {
        produit = PRODUITS_FORMES[mots[i]];
        produitStart = i;
        produitEnd = i;
        break;
      }
    }
  }

  // 3. Tokens numériques
  const numTokens = extractNumberTokens(mots);
  if (numTokens.length === 0) return { intention, produit, quantite: null, montant: null };

  // ────────────────────────────────────────────────────────────────────
  // RÈGLES DE PRÉCÉDENCE — immuable, chaque règle s'applique ou non,
  // une règle plus prioritaire ne peut pas être écrasée par une suivante.
  // ────────────────────────────────────────────────────────────────────

  // Étape A : marquer chaque token comme candidat montant ou candidat quantité
  // selon ses marqueurs syntaxiques UNIQUEMENT.
  // Un token marqué est définitivement assigné — l'adjacence ne le touche pas.

  const marqueMontant = new Set<number>(); // index dans numTokens
  const marqueQuantite = new Set<number>();

  for (let idx = 0; idx < numTokens.length; idx++) {
    const tok = numTokens[idx];
    const avant = tok.start > 0 ? mots[tok.start - 1] : null;
    const apres = tok.end + 1 < mots.length ? mots[tok.end + 1] : null;

    if ((avant && MARQUEURS_AVANT.has(avant)) || (apres && MARQUEURS_APRES.has(apres))) {
      marqueMontant.add(idx);
    }
  }

  // Étape B : parmi les tokens NON marqués, chercher un candidat quantité
  // = token qui précède le produit avec uniquement des mots d'unité entre eux.
  if (produitStart >= 0) {
    for (let idx = 0; idx < numTokens.length; idx++) {
      if (marqueMontant.has(idx)) continue; // déjà assigné → ne pas toucher
      const tok = numTokens[idx];
      if (tok.end >= produitStart) continue; // doit être avant le produit
      // Vérifie les mots intermédiaires
      let tousValides = true;
      for (let k = tok.end + 1; k < produitStart; k++) {
        if (!MOTS_UNITE.has(mots[k])) { tousValides = false; break; }
      }
      if (tousValides) {
        marqueQuantite.add(idx);
        break; // un seul candidat quantité par adjacence
      }
    }
  }

  // Étape C : résoudre à partir des marques
  let montant: number | null = null;
  let quantite: number | null = null;

  if (marqueMontant.size > 0) {
    montant = numTokens[Math.max(...marqueMontant)].value; // prend le dernier marqué montant
  }
  if (marqueQuantite.size > 0) {
    quantite = numTokens[Math.min(...marqueQuantite)].value;
  }

  // Étape D : tokens non encore assignés → heuristique de dernier recours
  const assignes = new Set([...marqueMontant, ...marqueQuantite]);
  const libres = numTokens.filter((_, idx) => !assignes.has(idx));

  if (montant === null && quantite === null) {
    // Aucun marqueur du tout → plus grand = montant, plus petit = quantité
    const sorted = [...libres].sort((a, b) => b.value - a.value);
    if (sorted.length >= 1) montant = sorted[0].value;
    if (sorted.length >= 2) quantite = sorted[1].value;
  } else if (montant !== null && quantite === null) {
    // Un libre restant → quantité
    const autre = libres.find((t) => t.value !== montant);
    if (autre) quantite = autre.value;
  } else if (montant === null && quantite !== null) {
    // Un libre restant → montant
    const autre = libres.find((t) => t.value !== quantite);
    if (autre) montant = autre.value;
    else if (libres.length > 0) montant = libres[0].value;
  }

  // Étape E : cas solde sans marqueur — le seul nombre est montant
  if (intention === 'solde' && montant === null && quantite !== null) {
    montant = quantite;
    quantite = null;
  }

  return { intention, produit, quantite, montant };
}

// ──────────────────────────────────────────────
// Comparaison champ par champ
// ──────────────────────────────────────────────

export interface CompField {
  ok: boolean;
  obtenu: string | number | null;
  attendu: string | number | null;
}

export interface Comparaison {
  intention: CompField;
  produit: CompField;
  quantite: CompField;
  montant: CompField;
  complet: boolean;
}

export function comparer(
  extrait: ExtractionResult,
  attendu: { intention: Intention | null; produit: string | null; quantite: number | null; montant: number | null }
): Comparaison {
  const f = (ob: string | number | null, at: string | number | null): CompField => ({
    ok: at === null ? ob === null : ob === at,
    obtenu: ob,
    attendu: at,
  });

  const champIntention = f(extrait.intention, attendu.intention);
  const champProduit = f(extrait.produit, attendu.produit);
  const champQuantite = f(extrait.quantite, attendu.quantite);
  const champMontant = f(extrait.montant, attendu.montant);
  const complet = champIntention.ok && champProduit.ok && champQuantite.ok && champMontant.ok;

  return { intention: champIntention, produit: champProduit, quantite: champQuantite, montant: champMontant, complet };
}
