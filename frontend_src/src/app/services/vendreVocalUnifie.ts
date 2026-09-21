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
 *   `MicroVenteCaisse.tsx`), c'est cette fonction qui parle.
 */
import {
  apparierProduit,
  construireLigneVocale,
  doitProposerCreation,
  type ProduitAppariable,
} from './venteVocale';
import { phraseAmbiguite, phraseCompris } from './dialoguesTata';
import { resoudrePrixVocal } from './prixVocal';
import { uniteEntendue } from '../utils/unite.utils';
import { t } from '../i18n/voice/runtime';

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
  /**
   * LE PRIX INTROUVABLE SE DEMANDE — correctif du 21/09/2026, terrain.
   *
   * Sans ce crochet, ce module ne savait que DIRE qu'il lui manquait le prix,
   * et seulement si le guidage vocal était actif. Sur le compte de Patrick
   * (catalogue VIDE, profil « je lis »), cela voulait dire : bandeau vert
   * « J'ai compris : Cinq tomates », puis RIEN — pas de ligne, pas un mot, pas
   * un écran. Une vente comprise disparaissait, et l'écran affirmait avoir
   * compris.
   *
   * L'appelant qui fournit ce crochet reçoit la vente comprise et conduit la
   * marchande à donner le prix — dans la caisse, c'est le chemin d'adoption
   * qui existe déjà (`POSCaisse`) : « {produit}. Quel est ton prix ? », puis
   * l'article entre au catalogue ET au panier. On n'invente toujours RIEN :
   * aucune ligne n'est ajoutée ici tant que le prix n'a pas été donné.
   *
   * Optionnel : un appelant qui ne sait pas demander (ex. la modale Tantie)
   * garde l'ancien comportement — Tata explique, et on s'arrête.
   */
  demanderPrix?: (demande: {
    /** Nom du produit tel qu'on l'a compris (catalogue si apparié, sinon dit). */
    nom: string;
    /** Quantité dite — pour qu'elle n'ait pas à la redire. */
    quantite: number;
    /** Unité prononcée, ou null si elle n'en a pas dit. */
    unite: string | null;
    /** Pourquoi on demande : aucun prix connu, unité qui ne concorde pas, ou
     *  montant dicté dont on ne sait pas s'il vaut pour un ou pour tous. */
    raison: 'prix_manquant' | 'unite_incompatible' | 'ambiguite_prix';
    /** Le montant dicté, UNIQUEMENT pour `ambiguite_prix` : c'est lui qu'on
     *  lui relit (« 500, c'est le prix d'un seul, ou de tous les 3 ? »). */
    montant?: number;
  }) => void;
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
 *      aucune écriture — et la vente n'est pas perdue pour autant : le prix
 *      est DEMANDÉ (`demanderPrix`), ou à défaut Tata le dit. Inventer un
 *      prix, c'est fausser son argent ; se taire, c'est lui laisser croire
 *      que la vente est passée.
 */
export function vendreVocalUnifie(
  nomParle: string | undefined,
  quantite: number,
  /** MONTANT dicté — et non « total », comme cette ligne l'a dit trop
   *  longtemps. « Trois tas de tomates à 500 » annonce un prix À L'UNITÉ :
   *  lire ce 500 comme le total de la vente l'enregistrait à son tiers.
   *  Ce qu'il représente est décidé en aval par `resoudrePrixVocal`, qui
   *  relaie `ligneProvisoire.resoudrePrix`. `0` (ou absent) signifie « rien
   *  n'a été dicté » — le prix du catalogue prend alors le relais. */
  montant: number,
  deps: DependancesVendreVocalUnifie,
  /** Unité RÉELLEMENT prononcée (« tas », « kilos »…), telle que l'extraction
   *  l'a vue, sans retouche. Sans elle, on ne peut pas savoir si le prix du
   *  catalogue est le bon — et quand il ne l'est pas, c'est SON mot qu'on lui
   *  redit (« Tu dis kilos… »), pas notre graphie. */
  uniteDictee?: string | null,
  /** CE QUE LA GRAMMAIRE A ENTENDU du montant — « à » (unitaire), « pour » ou
   *  une négociation (total), `null` si la phrase ne tranche pas. Vient de
   *  `extraction.lecturePrix`. Sans elle, un montant dicté sur une quantité
   *  supérieure à 1 que le catalogue ne confirme pas reste AMBIGU, et la
   *  vente attend une clarification au lieu d'être inventée. */
  lectureDictee?: 'unitaire' | 'total' | null,
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
    uniteParlee: uniteDictee,
    nomParle,
    lectureDictee,
  });

  if (prix.type !== 'prix') {
    // LA VENTE COMPRISE NE DISPARAÎT PLUS (21/09/2026). Quand l'appelant sait
    // demander un prix, on lui passe la main : la marchande finit sa vente en
    // donnant le montant, au lieu de recommencer sa phrase. C'est un ÉCRAN
    // autant qu'une parole : elle le voit même quand elle a coupé la voix —
    // c'est exactement le cas de terrain. Aucune ligne n'est ajoutée ici.
    if (deps.demanderPrix) {
      deps.demanderPrix({
        nom: prix.nom || (nomParle || '').trim(),
        quantite: qte,
        unite: uniteEntendue(uniteDictee),
        raison: prix.type,
        // L'ambiguïté se pose en lui RELISANT son propre chiffre : « 500,
        // c'est le prix d'un seul, ou de tous les 3 ? ». Sans le montant,
        // l'écran redemanderait un prix qu'elle vient de donner.
        ...(prix.type === 'ambiguite_prix' ? { montant: prix.montant } : {}),
      });
      return;
    }
    // On ne devine JAMAIS un prix, et on ne se tait pas non plus : le silence,
    // pour quelqu'un qui ne lit pas, veut dire « cette application ne marche
    // pas ». Chaque refus a son mot, pour qu'elle sache quoi redire.
    if (deps.guidageVocalActif()) {
      if (prix.type === 'unite_incompatible') {
        deps.speak(t('TATA_UNITE_INCOMPATIBLE', { uniteParlee: prix.uniteParlee, produit: prix.nom, uniteCatalogue: prix.uniteCatalogue }));
      } else if (prix.type === 'ambiguite_prix') {
        // On lui repose SA question, avec SES chiffres — et on ne pose rien
        // au panier tant qu'elle n'a pas répondu.
        deps.speak(phraseAmbiguite(prix.quantite, prix.montant));
      } else {
        deps.speak(
          prix.nom
            ? t('TATA_PRIX_INCONNU_PRODUIT', { produit: prix.nom })
            : t('TATA_PRIX_INCOMPRIS'),
        );
      }
    }
    return;
  }

  const ligne = construireLigneVocale({ nomParle, quantite: qte, montant: prix.total, produit: produitCat });

  // L'UNITÉ PARLÉE, DANS LA GRAPHIE DE LA BOUTIQUE — lot E. Elle dit « deux
  // tas de gombo », gombo est inconnu : la ligne libre posait « unité » en dur
  // pendant que Tata répétait « 2 tas de gombo ». Le reçu contredisait la
  // voix — deux sens à la même donnée. C'est CETTE valeur, et elle seule, qui
  // va sur la ligne ET dans la phrase dite ; « kilos » y devient « kg » pour
  // que la voix écrive comme le doigt (voir uniteEntendue). `null` si rien
  // n'a été prononcé : on n'invente pas une unité, on pose le défaut « unité »
  // de tout article libre.
  const uniteParlee = uniteEntendue(uniteDictee);

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
      { id: 'libre-' + deps.creerIdLigne(), nom: ligne.nom, prix: ligne.prix, categorie: 'Autre', stock: 0, unite: uniteParlee ?? 'unité' },
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
    // prononcée — la MÊME valeur que la ligne libre vient d'enregistrer, pas
    // une relecture du mot brut. Dire « 3 tas de tomate » au lieu de
    // « 3 tomates » est ce qui lui permet d'entendre un malentendu AVANT
    // d'encaisser.
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
            deps.speak(t('TATA_PRODUIT_INCONNU_AJOUTER', { produit: nomPropre }));
          }
        }, 2200);
      }
    } catch {
      /* jamais bloquant */
    }
  }
}
