/**
 * LES LIGNES DU PANIER — P0.1 / ARCH-02, 27/09/2026.
 *
 * Module PUR : aucune dépendance React ni DOM. Ces règles vivaient dans
 * `CaisseContext`, où elles ne se testaient qu'en montant un contexte entier.
 * Les sortir est aussi ce que l'audit du 27/09 demandait (JUL-ARCH-06).
 *
 * LE DÉFAUT QU'ON FERME. `CartItem.productId` portait DEUX sens : l'identifiant
 * d'un produit du catalogue (un UUID), et l'identité d'une ligne sans produit
 * — article libre, ou produit dicté non apparié — fabriquée en `libre-175…`.
 * Sur 27 usages, 21 s'en servaient comme clé de ligne : le nom était trompeur
 * quatre fois sur cinq. Le serveur s'en protégeait (ARG-16), mais au bord
 * seulement ; la confusion vivait toujours dans l'écran.
 *
 * LE PIÈGE QUE LA SÉPARATION OUVRE. En donnant `productId: null` aux articles
 * libres, une fusion naïve par `productId` les rendrait tous ÉGAUX — parce que
 * `null === null` — et les écraserait en une seule ligne. « Autre article à
 * 500 » puis « à 800 » n'en feraient qu'une, et elle perdrait la différence.
 * C'est la faute du 18/09, réintroduite par la correction censée l'éviter.
 *
 * LA RÈGLE : `null` veut dire « pas de produit catalogue ». JAMAIS « c'est le
 * même ». Elle n'est donc jamais une clé de fusion.
 */

export interface LignePanier {
  /** L'identité de la LIGNE. Toujours présente, toujours unique dans le panier. */
  readonly ligneId: string;
  /** L'identifiant du produit au CATALOGUE — un UUID — ou `null` s'il n'y en a pas. */
  readonly productId: string | null;
  readonly nom: string;
  readonly prix: number;
  readonly quantite: number;
  readonly prix_achat?: number;
  /** Montant TOTAL convenu pour la ligne. Invalidé dès qu'on la modifie. */
  readonly totalExact?: number;
  readonly unite?: string;
  readonly origine?: 'vocal';
}

/** Ce qu'on ajoute : un produit du catalogue (`id` UUID) ou un article libre (`id: null`). */
export interface ProduitAAjouter {
  readonly id: string | null;
  readonly nom: string;
  readonly prix: number;
  readonly prix_achat?: number;
  readonly unite?: string;
}

let compteur = 0;
/**
 * Une identité de ligne, unique et sans collision possible.
 *
 * Le compteur est là pour les ajouts du même millième de seconde : deux
 * énoncés vocaux traités d'affilée, ou deux touches rapides. Sans lui, deux
 * lignes distinctes pourraient porter la même identité — et la suppression de
 * l'une emporterait l'autre.
 */
export function nouvelleLigneId(): string {
  compteur += 1;
  return `l-${Date.now().toString(36)}-${compteur.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/**
 * Ajoute au panier, en fusionnant SI ET SEULEMENT SI un produit catalogue est
 * déjà là.
 *
 * LA FUSION NE DOIT PAS PERDRE D'ARGENT — règle du 18/09, reprise telle
 * quelle : on additionne les TOTAUX RÉELS, pas les quantités à l'ancien prix.
 * « 1 tomate à 500 » puis « 1 tomate à 700 » fait 1 200 F, pas 2 × 500.
 */
export function ajouterAuPanier(
  panier: readonly LignePanier[],
  produit: ProduitAAjouter,
  quantite = 1,
  totalExact?: number,
  origine?: 'vocal',
): LignePanier[] {
  const q = Math.max(1, Math.trunc(quantite) || 1);
  // ICI SE JOUE TOUT LE LOT : sans le `produit.id ?`, un article libre
  // fusionnerait avec tous les autres articles libres.
  const existante = produit.id
    ? panier.find(l => l.productId === produit.id)
    : undefined;

  if (!existante) {
    return [...panier, {
      ligneId: nouvelleLigneId(),
      productId: produit.id,
      nom: produit.nom,
      prix: produit.prix,
      quantite: q,
      ...(produit.prix_achat !== undefined ? { prix_achat: produit.prix_achat } : {}),
      ...(totalExact !== undefined ? { totalExact } : {}),
      ...(produit.unite !== undefined ? { unite: produit.unite } : {}),
      ...(origine ? { origine } : {}),
    }];
  }

  const totalAvant = existante.totalExact ?? existante.prix * existante.quantite;
  const totalAjoute = totalExact ?? produit.prix * q;
  const quantiteTotale = existante.quantite + q;
  return panier.map(l => l.ligneId !== existante.ligneId ? l : {
    ...l,
    quantite: quantiteTotale,
    // Le prix unitaire redevient une MOYENNE arrondie : c'est le total qui fait
    // foi, comme partout ailleurs sur l'argent.
    prix: Math.round((totalAvant + totalAjoute) / quantiteTotale),
    totalExact: totalAvant + totalAjoute,
    // L'origine se CUMULE : une ligne dictée puis complétée au doigt reste une
    // ligne où la voix a servi.
    ...(origine === 'vocal' || l.origine === 'vocal' ? { origine: 'vocal' as const } : {}),
  });
}

/** Retire UNE ligne, celle qu'on vise. Un identifiant inconnu ne change rien. */
export function retirerLigne(panier: readonly LignePanier[], ligneId: string): LignePanier[] {
  return panier.filter(l => l.ligneId !== ligneId);
}

/**
 * Change la quantité d'UNE ligne. Zéro ou moins la retire.
 *
 * `totalExact` est INVALIDÉ : il ne valait que pour la ligne telle qu'elle
 * avait été créée. Le garder ferait payer l'ancien total pour une nouvelle
 * quantité.
 */
export function changerQuantite(
  panier: readonly LignePanier[], ligneId: string, quantite: number,
): LignePanier[] {
  const q = Math.trunc(quantite);
  if (!Number.isFinite(q) || q <= 0) return retirerLigne(panier, ligneId);
  return panier.map(l => l.ligneId !== ligneId ? l : { ...l, quantite: q, totalExact: undefined });
}

/** Change le prix unitaire d'UNE ligne. `totalExact` est invalidé, même raison. */
export function changerPrix(
  panier: readonly LignePanier[], ligneId: string, prix: number,
): LignePanier[] {
  if (!Number.isFinite(prix) || prix < 0) return [...panier];
  return panier.map(l => l.ligneId !== ligneId ? l : { ...l, prix, totalExact: undefined });
}
