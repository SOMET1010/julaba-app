/**
 * À QUEL PRODUIT DU CATALOGUE CORRESPOND CE NOM ? — règle unique de l'image.
 *
 * LE DÉFAUT (démo 12/10/2026). Le stock commun de la coopérative cherchait
 * l'image par clé EXACTE dans sa propre table (« banane plantain » ≠
 * « plantain ») et retombait sur le RIZ : un régime de plantain s'affichait
 * avec un sac de riz. Trois autres écrans avaient chacun leur table, dont deux
 * donnaient au plantain la photo de la banane douce. Pour qui ne lit pas,
 * l'image EST le nom du produit : une image fausse est un nom faux.
 *
 * LA RÈGLE, dans l'ordre :
 *   1. le nom (ou un de ses mots-clés) égale le nom tel qu'écrit — casse,
 *      accents et espaces ignorés ;
 *   2. sinon, le mot-clé le PLUS LONG contenu comme mot entier gagne
 *      (« banane plantain mûre » → plantain, pas banane ; « riz local » → riz) ;
 *   3. sinon, rien : l'appelant montre l'image générique, jamais celle d'un
 *      autre produit.
 *
 * MODULE PUR : ni React, ni image importée. Le catalogue est passé en argument.
 */

export interface EntreeCorrespondance {
  readonly nom: string;
  readonly mots_cles: readonly string[];
}

/** Minuscules, sans accents, espaces resserrés. */
export function normaliserNomProduit(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function motsDe<T extends EntreeCorrespondance>(p: T): string[] {
  return [p.nom, ...p.mots_cles].map(normaliserNomProduit).filter(Boolean);
}

function contientMotEntier(texte: string, mot: string): boolean {
  return ` ${texte} `.includes(` ${mot} `);
}

export function produitCorrespondant<T extends EntreeCorrespondance>(
  catalogue: readonly T[],
  nom: string,
): T | undefined {
  const q = normaliserNomProduit(nom);
  if (!q) return undefined;
  const exact = catalogue.find(p => motsDe(p).includes(q));
  if (exact) return exact;
  let meilleur: { produit: T; longueur: number } | undefined;
  for (const p of catalogue) {
    for (const mot of motsDe(p)) {
      if (contientMotEntier(q, mot) && (!meilleur || mot.length > meilleur.longueur)) {
        meilleur = { produit: p, longueur: mot.length };
      }
    }
  }
  return meilleur?.produit;
}
