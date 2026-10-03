/**
 * ELLE DIT SON PRODUIT — STK-05.
 *
 * LE DÉFAUT. L'écran du stock imprimait sur son plus gros bouton :
 * « dis : "ajoute 10 piments à 500" ». Mesuré le 24/09 : `intentLocal` rend
 * `null` sur cette phrase exacte. Et `ajouter_stock` — l'action que le bloc
 * de réception attendait — n'a AUCUN producteur dans le dépôt : quatre
 * occurrences, toutes consommatrices. Le bloc était inatteignable.
 *
 * Elle disait donc exactement ce que l'écran lui dictait, et recevait « Je
 * n'ai pas bien compris. Redis-moi ça autrement. » Ce n'est pas un bouton
 * muet : c'est un bouton qui lui donne tort.
 *
 * LA CAUSE N'ÉTAIT PAS UNE GRAMMAIRE MANQUANTE. `extraire()` comprenait
 * déjà tout :
 *
 *     extraire("ajoute 10 piments à 500")  → produit "piment", qté 10, 500
 *     extraire("ajoute dix kilos de tomate") → "tomate", qté 10, « kilos »
 *     extraire("gombo")                    → produit "gombo"
 *
 * Seul `intention` restait vide — et `intentLocal`, qui ne sait fabriquer que
 * `vendre` et `depense`, jetait le reste. Le mot « ajoute » est même dans
 * `MOTS_PAS_UNE_VENTE` : il FERME une porte au lieu d'en ouvrir une.
 * L'information existait, et l'aval la jetait. Encore.
 *
 * CE MODULE NE DEVINE RIEN. Il lit ce qu'elle a dit et dit ce qui manque.
 * Aucune unité, aucun prix, aucun nom n'est inventé : ce que la phrase ne
 * donne pas, `AjoutProduitGuide` le LUI demande.
 *
 * L'APPARIEMENT SERT À NE PAS LA DÉDOUBLER, pas à choisir à sa place.
 * `apparierProduit` refuse déjà d'apparier quand plusieurs produits
 * pourraient correspondre — on garde alors son mot tel qu'elle l'a dit,
 * plutôt que de toucher le mauvais.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * STK-05b, 03/10 — SON ÉTAL SERT AUSSI À ENTENDRE, PAS SEULEMENT À CORRIGER.
 * CE MODULE ÉLARGIT SON RÔLE, ET VOICI POURQUOI.
 *
 * LE DÉFAUT, journal du 03/10, écran `/marchand/stock`. Elle dit « Deux
 * maniocs ». L'écran répond « Je n'ai pas entendu de produit. Dis-moi ce que
 * tu vends. » Trois fois de suite. LE MANIOC EST SUR SON ÉTAL. Reproduit :
 *
 *     « Deux maniocs »      → extraire.produit = null   → produitDit = NULL  ✗
 *     « Deux manioc »       → extraire.produit = manioc → OK
 *     « maniocs »           → null                                           ✗
 *     « Puis cinq piments » → piment                    → OK
 *
 * et, à la caisse, la MÊME phrase passait :
 *     lireVenteAuCatalogue('deux maniocs', [{nom:'Manioc'}]) → Manioc, 2  ✓
 *
 * LA CAUSE DE FOND N'ÉTAIT PAS LE PLURIEL MANQUANT dans `PRODUITS_FORMES`
 * (il l'était, il est comblé — mais cette table écrite à la main restera
 * toujours incomplète : 28 noms face aux 198 du catalogue du pilote). La
 * cause, c'est que ce module RECEVAIT SON ÉTAL et ne le consultait qu'APRÈS
 * qu'`extraire()` eut trouvé un nom, pour en corriger l'orthographe. Quand
 * `extraire()` rendait `null`, l'étal n'était JAMAIS lu : un produit qu'elle
 * vend déjà était refusé. L'information existait, et l'aval la jetait —
 * encore la même famille de défaut.
 *
 * CE QUI CHANGE, ET RIEN DE PLUS : quand `extraire()` ne rend aucun nom, on
 * relit la phrase contre SON étal avant de refuser. Par `nomDeSonEtal`, LA
 * fonction de la caisse (services/venteAuCatalogue.ts), jamais une seconde
 * écrite ici : deux façons de reconnaître un produit, c'est exactement le
 * défaut qu'on ferme — un mot compris d'un côté de l'application et refusé de
 * l'autre.
 *
 * LA RÈGLE, ELLE, NE BOUGE PAS. On n'a élargi que ce qu'on ÉCOUTE, jamais ce
 * qu'on décide :
 *   — Un nom hors de son étal ET hors du lexique reste `null`. On ne s'est
 *     pas mis à tout accepter : « Croisignam » (bruit réel du journal) est
 *     refusé, comme avant.
 *   — AMBIGUÏTÉ → `null`. Deux produits de son étal qui pourraient
 *     correspondre : on refuse, on ne choisit pas. `nomDeSonEtal` refuse
 *     déjà le doute, et `apparierProduit` est consulté par-dessus — c'est lui
 *     qui a le dernier mot sur « est-ce bien CE produit-là ».
 *   — Aucun prix, aucune unité, aucune quantité inventés. Le nombre relu par
 *     `relireNombres` est celui qu'elle a PRONONCÉ ; ce que la phrase ne
 *     donne pas, le parcours en trois questions le demande.
 */
import { extraire } from '../voice-offline/extraction';
import { apparierProduit } from './venteVocale';
import { nomDeSonEtal, relireNombres } from './venteAuCatalogue';
import { etapeCourante, type BrouillonProduit, type EtapeAjout } from './premierProduit';

export interface EcouteProduit {
  /** Ce qu'elle a donné, prêt à préremplir le parcours en trois questions. */
  brouillon: BrouillonProduit;
  /** Le nom EXACT tel qu'il figure déjà sur son étal, s'il n'y a aucun doute. */
  reconnu: string | null;
  /** La prochaine question à lui poser. Le parcours ne demande que ça. */
  manque: EtapeAjout;
  /**
   * LA QUANTITÉ ENTENDUE, CONSERVÉE SANS ÊTRE UTILISÉE.
   *
   * Le parcours en trois questions ne demande pas de stock (STK-03e : « une
   * marchande ne décrit pas son produit, elle le vend »), et `produitACreer`
   * pose délibérément `stock: 0`. Mais elle a bien dit « dix » : le jeter
   * serait la faute même qu'on ferme ici. On le garde, visible, en attendant
   * l'arbitrage sur le stock initial (voisin de STK-09).
   */
  quantite: number | null;
}

/**
 * Lit un produit dans ce qu'elle vient de dire.
 *
 * `null` quand aucun nom n'est compris : on ne prétend pas avoir entendu.
 * L'écran doit alors le dire, pas ouvrir un formulaire vide.
 */
export function produitDit(
  cequelleADit: string,
  sesProduits: readonly { nom: string }[] = [],
): EcouteProduit | null {
  const texte = (cequelleADit ?? '').trim();
  if (!texte) return null;

  const lu = extraire(texte);
  const nomParle = (lu.produit ?? '').trim();

  // ── LE CHEMIN NORMAL : le lexique a reconnu un nom ───────────────────────
  // Son propre nom l'emporte sur le mot dicté : « piment » devient
  // « Piment » si c'est ainsi qu'il est écrit sur son étal. Deux orthographes
  // du même produit, ce sont deux lignes et deux totaux (STK-17).
  if (nomParle) {
    const sien = apparierProduit(nomParle, sesProduits as { nom: string }[]);
    return composer(sien?.nom ?? nomParle, sien?.nom ?? null, lu.uniteParlee, lu.montant, lu.quantite);
  }

  // ── LE REPLI : SON ÉTAL (STK-05b) ────────────────────────────────────────
  // Le lexique n'a rien reconnu. Avant de lui dire « je n'ai pas entendu de
  // produit », on relit sa phrase contre ce QU'ELLE VEND — « Deux maniocs »
  // avec le Manioc sur l'étal. Même fonction que la caisse, à la marque de
  // pluriel près, et nom prononcé EN ENTIER : une preuve, pas une préférence.
  const surSonEtal = nomDeSonEtal(texte, sesProduits);
  if (!surSonEtal) return null;

  // ET C'EST `apparierProduit` QUI TRANCHE, COMME AVANT. Il refuse dès que
  // plusieurs produits pourraient être celui-là ; ici son refus vaut refus
  // tout court, car sans mot venu du lexique il ne resterait rien à garder
  // d'elle. Ambiguïté → `null` : on ne touche pas au mauvais produit.
  const sien = apparierProduit(surSonEtal, sesProduits as { nom: string }[]);
  if (!sien) return null;

  // LES NOMBRES, RELUS PAR LA RÈGLE DE LA CAISSE. Sans produit reconnu,
  // `extraire` range le « deux » de « Deux maniocs » en MONTANT : c'est une
  // quantité, et la prendre pour un prix mettrait 2 F sur son manioc.
  const nombres = relireNombres(texte, lu);
  // Nombre orphelin trop grand : ni quantité sûre, ni prix sûr. On garde le
  // produit — elle l'a bien nommé — et on ne retient AUCUN des deux nombres.
  // Le parcours en trois questions les lui redemandera ; inventer, non.
  const montant = nombres.douteux ? null : nombres.montant;
  const quantite = nombres.douteux ? null : nombres.quantite;

  return composer(sien.nom, sien.nom, lu.uniteParlee, montant, quantite);
}

/** Le même brouillon, par les deux chemins : un seul endroit où il se forme. */
function composer(
  nom: string,
  reconnu: string | null,
  uniteParlee: string | null,
  montant: number | null,
  quantite: number | null,
): EcouteProduit {
  const brouillon: BrouillonProduit = {
    nom,
    unite: (uniteParlee ?? '').trim(),
    // Un montant n'est un prix que s'il est strictement positif : « zéro »
    // entrerait en caisse et fausserait chaque vente (STK-01d).
    prix: typeof montant === 'number' && Number.isFinite(montant) && montant > 0
      ? montant
      : null,
  };

  return {
    brouillon,
    reconnu,
    manque: etapeCourante(brouillon),
    quantite: typeof quantite === 'number' && Number.isFinite(quantite) ? quantite : null,
  };
}
