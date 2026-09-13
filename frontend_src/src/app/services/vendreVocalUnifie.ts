/**
 * Extraction mécanique de `vendreUnifie` (Convergence voix/tactile POS, Lot 1).
 *
 * Ce module reproduit EXACTEMENT le comportement du closure `vendreUnifie`
 * qui vivait jusqu'ici dans `VenteVocaleModal.tsx` — même ordre d'effets,
 * mêmes délais (1400ms/2200ms), même permissivité du try/catch. Aucun
 * changement métier : la vente vocale reconnue continue d'appeler
 * directement `enregistrerVente` (elle ne touche pas encore au panier —
 * ce sera le Lot 2).
 *
 * Module PUR au sens fort : aucun accès direct à l'environnement applicatif
 * (pas de React, pas de `window`, pas de `navigator`, pas de `setTimeout`,
 * pas de préférence de guidage globale). Tout ce qui touchait un global est
 * injecté via `DependancesVendreVocalUnifie`, pour rester testable sans DOM
 * et pour que le Lot 2 (qui remplacera l'effet `enregistrerVente` par un
 * ajout au panier) n'ait qu'UNE dépendance à changer, pas 30 lignes de
 * closure à démêler.
 */
import {
  apparierProduit,
  construireLigneVocale,
  doitProposerCreation,
  type LigneVenteVocale,
  type ProduitAppariable,
} from './venteVocale';
import { avertissementRupture } from './ruptureStock';

export interface DependancesVendreVocalUnifie {
  /** Catalogue courant, pour l'appariement du nom dicté. */
  products: ProduitAppariable[];
  /** Effet métier ACTUEL : enregistre la vente (identique à POSCaisse.handlePay). */
  enregistrerVente: (montant: number, lignes: LigneVenteVocale[], moyen: string, note: string) => Promise<unknown>;
  /** Recharge le catalogue depuis le serveur après la vente (le backend reste seul maître du stock). */
  refreshProducts: () => unknown;
  /** Synthèse vocale — jamais appelée sans être gardée par `guidageVocalActif()`. */
  speak: (texte: string) => void;
  /** Remplace l'état React local `propositionProduit` de la modale. */
  proposerCreationProduit: (proposition: { nom: string; prix: number }) => void;
  /** Mémoire des refus de création, par produit — interface minimale, pas tout `Storage`. */
  stockage: Pick<Storage, 'getItem' | 'setItem'> | null;
  /** Remplace `navigator.onLine !== false`. */
  estEnLigne: () => boolean;
  /** Remplace `setTimeout` — injecté pour rendre les délais 1400ms/2200ms déterministes en test. */
  planifier: (effet: () => void, delaiMs: number) => void;
  /** Remplace `guidageVocal()` — préférence globale, jamais lue directement ici. */
  guidageVocalActif: () => boolean;
}

export async function vendreVocalUnifie(
  nomParle: string | undefined,
  quantite: number,
  montant: number,
  note: string,
  deps: DependancesVendreVocalUnifie,
): Promise<void> {
  const produitCat = apparierProduit(nomParle || '', deps.products);
  const ligne = construireLigneVocale({ nomParle, quantite, montant, produit: produitCat });
  await deps.enregistrerVente(montant, [ligne], 'cash', note);

  if (produitCat) {
    // Rupture éventuelle : calculée AVANT le décrément (le backend décrémente,
    // pas nous — voir refreshProducts ci-dessous).
    const avertRupture = avertissementRupture([
      {
        nom: (produitCat as { nom?: string; name?: string }).nom || (produitCat as { name?: string }).name || nomParle || 'ce produit',
        quantite,
        stockAvant: produitCat.stock || 0,
      },
    ]);
    // Stock : le BACKEND est seul maître (même doctrine que POSCaisse) — on
    // reflète l'état autoritaire par un simple refetch, jamais un recalcul local.
    void deps.refreshProducts();
    // Avertir APRÈS la confirmation parlée de la vente, pour ne pas parler par-dessus.
    if (avertRupture && deps.guidageVocalActif()) {
      deps.planifier(() => deps.speak(avertRupture), 1400);
    }
  } else {
    // Produit inconnu : proposer de l'ajouter à la boutique (en ligne
    // seulement — la création parle au serveur). La question arrive APRÈS
    // la confirmation parlée de la vente, pour ne pas parler par-dessus.
    try {
      if (deps.estEnLigne() && doitProposerCreation(deps.stockage, nomParle, deps.products)) {
        const nomPropre = (nomParle || '').trim();
        deps.planifier(() => {
          deps.proposerCreationProduit({ nom: nomPropre, prix: ligne.prix });
          if (deps.guidageVocalActif()) {
            deps.speak(`Je ne connais pas ${nomPropre} dans ta boutique. Je l'ajoute ?`);
          }
        }, 2200);
      }
    } catch {
      /* jamais bloquant */
    }
  }
}
