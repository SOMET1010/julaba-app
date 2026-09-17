/**
 * Convergence voix/tactile POS — Lot 2 : « vendre » devient un AJOUT AU
 * PANIER, jamais un encaissement direct. Le panier reste la seule source de
 * vérité (`CaisseContext.cart`) ; l'encaissement reste exclusivement le
 * bouton tactile « Payer en espèces » (`POSCaisse.handlePay`).
 *
 * Module PUR au sens fort (voir Lot 1) : aucun accès direct à l'environnement
 * applicatif. Tout ce qui touchait un global reste injecté via
 * `DependancesVendreVocalUnifie`.
 *
 * Différences avec la version Lot 1 (qui appelait `enregistrerVente`
 * directement) :
 * - plus d'écriture financière ici — `addToCart`, exactement la même
 *   fonction que `POSCaisse`/`ajouterLigneAuPanier` (chemin guidé) ;
 * - plus de bloc « avertissement de rupture » ni de refetch du stock : ces
 *   effets n'ont de sens qu'APRÈS un encaissement réel, qui n'a pas encore
 *   eu lieu ici (le stock ne bouge qu'à `POSCaisse.handlePay`) ;
 * - le feedback est désormais « C'est dans le panier. » (jamais « Ta vente
 *   est enregistrée. ») — `useVoiceCore` ne parle plus rien lui-même pour
 *   cette intention (voir `confirmationBypassIntents` dans
 *   `VenteVocaleModal.tsx`), c'est cette fonction qui parle.
 */
import {
  apparierProduit,
  construireLigneVocale,
  doitProposerCreation,
  type ProduitAppariable,
} from './venteVocale';
import { phraseCompris } from './dialoguesTata';

/**
 * Forme minimale attendue par `CaisseContext.addToCart` — reprise ici plutôt
 * qu'importée (ce module reste un service PUR, sans dépendance vers un
 * fichier de contexte React). Toute valeur satisfaisant cette forme satisfait
 * aussi le vrai `CaisseProduct` (dont tous les autres champs sont optionnels).
 */
export interface ProduitPourPanier {
  id: string;
  nom: string;
  prix: number;
  categorie: string;
  stock: number;
  unite: string;
  prix_achat?: number;
  prix_promo?: number | null;
  promo_fin?: string | null;
}

export interface DependancesVendreVocalUnifie {
  /** Catalogue courant, pour l'appariement du nom dicté. */
  products: ProduitAppariable[];
  /** Effet métier ACTUEL (Lot 2) : ajoute une ligne au panier PARTAGÉ — même
   * fonction que POSCaisse/ajouterLigneAuPanier, jamais une écriture séparée.
   * 3e argument : total EXACT dicté pour cette ligne (voir CartItem.totalExact
   * dans CaisseContext.tsx) — en FCFA, 500/3 ne retombe pas juste ; `prix` n'est
   * qu'un unitaire arrondi, c'est ce total qui doit faire foi pour le panier. */
  addToCart: (produit: ProduitPourPanier, quantite: number, totalExact?: number) => void;
  /** Synthèse vocale — jamais appelée sans être gardée par `guidageVocalActif()`. */
  speak: (texte: string) => void;
  /** Retour haptique de succès (même geste que le chemin guidé). */
  vibrerSucces: () => void;
  /** Notification visuelle (toast) de l'ajout — texte déjà construit par ce module. */
  notifierAjoutPanier: (message: string) => void;
  /** Remplace l'état React local `propositionProduit` de la modale. */
  proposerCreationProduit: (proposition: { nom: string; prix: number }) => void;
  /** Mémoire des refus de création, par produit — interface minimale, pas tout `Storage`. */
  stockage: Pick<Storage, 'getItem' | 'setItem'> | null;
  /** Remplace `navigator.onLine !== false`. */
  estEnLigne: () => boolean;
  /** Génère un id UNIQUE pour une ligne libre (produit non apparié) — jamais
   * dérivé du nom. `addToCart` fusionne sur `id` en ne faisant qu'AUGMENTER
   * LA QUANTITÉ, sans reprendre le nouveau prix : un id stable par nom
   * ferait donc silencieusement écraser le prix d'un second ajout du même
   * produit inconnu à un prix différent (ex. « 2 piments à 1000 » puis
   * « 1 piment à 700 » ne doivent JAMAIS fusionner en une seule ligne à
   * 500/unité). Même principe que `ajouterLigneAuPanier` (chemin guidé),
   * qui utilise l'id unique de sa `LigneProvisoire`. */
  creerIdLigne: () => string;
  /** Remplace `setTimeout` — délai de 2200ms déterministe en test. */
  planifier: (effet: () => void, delaiMs: number) => void;
  /** Remplace `guidageVocal()` — préférence globale, jamais lue directement ici. */
  guidageVocalActif: () => boolean;
}

export function vendreVocalUnifie(
  nomParle: string | undefined,
  quantite: number,
  montant: number,
  deps: DependancesVendreVocalUnifie,
): void {
  const produitCat = apparierProduit(nomParle || '', deps.products);
  const ligne = construireLigneVocale({ nomParle, quantite, montant, produit: produitCat });

  if (produitCat) {
    // Produit APPARIÉ : vrai produit du catalogue (prix d'achat → marge
    // réelle à l'encaissement futur, stock décrémenté SEULEMENT à ce
    // moment-là — pas ici), au prix dicté (le négoce prime, on neutralise la
    // promo catalogue) — mêmes règles que ajouterLigneAuPanier.
    // `categorie` n'est pas déclaré sur ProduitAppariable (appariement par
    // nom/prix/stock uniquement) mais le VRAI produit du catalogue l'a
    // toujours — repli sur 'Autre' uniquement si absent en pratique.
    const categorie = (produitCat as unknown as { categorie?: string }).categorie ?? 'Autre';
    // `ligne.total` = montant dicté exact (voir construireLigneVocale) — jamais
    // `ligne.prix * quantite`, qui rearrondirait un montant non divisible.
    deps.addToCart({ ...produitCat, categorie, prix: ligne.prix, prix_promo: null, promo_fin: null }, quantite, ligne.total);
  } else {
    // Produit inconnu → ligne libre (comme « Autre article »), id TOUJOURS
    // unique (voir DependancesVendreVocalUnifie.creerIdLigne) : deux énoncés
    // du même produit inconnu créent deux lignes distinctes plutôt que de
    // risquer d'écraser silencieusement un prix différent.
    deps.addToCart(
      { id: 'libre-' + deps.creerIdLigne(), nom: ligne.nom, prix: ligne.prix, categorie: 'Autre', stock: 0, unite: 'unité' },
      quantite,
      ligne.total,
    );
  }

  deps.vibrerSucces();
  deps.notifierAjoutPanier(`C'est dans le panier : ${quantite} × ${ligne.nom}`);
  // Tata dit CE QU'ELLE A COMPRIS, pas seulement qu'elle a fait quelque chose :
  // c'est le seul moment où une marchande qui ne lit pas peut détecter un
  // malentendu sur la quantité ou le montant. Voir phraseCompris().
  if (deps.guidageVocalActif()) {
    deps.speak(phraseCompris({ nom: ligne.nom, quantite, total: ligne.total }));
  }

  if (!produitCat) {
    // Proposer l'ajout au catalogue (en ligne seulement — la création parle
    // au serveur). Après le feedback d'ajout, jamais bloquant dessus.
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
