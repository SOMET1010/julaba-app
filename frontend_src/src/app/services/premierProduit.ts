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

import { normaliserNom } from './venteVocale';

/**
 * STK-04 — UNE QUATRIÈME ÉTAPE, ET ELLE SE SAUTE.
 *
 * STK-03 §2 tenait à trois questions, et il avait raison : « chaque champ en
 * plus est une occasion d'abandonner ». La quantité n'en devient donc pas une
 * quatrième obligatoire — elle est proposée APRÈS le prix, avec un bouton pour
 * passer. Le produit est déjà complet quand elle arrive : on ne lui demande
 * rien pour avancer, on lui offre de préciser.
 */
export type EtapeAjout = 'nom' | 'unite' | 'prix' | 'quantite';

/** Ce qu'on a d'elle jusqu'ici. `prix: null` = elle ne l'a pas encore donné. */
export interface BrouillonProduit {
  readonly nom: string;
  readonly unite: string;
  readonly prix: number | null;
  /** STK-04 — ce qu'elle a répondu à « Tu en as combien ? », ou rien du tout.
   *  `undefined` = la question n'a pas encore été posée ; `null` = elle l'a
   *  PASSÉE. Les deux mènent au même stock inconnu, et c'est voulu : on ne
   *  distingue pas « pas encore demandé » de « elle n'a pas voulu dire ». */
  readonly quantite?: number | null;
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
  if (prixDelle(b.prix) == null) return 'prix';
  return 'quantite';
}

/**
 * PEUT-ELLE AVANCER ? — recette DTDI du 24/09.
 *
 * LE DÉFAUT QU'ON FERME : « la zone de saisie du produit ne prend qu'un seul
 * caractère ». L'écran déduisait l'étape affichée de `etapeCourante`, donc de
 * la COMPLÉTUDE des données. Dès la première lettre, `nom.trim()` n'était plus
 * vide, l'étape passait à « unite », et le bloc qui portait l'input était
 * démonté SOUS SES DOIGTS. Son produit s'appelait « T ». L'unité libre avait
 * le même défaut : « bassine » devenait « b ».
 *
 * LA CAUSE : une même donnée portait deux sens. « Que manque-t-il au produit ? »
 * et « quel écran afficher pendant qu'elle tape ? » ne sont pas la même
 * question. `etapeCourante` répond bien à la première — elle ne change pas, et
 * STK-05 s'en sert pour ouvrir le parcours au bon endroit. La seconde appartient
 * à l'écran, qui retient où elle en est.
 *
 * AVANCER EST UN GESTE. Ces deux règles disent quand il est possible, et vers
 * quoi. Elles ne décident jamais toutes seules.
 */
/**
 * LA MÊME RÈGLE DES DEUX CÔTÉS — STK-21, 25/09/2026.
 *
 * L'agent de test a créé un produit nommé « t » : l'écran a enchaîné sur
 * « t, tu le vends comment ? ». La règle posée le matin même (nom d'au moins
 * deux caractères) ne vivait que sur le SERVEUR — l'écran laissait passer, et
 * le refus n'arrivait qu'au bout du parcours, après trois questions.
 *
 * C'est la leçon de STK-06, mot pour mot : quand une règle ne vit que d'un
 * côté, l'autre affirme ce que le serveur refusera. Ici en pire — elle aurait
 * répondu à trois questions pour rien.
 *
 * Deux caractères suffisent pour « ka » ou « ri » ; une lettre seule n'est pas
 * un produit du marché.
 */
export const NOM_PRODUIT_MINIMUM = 2;

export function peutValider(etape: EtapeAjout, b: BrouillonProduit): boolean {
  if (etape === 'nom') return propre(b.nom).length >= NOM_PRODUIT_MINIMUM;
  if (etape === 'unite') return !!propre(b.unite);
  // Un prix nul ou absent n'est pas un prix : il entrerait en caisse et
  // fausserait chaque vente (STK-01d).
  return prixDelle(b.prix) !== null;
}

/** L'ordre des trois questions. La dernière ne mène nulle part : on pose. */
export function etapeSuivante(etape: EtapeAjout): EtapeAjout {
  if (etape === 'nom') return 'unite';
  if (etape === 'unite') return 'prix';
  // STK-04 — après le prix, on PROPOSE la quantité. Le produit est déjà
  // complet à cet instant : cette étape ne conditionne rien, elle précise.
  if (etape === 'prix') return 'quantite';
  return 'quantite';
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

/**
 * LA MÊME RÈGLE AUX DEUX PORTES — STK-24, 27/09/2026.
 *
 * `peutValider('nom', …)` exigeait deux lettres (STK-21) ; `produitPret`, lui,
 * se contentait d'un nom non vide. Deux portes du MÊME côté, deux règles.
 *
 * Mesuré : le chemin n'est PAS atteignable aujourd'hui. La dictée est la seule
 * source d'un brouillon de départ, `produitDit` ne rend jamais de nom d'une
 * lettre, et elle ne remplit jamais l'unité — l'écran ne peut donc pas ouvrir
 * directement à l'étape du prix avec un nom trop court. Ce n'est pas un défaut
 * observé : c'est une porte qui n'attend qu'un nouveau chemin d'entrée.
 *
 * On l'aligne maintenant, pendant qu'elle est encore sans conséquence.
 */
export function produitPret(b: BrouillonProduit): boolean {
  return propre(b.nom).length >= NOM_PRODUIT_MINIMUM
    && !!propre(b.unite) && prixDelle(b.prix) !== null;
}

/**
 * POURQUOI ELLE NE PEUT PAS AVANCER — STK-24, 27/09/2026.
 *
 * LE DÉFAUT QU'ON FERME. Le grand bouton « C'est bon » était `disabled` tant
 * que l'étape n'était pas complète. Une marchande qui ne lit pas appuie
 * dessus : rien ne bouge, rien ne le lui dit. Le bouton grisé est une
 * information PUREMENT VISUELLE au milieu d'un parcours conçu pour l'oreille.
 *
 * Pire, un bouton `disabled` ne reçoit même pas le clic : le code n'avait
 * aucun endroit où réagir. Le silence n'était pas un oubli d'appel, il était
 * dans la structure.
 *
 * `peutValider` dit SI elle peut avancer. Ceci dit POURQUOI PAS, et c'est une
 * règle — donc elle vit ici, avec l'autre, et se teste sans écran.
 *
 * ELLE REND UNE RAISON, PAS UNE PHRASE NI UNE CLÉ. Premier jet : elle rendait
 * l'identifiant du catalogue de voix. La garde i18n l'a refusé, et elle avait
 * raison — un fichier qui porte des identifiants de messages sans appartenir à
 * la couche i18n est précisément ce qu'elle écarte. Ce module sait ce qui
 * MANQUE ; comment on le dit ne le regarde pas. L'écran fait la
 * correspondance, et son `Record` garantit à la compilation qu'aucune raison
 * ne reste sans phrase.
 */
export type RaisonRefus = 'nom-absent' | 'nom-trop-court' | 'unite-absente' | 'prix-absent';

/** `null` quand elle peut avancer : il n'y a alors rien à dire. */
export function raisonDuRefus(etape: EtapeAjout, b: BrouillonProduit): RaisonRefus | null {
  if (peutValider(etape, b)) return null;
  if (etape === 'nom') {
    // Deux refus distincts. « Rien tapé » et « une seule lettre » ne se
    // corrigent pas du même geste : l'une doit parler, l'autre doit CONTINUER.
    // Les confondre enverrait recommencer quelqu'un qui avait presque fini.
    return propre(b.nom) ? 'nom-trop-court' : 'nom-absent';
  }
  if (etape === 'unite') return 'unite-absente';
  return 'prix-absent';
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
  /**
   * STK-04 — `null` = ELLE NE L'A PAS DIT. Jamais 0.
   *
   * Arbitrage de Patrick, 29/09 : « je ne laisserais pas 0 signifier à la fois
   * "zéro produit" et "quantité inconnue" ». Un produit entrait à 0 et l'alerte
   * criait « Plus de X ! » sur un produit qu'elle venait de poser — alors
   * qu'elle en a peut-être un plein sac.
   *
   * La quatrième question est FACULTATIVE : si elle répond, on part de son
   * chiffre ; si elle passe, le stock reste inconnu et se tait.
   */
  readonly stock: number | null;
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
    // Sa quantité si elle l'a donnée, `null` sinon. On n'invente rien, et
    // surtout pas un zéro qui voudrait dire deux choses.
    stock: quantiteDelle(b.quantite),
    categorie: '',
  };
}

/**
 * La quantité telle qu'elle l'a donnée, ou `null` si elle a passé la question.
 * Un nombre négatif ou absurde n'est pas une quantité : on ne le corrige pas
 * en 0 — ce serait réintroduire le mensonge — on le traite comme non dit.
 */
export function quantiteDelle(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}

/**
 * A1 — UN PRODUIT QU'ELLE A DÉJÀ SE COMPLÈTE, IL NE SE RECRÉE PAS.
 * Retour terrain PIE du 07/10 : elle redit « tomate », le parcours posait une
 * seconde ligne « Tomate » — deux tuiles, deux stocks, et la vente ne savait
 * plus lequel décompter.
 *
 * ÉGALITÉ STRICTE du nom normalisé, PAS l'inclusion d'`apparierProduit` :
 * « tomate » n'est pas « tomate cerise ». L'unité compte aussi : au kg et au
 * tas, ce sont deux prix, donc deux produits. Unité pas encore dite (étape du
 * nom) : on compare le nom seul. Deux candidats : on ne choisit pas à sa
 * place, `null`.
 */
export interface ProduitSurEtal {
  readonly id: string;
  readonly nom: string;
  readonly unite: string;
  readonly prix: number;
  readonly stock: number;
}

export function produitDejaSurEtal<P extends ProduitSurEtal>(
  b: Pick<BrouillonProduit, 'nom' | 'unite'>, etal: readonly P[],
): P | null {
  const nom = normaliserNom(b.nom);
  if (!nom) return null;
  const unite = normaliserNom(b.unite);
  const memes = etal.filter(p => normaliserNom(p.nom ?? '') === nom
    && (!unite || normaliserNom(p.unite ?? '') === unite));
  return memes.length === 1 ? memes[0] : null;
}

/**
 * Le stock après qu'elle a ajouté `quantite` — ou `null` : RIEN à écrire.
 * Quantité non dite, nulle ou absurde : on n'écrit pas. Stock illisible : on
 * ne devine pas (jamais `|| 0`, ACC-03).
 */
export function stockComplete(existant: Pick<ProduitSurEtal, 'stock'>, quantite: unknown): number | null {
  const q = quantiteDelle(quantite);
  if (q == null || q <= 0 || !Number.isFinite(existant.stock)) return null;
  return existant.stock + q;
}
