// ──────────────────────────────────────────────────────────────────────────
// LES COMMANDES DE L'ACCUEIL MARCHAND — deux portes, dites à voix haute.
//
// LA DEMANDE (Patrick, 06/11) : ouvrir la caisse doit se faire PAR LA VOIX,
// et l'ajout d'un produit doit se lancer depuis l'accueil en parlant. Cet
// écran ne faisait que PARLER (Tantie dit la caisse) — il n'écoutait AUCUNE
// commande : chaque porte était un geste tactile.
//
// LA GRAMMAIRE EST DÉCLARÉE D'ABORD (même fil que `commandesEntree`) : pure,
// sans React ni micro, testée seule. Le mécanisme (moteur, anti-écho,
// fenêtre) vit dans `hooks/useCommandesVocales` ; la politique (ce que fait
// chaque porte) reste dans l'écran — même frontière que partout.
//
// LE ROUTAGE EST ÉTROIT PAR CONSTRUCTION. Deux intentions seulement, chacune
// exige SON verbe ET SON nom :
//   · « ouvre (la|ma) caisse »      → ouvrir_caisse
//   · « ajoute un produit »         → ajouter_produit
// Une phrase du marché (« la caisse est pleine », « ajoute des tomates »)
// ne matche RIEN : `null`, l'écoute continue. « Ajoute des tomates » est
// d'ailleurs INTERDIT de lecture vente par `MOTS_PAS_UNE_VENTE` — ici il ne
// navigue pas davantage : la dictée d'un produit se fait DANS le parcours
// guidé (BoutonDireProduit), pas depuis l'accueil.
//
// LE REFUS GAGNE TOUJOURS (doctrine VOIX-08, le doute ne fait rien) : « n'aie
// pas peur, ouvre la caisse », « ouvre pas la caisse » — toute phrase qui
// porte un mot de refus rend `null`, même si elle contient aussi une
// commande. Ne rien faire coûte une répétition ; agir sur un refus mal lu
// ouvre un flux d'argent à sa place.
// ──────────────────────────────────────────────────────────────────────────

/** Ce que l'accueil peut faire quand une commande est comprise. */
export type CommandeAccueil = 'ouvrir_caisse' | 'ajouter_produit';

/** Même normalisation que `commandesEntree` (minuscules, sans accents ni ponctuation). */
function normaliser(texte: string): string {
  return (texte || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// LE REFUS D'ABORD — le doute ne déclenche aucune porte. « pas », « jamais »,
// l'annulation, l'attente : la phrase entière est jetée, pas seulement la
// partie polie.
const REFUS = /\b(pas|jamais|annule[rz]?|stop|arret|attends?|plus tard|pas maintenant|ne)\b/;

// OUVRIR — le verbe conjugué sous ses formes réellement dites, et SON nom.
// « caisse » seul ne déclenche RIEN : le mot traverse les phrases du jour
// (« combien dans ma caisse ») — c'est la question du SOLDE, pas une porte.
const OUVRIR = /\b(ouvre|ouvrir|ouvrons|ouvrez|ouvert)\b/;
const CAISSE = /\b(caisse|journee)\b/;

// AJOUTER UN PRODUIT — le verbe d'ajout ET le nom de la chose. « ajoute »
// seul n'ouvre rien (c'est un mot du stock, MOTS_PAS_UNE_VENTE) ; « produit »
// seul non plus (la phrase du commerce ne navigue pas).
const AJOUTER = /\b(ajoute|ajouter|ajoutons|ajoutez|pose|poser|rajoute|rajouter|nouveau|nouvelle)\b/;
const PRODUIT = /\b(produit|articles?)\b/;

/**
 * « ouvre la caisse » → `ouvrir_caisse` ; « ajoute un produit » →
 * `ajouter_produit` ; le doute, le refus, une phrase du marché → `null`,
 * l'écoute continue. L'ORDRE ENCODE LA DOCTRINE : le refus testé avant tout —
 * même fil que « c'est pas mon numéro » ne confirme pas.
 */
export function intentionAccueil(texte: string): CommandeAccueil | null {
  const brut = (texte || '').trim();
  if (!brut) return null;
  const t = normaliser(brut);
  if (REFUS.test(t)) return null;
  if (OUVRIR.test(t) && CAISSE.test(t)) return 'ouvrir_caisse';
  if (AJOUTER.test(t) && PRODUIT.test(t)) return 'ajouter_produit';
  return null;
}
