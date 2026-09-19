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
import { resoudrePrixVocal } from './prixVocal';

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
   * qu'un unitaire arrondi, c'est ce total qui doit faire foi pour le panier.
   * 4e argument : l'ORIGINE de la ligne. Ce module appelle toujours avec
   * 'vocal' — c'est ce qui permet à la vente d'être retrouvée dans l'onglet
   * « Par la voix ». Sans lui, une vente dictée est indiscernable d'une vente
   * tapée au doigt. */
  addToCart: (produit: ProduitPourPanier, quantite: number, totalExact?: number, origine?: 'vocal') => void;
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

/**
 * LE PRIX PEUT VENIR DU CATALOGUE — correctif du 18/09/2026.
 *
 * Patrick, sur appareil réel, dit « un tas de piment ». Il ne se passe RIEN :
 * pas de ligne, pas un mot de Tata. Or l'analyse comprend parfaitement la
 * phrase — intention=vente, produit=piment, quantité=1 — il ne manque que le
 * montant, que le catalogue connaît.
 *
 * Une marchande ne dit pas « un tas de piment à cent cinquante francs ». Elle
 * dit « un tas de piment » : le prix, elle et sa cliente le savent, il est sur
 * le produit et dans sa boutique. Exiger qu'elle le récite à chaque vente,
 * c'est lui demander de parler comme une caisse enregistreuse.
 *
 * L'ORDRE DE PRIORITÉ, et il n'est pas négociable :
 *   1. le montant DICTÉ gagne toujours — une marchande négocie, et ce qu'elle
 *      dit prime sur le prix enregistré ;
 *   2. sinon, prix du catalogue × quantité ;
 *   3. sinon (produit inconnu, ou prix catalogue à zéro) : AUCUNE ligne,
 *      aucune écriture, et Tata le DIT. Inventer un prix, c'est fausser son
 *      argent ; se taire, c'est lui laisser croire que la vente est passée.
 */
export function vendreVocalUnifie(
  nomParle: string | undefined,
  quantite: number,
  /** Total dicté. `0` (ou absent) signifie « rien n'a été dicté » — le prix du
   *  catalogue prend alors le relais. */
  montant: number,
  deps: DependancesVendreVocalUnifie,
  /** Unité RÉELLEMENT prononcée (« tas », « kilos »…), si l'extraction l'a vue.
   *  Sans elle, on ne peut pas savoir si le prix du catalogue est le bon. */
  uniteParlee?: string | null,
): void {
  const produitCat = apparierProduit(nomParle || '', deps.products);
  const qte = quantite > 0 ? quantite : 1;

  // Une seule fonction décide du prix — et dit POURQUOI quand elle ne peut pas.
  // Voir prixVocal.ts : montant dicté prioritaire, sinon prixEffectif (la même
  // fonction que le tactile, promotions comprises) à condition que l'unité
  // prononcée concorde avec celle du produit.
  const prix = resoudrePrixVocal({
    montantDicte: montant,
    quantite: qte,
    produit: produitCat as never,
    uniteParlee,
    nomParle,
  });

  if (prix.type !== 'prix') {
    // On ne devine JAMAIS un prix, et on ne se tait pas non plus : le silence,
    // pour quelqu'un qui ne lit pas, veut dire « cette application ne marche
    // pas ». Chaque refus a son mot, pour qu'elle sache quoi redire.
    if (deps.guidageVocalActif()) {
      if (prix.type === 'unite_incompatible') {
        deps.speak(
          `Tu dis ${prix.uniteParlee}, mais ${prix.nom} est au prix du ${prix.uniteCatalogue}. Dis-moi combien tu l'as vendu.`,
        );
      } else {
        deps.speak(
          prix.nom
            ? `Je n'ai pas le prix de ${prix.nom}. Redis-moi combien tu l'as vendu.`
            : "Je n'ai pas compris le prix. Redis-moi combien tu as vendu.",
        );
      }
    }
    return;
  }

  const ligne = construireLigneVocale({ nomParle, quantite: qte, montant: prix.total, produit: produitCat });

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
    // `'vocal'` : cette vente vient de la voix, et l'écran « Ventes passées »
    // doit pouvoir le retrouver. Ce chemin-ci l'oubliait — il passait par
    // deps.addToCart, pas par les appels directs de la modale.
    deps.addToCart({ ...produitCat, categorie, prix: ligne.prix, prix_promo: null, promo_fin: null }, qte, ligne.total, 'vocal');
  } else {
    // Produit inconnu → ligne libre (comme « Autre article »), id TOUJOURS
    // unique (voir DependancesVendreVocalUnifie.creerIdLigne) : deux énoncés
    // du même produit inconnu créent deux lignes distinctes plutôt que de
    // risquer d'écraser silencieusement un prix différent.
    deps.addToCart(
      { id: 'libre-' + deps.creerIdLigne(), nom: ligne.nom, prix: ligne.prix, categorie: 'Autre', stock: 0, unite: 'unité' },
      qte,
      ligne.total,
      'vocal',
    );
  }

  deps.vibrerSucces();
  deps.notifierAjoutPanier(`C'est dans le panier : ${qte} × ${ligne.nom}`);
  // Tata dit CE QU'ELLE A COMPRIS, pas seulement qu'elle a fait quelque chose :
  // c'est le seul moment où une marchande qui ne lit pas peut détecter un
  // malentendu sur la quantité ou le montant. Voir phraseCompris().
  if (deps.guidageVocalActif()) {
    // L'unité RETENUE est celle du produit du catalogue quand il est apparié
    // (c'est elle qui a servi à décider du prix), sinon celle qu'elle a
    // prononcée. Dire « 3 tas de tomate » au lieu de « 3 tomates » est ce qui
    // lui permet d'entendre un malentendu AVANT d'encaisser.
    const uniteLigne = produitCat?.unite || uniteParlee || null;
    deps.speak(phraseCompris({ nom: ligne.nom, quantite: qte, total: ligne.total, unite: uniteLigne }));
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
