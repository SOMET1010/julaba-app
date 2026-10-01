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
import { extraire, UNITES, DIZAINES, MOTS_UNITE, MARQUEURS_AVANT, MARQUEURS_APRES } from '../voice-offline/extraction';
import { INTENTIONS_MAP, PRODUITS_FORMES } from '../voice-offline/vocabulaire';
import { UNITES_INVARIABLES } from './accordFrancais';
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
  //
  // F4NT-B — « FRANCS » EST UNE PREUVE, ET ELLE ÉTAIT JETÉE. 01/10/2026.
  //
  // Rapport terrain F4NT. Mesuré avant correction, sur un étal réel :
  //     « Arachide grillée mille francs » → null   (rien au panier, « pas compris »)
  //     « attiéké 300 francs »            → null
  // La cause n'était PAS l'exigence de quantité : c'est que 1000 était pris
  // pour MILLE ARTICLES, donc rejeté par le plafond de prudence ci-dessous.
  //
  // Or la phrase portait le discriminant : elle a dit « FRANCS ». Personne ne
  // dit « francs » pour compter des tas. `extraire` connaît ce marqueur —
  // MARQUEURS_APRES, déjà importé ici — et ne le note que dans le calcul du
  // montant, jamais dans `lecturePrix` (réservé aux marqueurs AVANT : « à
  // 500 », « pour 500 »). L'information existait dans la phrase, et deux
  // modules la laissaient tomber.
  //
  // C'EST LA LISTE DU DÉPÔT, pas une seconde écrite pour l'occasion : deux
  // listes de marqueurs de monnaie finiraient par vendre mille tas d'arachide.
  const direEnFrancs = mots(texte).some((m) => MARQUEURS_APRES.has(m));
  const nombreOrphelin = p.quantite == null && p.montant != null && p.lecturePrix === null
    && !direEnFrancs;
  // AU-DELÀ, ON NE DEVINE PLUS. « arachide grillée cinq mille » peut être
  // 5 000 articles comme 5 000 francs : le doute profite au silence, pas à une
  // ligne de dix mille francs ni à un panier de cinq mille tas.
  const MAX_QUANTITE_DITE = 100;
  if (nombreOrphelin && (p.montant as number) > MAX_QUANTITE_DITE) return null;

  const quantiteLue = nombreOrphelin ? (p.montant as number) : p.quantite;
  const montantLu = nombreOrphelin ? null : p.montant;

  // MÊME EXIGENCE QUE `venteSansVerbe` DANS LE MOTEUR, et elle bouge AVEC lui —
  // F4NT-B, 01/10/2026 : sans verbe de vente, il faut une quantité **OU** un
  // montant. Jamais ni l'un ni l'autre.
  //
  // « Arachide » tout seul, dit au hasard, n'est toujours PAS une vente ;
  // « deux arachides grillées » en est une ; « arachide grillée mille francs »
  // en est une aussi, et c'est ce que le terrain a montré. Les deux portes
  // gardent la MÊME exigence, par construction : si l'une devenait plus
  // permissive que l'autre, « tomate mille francs » vaudrait une vente pour les
  // 28 produits du lexique et un « pas compris » pour les 111 autres — la même
  // phrase avec deux sens selon le produit.
  if (p.intention !== 'vente' && quantiteLue == null && montantLu == null) return null;

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


// ── CAT-02 — « PRODUIT VOCAL À 2 F » : LE NOMBRE ORPHELIN, HORS CATALOGUE ──
//
// LE DÉFAUT, reproduit dans un vrai navigateur. Elle dit « vends deux mangues
// séchées » — un produit qu'elle NE VEND PAS. `extraire` n'a aucun produit à
// quoi rattacher le nombre et le range en MONTANT :
//
//   { produit: null, quantite: null, montant: 2, lecturePrix: null }
//
// et une ligne « Produit vocal » à DEUX FRANCS partait au panier, en silence.
// CAT-01 ferme ce cas pour tous les produits de SON catalogue ; celui-ci le
// ferme pour ce qu'elle nomme et que personne ne connaît.
//
// CE QU'IL NE FAUT SURTOUT PAS CASSER — arbitrage implicite de ce lot :
// L'ARTICLE LIBRE VOCAL est un usage RÉEL. « vends pour 500 », « vends à
// 500 », « vends 500 » : elle vend quelque chose qu'elle ne veut pas nommer,
// pour 500 F. Cette ligne-là doit continuer de partir.
//
// LE DISCRIMINANT N'EST PAS LA TAILLE DU NOMBRE — ce serait une devinette, et
// « vends 50 » deviendrait cinquante articles. C'est :
//
//     A-T-ELLE NOMMÉ QUELQUE CHOSE APRÈS LE NOMBRE ?
//
//   « vends deux mangues séchées » → elle a nommé  → 2 est une QUANTITÉ
//   « vends 500 »                  → elle n'a rien nommé → 500 est un PRIX
//
// Et la question se pose avec les LISTES DU MOTEUR LUI-MÊME (nombres, unités,
// marqueurs de prix, verbes d'intention, produits connus), jamais avec une
// seconde liste écrite ici : deux listes finissent toujours par diverger.

/** Les mots qui ne NOMMENT rien — ils comptent, mesurent, ou annoncent. */
function motOutil(mot: string): boolean {
  if (/^[0-9]+$/.test(mot)) return true;
  if (mot in UNITES || mot in DIZAINES) return true;
  if (mot === 'cent' || mot === 'cents' || mot === 'mille' || mot === 'et') return true;
  if (MOTS_UNITE.has(mot)) return true;
  if (MARQUEURS_AVANT.has(mot) || MARQUEURS_APRES.has(mot)) return true;
  if (mot in INTENTIONS_MAP) return true;
  if (mot in PRODUITS_FORMES) return true;   // connu : `extraire` l'aurait pris
  return ['je', 'j', 'ai', 'me', 'ma', 'mon', 'la', 'le', 'les', 'un', 'une',
    'du', 'de', 'des', 'ce', 'ca', 'cela', 'ici', 'la', 'cfa', 'francs', 'franc',
    'stp', 'svp', 'tantie', 'tata'].includes(mot);
}

/** A-t-elle nommé quelque chose que le moteur ne connaît pas ? */
export function aNommeUnInconnu(texte: string): boolean {
  return mots(texte).some((m) => m.length >= 3 && !motOutil(m));
}

/**
 * CAT-03 — UNE UNITÉ PRONONCÉE COMPTE, ELLE AUSSI.
 *
 * Arbitrage de Patrick, 30/09, sur la question que je lui avais posée :
 * « "vends deux tas" — un nombre, une unité, aucun produit : 2 tas à prix
 * demandé, ou un article libre à 2 F ? » — « oui ajoute le prix ».
 *
 * CE QUI ÉTAIT MESURÉ AVANT, et qui motivait la question :
 *
 *     « vends deux tas »    → LIGNE LIBRE à 2 F
 *     « vends deux sacs »   → LIGNE LIBRE à 2 F
 *     « vends trois kilos » → LIGNE LIBRE à 3 F
 *
 * CAT-02 ne les attrapait pas : son discriminant était « a-t-elle NOMMÉ
 * quelque chose », et « tas » n'est pas un nom, c'est une mesure. Mais une
 * mesure COMPTE : « deux tas », c'est deux fois quelque chose, jamais deux
 * francs. Le nombre qui précède une unité est donc une quantité.
 *
 * LES DEUX LISTES SONT CELLES DU DÉPÔT, jamais une troisième écrite ici :
 * `MOTS_UNITE` (les mots que l'extraction traverse déjà pour rattacher un
 * nombre à un produit) et `UNITES_INVARIABLES` (les abréviations : kg, l, cl…,
 * absentes de la première). Deux listes qui divergent finiraient par vendre
 * deux francs de gombo.
 *
 * `de` EST EXCLU : il figure dans `MOTS_UNITE` pour la traversée (« deux tas
 * DE piment »), mais il ne mesure rien. Le retenir ferait de « vends deux de »
 * une quantité.
 * `franc` / `francs` ne sont dans aucune des deux : « vends deux francs »
 * reste un article libre à 2 F, et c'est juste.
 */
export function compteUneUnite(texte: string): boolean {
  return mots(texte).some((m) =>
    (MOTS_UNITE.has(m) && m !== 'de') || UNITES_INVARIABLES.has(m));
}

/** Ce qu'une vente SANS produit doit réellement porter. */
export interface VenteSansProduit {
  readonly quantite: number;
  /** `0` = rien n'a été dicté ; le prix sera DEMANDÉ, jamais inventé. */
  readonly montant: number;
}

/**
 * Corrige une action de vente que le moteur rend SANS produit.
 *
 * `null` quand il n'y a rien à corriger : l'article libre vocal, lui, passe
 * intact — ce module ne lui retire rien.
 */
export function venteSansProduit(
  action: { produit?: unknown; quantite?: unknown; montant?: unknown } | null | undefined,
  texte: string,
): VenteSansProduit | null {
  if (!action || action.produit) return null;
  const p = extraire(texte || '');
  // Un marqueur de prix a été prononcé (« à », « pour ») : c'est un PRIX, et
  // l'article libre reste ce qu'il est.
  if (p.lecturePrix !== null) return null;
  // Deux nombres séparés : la quantité est déjà à sa place.
  if (p.quantite != null) return null;
  if (p.montant == null) return null;
  // Elle n'a rien nommé ET n'a compté aucune unité : « vends 500 » reste un
  // article libre à 500 F, et c'est un usage réel qu'on ne lui retire pas.
  if (!aNommeUnInconnu(texte) && !compteUneUnite(texte)) return null;

  // Elle a nommé quelque chose, et le nombre le COMPTE. Aucune ligne à
  // N francs ne part : le prix sera demandé, comme pour tout produit dont on
  // ignore le prix. On ne devine pas, et on ne se tait pas non plus.
  const n = Number(p.montant);
  const quantite = Number.isFinite(n) && n > 0 && n <= 100 ? Math.trunc(n) : 1;
  return { quantite, montant: 0 };
}
