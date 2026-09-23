/**
 * POSER UN PRODUIT SUR SON ÉTAL — STK-03 §2.
 *
 * TROIS QUESTIONS, PAS UNE DE PLUS : son nom, comment elle le vend, à combien.
 *
 * CE QU'ON NE DEMANDE PAS, ET POURQUOI. L'écran « nouveau produit » d'avant
 * réclamait catégorie, stock, seuil d'alerte, prix d'achat, date de péremption.
 * Aucune marchande ne décrit son produit comme ça — elle le vend. Chaque champ
 * en plus est une occasion d'abandonner, et pour une non-lectrice c'est une
 * occasion de plus de se tromper. Ce qui n'est pas demandé n'est pas inventé
 * pour autant : c'est laissé vide, et ça se voit.
 *
 * LE PRIX NE SE DEVINE JAMAIS — c'est STK-02, et c'est ici que ça se joue.
 * Tant qu'elle n'a pas donné son prix, LE PRODUIT N'EXISTE PAS. Ni zéro, ni
 * prix de catalogue, ni « on complétera plus tard » : un produit sans prix
 * entrerait en caisse et fausserait chaque vente faite avec lui.
 *
 * LE RÉFÉRENTIEL EST UNE AIDE, JAMAIS UNE PORTE. Un nom qu'il ne connaît pas
 * se pose quand même, tel qu'elle l'a dit. `catalogue_maitre` est de surcroît
 * PRÉSUMÉE VIDE en production : un parcours qui en dépendrait ne marcherait
 * chez personne.
 *
 * CE MODULE EST PUR. Ni React, ni DOM, ni appel réseau.
 */

/** Les trois questions, dans l'ordre où elles se posent. */
export type EtapeAjout = 'nom' | 'unite' | 'prix';

/** Ce qu'on a d'elle jusqu'ici. `prix: null` = elle ne l'a pas encore donné. */
export interface BrouillonProduit {
  readonly nom: string;
  readonly unite: string;
  readonly prix: number | null;
}

/**
 * Les unités les plus employées au marché, MESURÉES sur les 198 références du
 * référentiel maître (`unites_locales_autorisees`) : kg 96 %, tas 75 %,
 * sac 45 %, unité 39 %. Aucune n'est inventée.
 *
 * L'ordre est celui du DÉTAIL, pas du référentiel : une marchande de marché
 * vend au tas avant de vendre au sac.
 */
export const UNITES_DU_MARCHE = ['tas', 'kg', 'unité', 'sac'] as const;

const propre = (s: string) => s.trim();

/**
 * Où on en est. L'étape n'est pas un compteur qu'on incrémente : elle se
 * DÉDUIT de ce qu'on a d'elle. Un compteur peut avancer sans réponse ; ce
 * calcul, non.
 */
export function etapeCourante(b: BrouillonProduit): EtapeAjout {
  if (!propre(b.nom)) return 'nom';
  if (!propre(b.unite)) return 'unite';
  return 'prix';
}

/**
 * Les unités qu'on lui propose.
 *
 * SES UNITÉS D'ABORD — celles qu'elle emploie déjà sur son étal. C'est sa
 * donnée, elle est juste, et elle marche hors-ligne.
 *
 * POURQUOI PAS CELLES DU RÉFÉRENTIEL. Le CSV Odoo porte bien
 * `unites_locales_autorisees` par produit (Kponan → kg, sac, tas, unité), mais
 * la route de recherche ne les rend pas, et la table est présumée vide en
 * production. Proposer une liste qui dépend d'elle serait proposer du vide.
 *
 * « AUTRE » N'EST PAS DANS CETTE LISTE : ce n'est pas une unité, c'est un
 * geste — l'écran le porte à part, et elle y dit son mot à elle.
 */
export function unitesProposees(sesUnites: readonly string[]): string[] {
  const vues = new Set<string>();
  const sortie: string[] = [];
  for (const u of [...sesUnites, ...UNITES_DU_MARCHE]) {
    const v = propre(u);
    if (!v) continue;
    const cle = v.toLowerCase();
    if (vues.has(cle)) continue;
    vues.add(cle);
    sortie.push(v);
    // Six boutons au plus : au-delà, ce n'est plus un choix, c'est une liste.
    if (sortie.length >= 6) break;
  }
  return sortie;
}

/** Un prix d'elle : un nombre fini, strictement positif. Rien d'autre. */
function prixDelle(prix: number | null): number | null {
  return typeof prix === 'number' && Number.isFinite(prix) && prix > 0 ? prix : null;
}

export function produitPret(b: BrouillonProduit): boolean {
  return !!propre(b.nom) && !!propre(b.unite) && prixDelle(b.prix) !== null;
}

/**
 * Ce qui part à `addProduct` — la forme EXACTE de la primitive de l'étal
 * (`CaisseContext.addProduct`, celle qui alimente `products`). `null` tant
 * qu'il manque quelque chose d'ELLE.
 *
 * POURQUOI CETTE PRIMITIVE ET PAS CELLE DU STOCK. Les deux écrivent la même
 * table côté serveur, mais seule celle de la caisse rafraîchit `products` —
 * l'étal que l'écran de vente montre. Passer par l'autre obligerait à
 * resynchroniser derrière : deux chemins pour une même écriture, et deux
 * chances de diverger.
 */
export interface ProduitACreer {
  readonly nom: string;
  readonly prix: number;
  readonly unite: string;
  /** Elle n'a pas compté son stock : on n'invente pas une quantité. */
  readonly stock: 0;
  /** PAS NOTÉE, et c'est dit ainsi. « autre » serait une catégorie inventée —
   *  un mot qu'elle n'a pas prononcé et qui se lirait ensuite comme un fait. */
  readonly categorie: '';
}

export function produitACreer(b: BrouillonProduit): ProduitACreer | null {
  if (!produitPret(b)) return null;
  return {
    nom: propre(b.nom),
    prix: prixDelle(b.prix)!,
    unite: propre(b.unite),
    stock: 0,
    categorie: '',
  };
}
