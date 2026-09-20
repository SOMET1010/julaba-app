// ──────────────────────────────────────────────────────────────────────────
// LA SEULE PORTE VERS L'ARGENT, À LA VOIX — VOIX-01, lot C. Module PUR.
//
// LE CRITÈRE DE FERMETURE, POSÉ PAR PATRICK LE 20/09/2026 :
//
//   « Aucune phrase vocale ne peut écrire de l'argent sans confirmer
//     EXACTEMENT l'état financier qu'elle vient de relire. »
//
// Ce n'est pas « Tata comprend encaisser ». Sans ce module, on pourrait
// relire « 4 000, reçu 5 000, tu rends 1 000 », puis ajouter un article
// pendant que la cliente cherche sa monnaie, puis dire « oui valide » — et
// encaisser 6 000 en croyant avoir confirmé 4 000. La marchande aurait
// confirmé une phrase, pas une vente.
//
// D'OÙ L'EMPREINTE. Au moment où Tata relit, on fige les trois nombres qui
// FONT la vente : le total, le montant reçu, et la composition du panier.
// « Oui, valide » n'est accepté que si ces trois-là sont encore ceux qu'elle
// a entendus. Sinon, Tata relit le nouveau compte et redemande — elle ne
// refuse pas en silence, et elle n'encaisse rien.
//
// POURQUOI UNE MACHINE À ÉTATS, ET PAS TROIS BOOLÉENS. Une autorisation
// d'écrire de l'argent assemblée à partir de drapeaux dispersés devient, au
// troisième correctif, une condition que personne ne sait plus relire. Ici,
// il y a UN SEUL endroit dans tout le fichier qui émet l'effet `encaisser`,
// et il est gardé par une seule condition. On peut l'auditer d'un regard.
//
// CE MODULE NE PAIE PAS. Il renvoie un EFFET ; c'est l'écran qui appelle la
// primitive métier (`handlePay`), la même que le bouton tactile.
// ──────────────────────────────────────────────────────────────────────────

/** Les trois nombres qui font la vente, figés au moment de la relecture. */
export interface EmpreinteFinanciere {
  /** Total à payer, en francs. */
  total: number;
  /** Montant reçu (billets touchés), en francs. */
  recu: number;
  /** Composition exacte du panier — voir `empreintePanier`. */
  lignes: string;
}

/** Une ligne de panier, réduite à ce qui change le montant dû. */
export interface LigneFinanciere {
  productId: string;
  quantite: number;
  total: number;
}

/**
 * Signature stable du panier. Triée : deux paniers identiques ajoutés dans un
 * ordre différent donnent la même empreinte — sinon on refuserait une
 * confirmation parfaitement légitime, et la marchande apprendrait vite à ne
 * plus faire confiance à la voix.
 */
export function empreintePanier(lignes: readonly LigneFinanciere[]): string {
  return lignes
    .map(l => `${l.productId}:${l.quantite}:${Math.round(l.total)}`)
    .sort()
    .join('|');
}

/** L'état financier observé À L'INSTANT où une phrase est prononcée. */
export interface EtatFinancier {
  panierVide: boolean;
  total: number;
  recu: number;
  /** Monnaie à rendre (jamais négative). */
  monnaie: number;
  /** Le reçu couvre-t-il le total ? Seul cas où une validation est possible. */
  suffisant: boolean;
  empreinte: EmpreinteFinanciere;
}

export type EtatEncaissement =
  /** Rien en cours. */
  | { phase: 'repos' }
  /** Encaissement demandé, mais le compte n'y est pas encore. */
  | { phase: 'preparation' }
  /** Tata a relu CET état-là, et attend la seconde phrase. */
  | { phase: 'attente_confirmation'; empreinte: EmpreinteFinanciere };

export type EvenementEncaissement =
  | 'encaisser'
  | 'combien_doit'
  | 'oui_valide'
  | 'annuler_validation'
  /** Le panier ou le montant reçu vient de changer. */
  | 'etat_financier_change';

export type EffetEncaissement =
  | { type: 'rien' }
  | { type: 'dire'; texte: string }
  /** L'écran doit appeler la primitive de paiement — après avoir dit `texte`. */
  | { type: 'encaisser'; texte: string };

export const ETAT_INITIAL: EtatEncaissement = { phase: 'repos' };

const fr = (n: number) => Math.round(n).toLocaleString('fr-FR');

export function memeEmpreinte(a: EmpreinteFinanciere, b: EmpreinteFinanciere): boolean {
  return a.total === b.total && a.recu === b.recu && a.lignes === b.lignes;
}

/**
 * La relecture. C'est la phrase que la marchande doit pouvoir confirmer : elle
 * dit les trois nombres, dans l'ordre où on les vit au marché — ce qu'elle
 * doit, ce qu'elle a donné, ce qu'on lui rend.
 */
export function phraseRelecture(fin: EtatFinancier): string {
  if (fin.monnaie === 0) {
    return `Elle doit ${fr(fin.total)} francs. Elle t'a donné ${fr(fin.recu)}. Compte juste. Je valide ?`;
  }
  return `Elle doit ${fr(fin.total)} francs. Elle t'a donné ${fr(fin.recu)}. Tu rends ${fr(fin.monnaie)}. Je valide ?`;
}

const PANIER_VIDE = "Ton panier est vide. Dis-moi d'abord ce que tu vends.";
const COMPTE_LES_BILLETS = (total: number) =>
  `Elle doit ${fr(total)} francs. Touche les billets qu'elle te donne.`;

/**
 * Ouvre — ou rouvre — une confirmation sur l'état ACTUEL. Jamais un paiement :
 * c'est le passage obligé par la relecture, et il est le même pour « encaisse »
 * et pour un « oui valide » arrivé trop tôt.
 */
function demanderConfirmation(fin: EtatFinancier): { etat: EtatEncaissement; effet: EffetEncaissement } {
  if (fin.panierVide || fin.total <= 0) {
    return { etat: { phase: 'repos' }, effet: { type: 'dire', texte: PANIER_VIDE } };
  }
  if (!fin.suffisant) {
    return { etat: { phase: 'preparation' }, effet: { type: 'dire', texte: COMPTE_LES_BILLETS(fin.total) } };
  }
  return {
    etat: { phase: 'attente_confirmation', empreinte: fin.empreinte },
    effet: { type: 'dire', texte: phraseRelecture(fin) },
  };
}

/**
 * La transition. Fonction pure : mêmes entrées, mêmes sorties, aucun accès au
 * monde extérieur — c'est ce qui permet de la mettre à l'épreuve avec une
 * table de phrases plutôt qu'avec un téléphone.
 */
export function reduire(
  etat: EtatEncaissement,
  evenement: EvenementEncaissement,
  fin: EtatFinancier,
): { etat: EtatEncaissement; effet: EffetEncaissement } {
  switch (evenement) {
    case 'etat_financier_change': {
      // Rien en cours : les billets touchés ne relisent rien. La relecture
      // spontanée n'existe qu'APRÈS « encaisse » — la cliente suivante ne
      // doit pas s'entendre relire un compte que personne n'a demandé.
      if (etat.phase === 'repos') return { etat, effet: { type: 'rien' } };

      // PANIER VIDÉ → REPOS. Un paiement (au doigt ou à la voix) ou « Vider » :
      // l'encaissement demandé n'existe plus, on ne reste pas en préparation
      // d'une vente qui n'est plus là.
      if (fin.panierVide || fin.total <= 0) return { etat: { phase: 'repos' }, effet: { type: 'rien' } };

      // Le compte relu a bougé : la confirmation portait sur un autre
      // compte, elle ne vaut plus rien. Elle retombe en préparation…
      const enPreparation = etat.phase === 'preparation'
        || !memeEmpreinte(etat.empreinte, fin.empreinte);

      // … et c'est LE PARCOURS CIBLE (étapes 6→8) : « encaisse », puis elle
      // touche les billets, puis Tata relit D'ELLE-MÊME. Dès que le reçu couvre
      // le total, on relit le compte de l'instant et on attend « oui valide »
      // — une seule phrase pour elle, pas trois. La transition est sûre :
      // l'attente est liée à l'empreinte EXACTE qui vient d'être relue, et la
      // seconde phrase reste obligatoire. Un billet de plus sur un compte déjà
      // relu passe par ici aussi : ancienne empreinte tombée, nouveau compte
      // relu, dans le même événement.
      if (enPreparation && fin.suffisant) {
        return {
          etat: { phase: 'attente_confirmation', empreinte: fin.empreinte },
          effet: { type: 'dire', texte: phraseRelecture(fin) },
        };
      }
      // Ça ne couvre pas encore : elle compte, Tata se tait.
      if (enPreparation) return { etat: { phase: 'preparation' }, effet: { type: 'rien' } };
      return { etat, effet: { type: 'rien' } };
    }

    case 'annuler_validation':
      // Le doute profite toujours au refus.
      if (etat.phase === 'repos') return { etat, effet: { type: 'rien' } };
      return { etat: { phase: 'repos' }, effet: { type: 'dire', texte: "D'accord, je ne valide pas." } };

    case 'combien_doit': {
      // LECTURE SEULE : l'état ne bouge pas. Poser une question ne doit ni
      // ouvrir ni fermer une confirmation en cours.
      if (fin.panierVide || fin.total <= 0) {
        return { etat, effet: { type: 'dire', texte: 'Ton panier est vide.' } };
      }
      const texte = fin.recu > 0 && fin.suffisant
        ? `Elle doit ${fr(fin.total)} francs. Elle t'a donné ${fr(fin.recu)}. Tu rends ${fr(fin.monnaie)}.`
        : `Elle doit ${fr(fin.total)} francs.`;
      return { etat, effet: { type: 'dire', texte } };
    }

    case 'encaisser':
      // « Encaisse » ne paie JAMAIS. Il prépare, ou il relit et demande.
      return demanderConfirmation(fin);

    case 'oui_valide': {
      // ── LE SEUL ENDROIT DE CE FICHIER QUI PEUT ÉCRIRE DE L'ARGENT ──
      // Quatre conditions, toutes nécessaires : une relecture a eu lieu ; le
      // compte relu est EXACTEMENT celui d'aujourd'hui ; le panier n'est pas
      // vide ; le reçu couvre le total. Si l'une manque, on retombe sur une
      // simple demande de confirmation — c'est-à-dire sur une relecture, et
      // sur zéro écriture.
      if (
        etat.phase === 'attente_confirmation'
        && memeEmpreinte(etat.empreinte, fin.empreinte)
        && !fin.panierVide
        && fin.suffisant
        && fin.total > 0
      ) {
        return { etat: { phase: 'repos' }, effet: { type: 'encaisser', texte: '' } };
      }
      // Arrivée trop tôt, ou sur un compte qui a changé : Tata relit le
      // compte d'aujourd'hui et redemande. Une première occurrence de
      // « valide » ne paie donc jamais, et un compte modifié non plus.
      if (etat.phase === 'attente_confirmation') {
        const suite = demanderConfirmation(fin);
        if (suite.effet.type === 'dire') {
          return { ...suite, effet: { type: 'dire', texte: `Le compte a changé. ${suite.effet.texte}` } };
        }
        return suite;
      }
      return demanderConfirmation(fin);
    }
  }
}
