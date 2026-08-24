// ──────────────────────────────────────────────────────────────────────────
// Routeur d'intentions « questions caisse » (V4) — module PUR, sans React ni DOM.
//
// La marchande pose une question à la voix (« combien j'ai vendu aujourd'hui ? »,
// « c'est quoi mon bénéfice ? ») et Tata répond avec les chiffres du jour.
// LECTURE SEULE : ce module ne déclenche jamais une écriture — il est consulté
// APRÈS intentLocal (vente/dépense), uniquement quand aucune opération
// financière n'a été reconnue. Les chiffres viennent de l'écran appelant
// (contexte du hook voix), qui les tient de l'état local/API — jamais d'un
// calcul fait ici à partir de rien.
//
// Prudence sur la détection : une phrase n'est traitée comme QUESTION que si
// elle porte un signal interrogatif (« combien », « quel »…) ou une tournure
// possessive sans ambiguïté (« ma recette », « mon solde »). Ainsi une tentative
// de vente incomplète (« j'ai vendu trois tomates », sans montant) ne reçoit
// pas une statistique en réponse : elle retombe sur « je n'ai pas compris »,
// qui invite à reformuler la vente.
// ──────────────────────────────────────────────────────────────────────────

export type QuestionCaisse =
  | 'ventes_jour'
  | 'depenses_jour'
  | 'solde_caisse'
  | 'benefice_jour'
  | 'meilleure_vente';

export interface ChiffresJour {
  /** Total des ventes du jour (ventes annulées exclues), en francs. */
  ventes: number;
  /** Total des dépenses (cahier) du jour, en francs. */
  depenses: number;
  /** Solde de caisse si l'écran le connaît (fond + encaissé − dépenses). */
  caisse?: number;
  nombreVentes?: number;
  topProduit?: { nom: string; quantite?: number } | null;
}

const fr = (n: number) => Math.round(n).toLocaleString('fr-FR');

// Minuscules + sans accents : la reconnaissance vocale est irrégulière sur les
// accents, la détection ne doit pas en dépendre.
function normaliser(texte: string): string {
  return ` ${texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''’]/g, "'")
    .replace(/[.,!;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

// Signal interrogatif générique (« combien j'ai fait ? », « quel est mon solde »).
const INTERROGATIF = /combien|quel(le)?s? |qu'est|c'est quoi|dis[- ]moi|montre[- ]moi|\?/;

/**
 * Détecte une question « chiffres du jour ». Renvoie null si la phrase n'est
 * pas une question sans ambiguïté (l'appelant guide alors vers la vente).
 */
export function detecterQuestion(texte: string): QuestionCaisse | null {
  if (!texte || !texte.trim()) return null;
  const t = normaliser(texte);
  const interrogatif = INTERROGATIF.test(t);

  // Ordre important : les libellés les plus spécifiques d'abord (« meilleure
  // vente » contient « vente », « bénéfice » avant le fourre-tout des ventes).
  if (/(meilleur\w*|mieux|plus) .*(vente|vendu|produit|marche)|se vend le mieux|top produit/.test(t)) {
    return 'meilleure_vente';
  }
  if (/benefice|marge|profit|gagne net/.test(t)) {
    if (interrogatif || / mon | ma /.test(t)) return 'benefice_jour';
  }
  if (/depens|cahier|sorti .*(argent|francs)|mes achats/.test(t)) {
    if (interrogatif || / mon | mes /.test(t)) return 'depenses_jour';
  }
  if (/solde|reste .*(caisse|argent)|dans (ma|la) caisse/.test(t)) {
    if (interrogatif || / mon | ma /.test(t)) return 'solde_caisse';
  }
  if (/vendu|vente|recette|chiffre d'affaire|j'ai fait|gagne/.test(t)) {
    // Garde-fou vente incomplète : exiger l'interrogatif ou une tournure
    // possessive explicite (« mes ventes », « ma recette »).
    if (interrogatif || / mes ventes | ma recette /.test(t)) return 'ventes_jour';
  }
  return null;
}

/** Gabarit parlé de la réponse — toujours court, chiffres en francs. */
export function phraseReponse(question: QuestionCaisse, c: ChiffresJour): string {
  const ventes = Number(c.ventes) || 0;
  const depenses = Number(c.depenses) || 0;

  switch (question) {
    case 'ventes_jour': {
      if (ventes <= 0) return "Tu n'as pas encore de vente aujourd'hui. Ça va venir !";
      const n = Number(c.nombreVentes) || 0;
      return n > 1
        ? `Aujourd'hui, tu as vendu pour ${fr(ventes)} francs, en ${n} ventes.`
        : `Aujourd'hui, tu as vendu pour ${fr(ventes)} francs.`;
    }
    case 'depenses_jour':
      return depenses <= 0
        ? "Aucune dépense notée aujourd'hui."
        : `Aujourd'hui, tu as dépensé ${fr(depenses)} francs.`;
    case 'solde_caisse': {
      if (c.caisse != null && !Number.isNaN(Number(c.caisse))) {
        return `Dans ta caisse, il y a ${fr(Number(c.caisse))} francs.`;
      }
      const solde = ventes - depenses;
      return solde >= 0
        ? `Ventes moins dépenses, il te reste ${fr(solde)} francs aujourd'hui.`
        : `Aujourd'hui, tes dépenses dépassent tes ventes de ${fr(-solde)} francs.`;
    }
    case 'benefice_jour': {
      const resultat = ventes - depenses;
      if (ventes <= 0 && depenses <= 0) return "Pas encore de ventes ni de dépenses aujourd'hui.";
      return resultat >= 0
        ? `Aujourd'hui : ${fr(ventes)} francs de ventes, ${fr(depenses)} de dépenses. Il te reste ${fr(resultat)} francs.`
        : `Aujourd'hui : ${fr(ventes)} francs de ventes, ${fr(depenses)} de dépenses. Tu as dépensé ${fr(-resultat)} francs de plus que tes ventes.`;
    }
    case 'meilleure_vente': {
      const top = c.topProduit;
      if (!top || !top.nom) return "Je n'ai pas encore assez de ventes pour te dire ça aujourd'hui.";
      return top.quantite && top.quantite > 1
        ? `Ce qui marche le mieux aujourd'hui : ${top.nom}, ${fr(top.quantite)} vendus.`
        : `Ce qui marche le mieux aujourd'hui : ${top.nom}.`;
    }
  }
}
