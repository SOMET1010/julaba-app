/**
 * CAT-01 — CE QU'ELLE VEND EST DANS SON CATALOGUE, PAS DANS NOTRE LISTE.
 *
 * LE DÉFAUT, mesuré sur l'APK `0459dc0`. Le moteur d'extraction porte son
 * propre lexique en dur — 50 formes, 28 noms canoniques (tomate, piment, riz,
 * igname…). Le catalogue maître du pilote en compte 198. Résultat :
 *
 *   111 des 198 produits → « Je n'ai pas compris. Redis-moi. »
 *
 * Parmi eux : arachide (en coque, décortiquée, grillée), taro, macabo, niébé,
 * pois de terre, soja, sésame, échalote, poireau, épinard, amarante, kplala,
 * dah, oseille, chou, laitue, concombre, courgette, poivron, céleri, pomme de
 * terre, mil, sorgho, fonio. Une marchande de vivrier ne peut pas les vendre
 * à la voix, alors que son application les connaît par cœur.
 *
 * C'EST LA MÊME FAMILLE QUE VOIX-07 ET PAN-01 : l'information EXISTE — son
 * catalogue est chargé, avec ses noms à elle — et l'aval ne la lit pas. Le
 * moteur compare sa phrase à une liste écrite dans le code, pas à ce qu'elle
 * vend.
 *
 * POURQUOI ICI, ET PAS DANS LE MOTEUR. `intentLocal` sert toutes les surfaces
 * et son comportement est GELÉ par l'empreinte d'argent du lot i18n. La
 * caisse, elle, a déjà sa seconde porte nommée (`intentLocalCaisse`, 21/09) et
 * son commentaire dit la règle : « cet écran-ci est fait pour bouger, et c'est
 * lui, et lui seul, qui porte cette lecture ». Ce module est le même choix,
 * une marche plus loin : il ne s'applique QU'À CE QUE LE MOTEUR N'A PAS
 * COMPRIS, donc il ne peut rien recouvrir ni doubler.
 *
 * IL N'ÉCRIT AUCUN ARGENT, et n'en invente aucun. Il rend une intention de
 * vente au MÊME format que le moteur ; le prix reste résolu en aval par
 * `resoudrePrixVocal` — montant dicté d'abord, prix du catalogue ensuite, et
 * à défaut le prix est DEMANDÉ. Jamais une ligne à 0 F.
 *
 * ET IL REFUSE LE DOUTE. Deux produits de son catalogue reconnus dans la même
 * phrase sans qu'aucun ne l'emporte clairement : rien. C'est la prudence
 * d'`apparierProduit`, qui rend `null` plutôt que de choisir — sur l'argent,
 * on ne devine pas.
 */
import { extraire } from '../voice-offline/extraction';
import { interditDeVendre } from '../voice-offline/localIntent';
import { detecterEncaissement } from '../voice-offline/grammaireEncaissement';

/** Le strict nécessaire d'un produit de sa boutique. */
export interface ProduitNomme {
  readonly nom: string;
}

/**
 * Une vente lue au catalogue, au FORMAT DE L'ACTION DU MOTEUR — c'est ce qui
 * permet à l'écran de la faire suivre sans écrire un second chemin de vente.
 */
export interface VenteAuCatalogue {
  readonly type: 'vendre';
  /** LE NOM DU CATALOGUE, tel qu'elle l'a enregistré — pas notre canonique.
   *  C'est lui qui permettra à `apparierProduit` de retrouver EXACTEMENT son
   *  produit, avec son prix et son unité. */
  readonly produit: string;
  readonly quantite: number;
  readonly montant?: number;
  readonly unite?: string;
}

/** Normalisation de comparaison : minuscules, sans accents, mots séparés. */
function mots(texte: string): string[] {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * ELLE DIT « DEUX ARACHIDES GRILLÉES », SON CATALOGUE DIT « ARACHIDE GRILLÉE ».
 *
 * C'est la même règle de pluriel que `accordFrancais.pluriel` (+s sauf s/x/z),
 * lue à l'envers : on compare les mots à leur marque de nombre près. Sans
 * cela, la moitié des produits resteraient invisibles pour la seule raison
 * qu'elle en vend plusieurs — c'est-à-dire précisément quand elle vend.
 */
function racine(mot: string): string {
  return mot.length > 2 && /[sx]$/.test(mot) ? mot.slice(0, -1) : mot;
}

/** Le nom du produit apparaît-il en entier, mot à mot, dans la phrase ? */
function contientSuite(phrase: string[], nom: string[]): boolean {
  if (nom.length === 0 || nom.length > phrase.length) return false;
  for (let i = 0; i + nom.length <= phrase.length; i++) {
    let tous = true;
    for (let j = 0; j < nom.length; j++) {
      if (racine(phrase[i + j]) !== racine(nom[j])) { tous = false; break; }
    }
    if (tous) return true;
  }
  return false;
}

/**
 * Lit la phrase contre SON catalogue. `null` dès qu'il y a le moindre doute —
 * et le doute profite toujours au silence, jamais à une ligne inventée.
 */
export function lireVenteAuCatalogue(
  texte: string,
  produits: readonly ProduitNomme[] | null | undefined,
): VenteAuCatalogue | null {
  if (!texte || !texte.trim() || !produits || produits.length === 0) return null;

  // LES MÊMES INTERDITS QUE LE MOTEUR, par la même fonction : une phrase qu'il
  // refuse de lire comme une vente ne doit pas en devenir une ici.
  if (interditDeVendre(texte)) return null;

  // NI UNE COMMANDE D'ENCAISSEMENT. « annule deux taro » n'est pas une vente
  // de deux taros : c'est un refus qui nomme ce qu'il refuse. Dans le flux
  // réel, le moteur les attrape avant nous ; on le vérifie quand même ici,
  // parce qu'un module pur doit être juste TOUT SEUL — c'est la seule façon
  // qu'il reste juste quand un appelant change.
  if (detecterEncaissement(texte)) return null;

  const p = extraire(texte);

  // UNE DÉPENSE N'EST PAS UNE VENTE. « J'ai acheté deux sacs de riz » : le
  // moteur l'a laissée passer faute de montant, et la reprendre comme une
  // vente inverserait le sens de son argent. Seules une intention de VENTE,
  // ou aucune intention du tout, ouvrent cette porte.
  if (p.intention !== null && p.intention !== 'vente') return null;

  // SON CATALOGUE PASSE AVANT NOTRE LISTE, MÊME QUAND LE MOTEUR A UN MOT.
  //
  // On ne s'arrête pas à « le moteur a trouvé un produit ». Il trouve « riz »
  // dans « vends trois riz parfumé » — un mot de SA liste à lui, qui désigne
  // six produits du catalogue maître et n'en désigne donc aucun :
  // `apparierProduit` rend `null` et Tata redemande le prix à chaque vente.
  // Mesuré : une marchande qui tient six riz ne peut JAMAIS vendre du riz à
  // la voix sans dicter son prix.
  //
  // Ici, une correspondance n'est retenue que si le nom du catalogue est
  // prononcé EN ENTIER dans la phrase — « riz parfumé », deux mots, contre le
  // seul « riz » du lexique. C'est une preuve plus forte, pas une préférence.
  // Quand la phrase ne porte qu'un mot générique, ce module rend `null` et
  // l'appelant garde le résultat du moteur : rien n'est retiré à personne.

  // ── LE NOMBRE ORPHELIN EST UNE QUANTITÉ, PAS UN PRIX ────────────────────
  //
  // C'EST UN DÉFAUT D'ARGENT, mesuré sur `0459dc0` en écrivant ce module.
  // Sans produit reconnu, `extraire` n'a rien à quoi rattacher le nombre et
  // le range en MONTANT :
  //
  //   « vends deux arachide grillée » → { produit: null, quantite: null,
  //                                       montant: 2, lecturePrix: null }
  //
  // et une ligne « Produit vocal » à 2 F partait au panier, en silence,
  // pendant que l'écran affichait « Je n'ai pas compris. Redis-moi. »
  // Comparaison avec un produit CONNU du lexique, qui donne la vérité :
  //   « vends deux tomate » → { produit: 'tomate', quantite: 2, montant: null }
  //
  // CE QUI DISTINGUE LES DEUX, ET CE N'EST PAS UNE DEVINETTE : un vrai prix
  // arrive derrière un marqueur (« à », « pour »), et `extraire` le note dans
  // `lecturePrix`. Un nombre SEUL, sans marqueur et sans produit, est le
  // nombre d'articles — « vends arachide grillée à 500 » garde bien son prix
  // (lecturePrix « unitaire »), et « vends deux arachide grillée à 500 » a
  // déjà ses deux nombres séparés.
  const nombreOrphelin = p.quantite == null && p.montant != null && p.lecturePrix === null;
  // AU-DELÀ, ON NE DEVINE PLUS. « arachide grillée cinq mille » peut être
  // 5 000 articles comme 5 000 francs : le doute profite au silence, pas à une
  // ligne de dix mille francs ni à un panier de cinq mille tas.
  const MAX_QUANTITE_DITE = 100;
  if (nombreOrphelin && (p.montant as number) > MAX_QUANTITE_DITE) return null;

  const quantiteLue = nombreOrphelin ? (p.montant as number) : p.quantite;
  const montantLu = nombreOrphelin ? null : p.montant;

  // MÊME EXIGENCE QUE `venteSansVerbe` DANS LE MOTEUR : sans verbe de vente, il
  // faut au moins une quantité. « Arachide » tout seul, dit au hasard, n'est
  // pas une vente ; « deux arachides grillées » en est une. On ne remplace pas
  // une consigne par une plus pauvre.
  if (p.intention !== 'vente' && quantiteLue == null) return null;

  const phrase = mots(texte);
  let retenu: string | null = null;
  let longueur = 0;
  let ambigu = false;
  for (const prod of produits) {
    const nom = mots(prod.nom || '');
    if (!contientSuite(phrase, nom)) continue;
    // LE PLUS PRÉCIS GAGNE : « riz importé long grain » l'emporte sur « riz ».
    // C'est le seul cas où choisir est sûr — le nom le plus long est contenu
    // dans la phrase, donc elle l'a bien prononcé en entier.
    if (nom.length > longueur) { retenu = prod.nom; longueur = nom.length; ambigu = false; }
    else if (nom.length === longueur && prod.nom !== retenu) ambigu = true;
  }
  if (!retenu || ambigu) return null;

  const quantite = quantiteLue != null && quantiteLue > 0 ? Math.trunc(quantiteLue) : 1;
  const vente: VenteAuCatalogue = {
    type: 'vendre',
    produit: retenu,
    quantite,
    // Sans montant dicté, on n'en annonce aucun : le prix viendra de SON
    // catalogue, par `resoudrePrixVocal`, exactement comme pour le tactile.
    ...(montantLu != null ? { montant: montantLu } : {}),
    ...(p.uniteParlee ? { unite: p.uniteParlee } : {}),
  };
  return vente;
}
