// ──────────────────────────────────────────────────────────────────────────
// Navigation LOCALE (offline) pour Julaba — « va au stock », « mes ventes »…
//
// Distincte des QUESTIONS « chiffres du jour » (intentionsCaisse.ts, qui répond
// à voix haute SANS changer d'écran) : ici la marchande demande explicitement
// à SE DÉPLACER dans l'appli. On exige donc un verbe de déplacement sans
// ambiguïté (« va », « ouvre », « montre »…) pour ne jamais intercepter une
// question lue à voix haute (« combien j'ai vendu ? ») ni une vente incomplète.
// Consultée par intentLocal() APRÈS la reconnaissance vente/dépense.
// ──────────────────────────────────────────────────────────────────────────

export type NavigationIntent =
  | 'consulter_solde'
  | 'consulter_ventes'
  | 'ajouter_stock'
  | 'consulter_depenses'
  | 'consulter_argent'
  | 'ouvrir_journee'
  | 'fermer_journee';

export interface NavigationResult {
  type: NavigationIntent;
  path: string;
  response: string;
}

function normaliser(texte: string): string {
  return ` ${texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[''’]/g, "'")
    .replace(/[.,!;:?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

// Verbe d'action explicite (déplacement OU ouverture/fermeture de journée) —
// sans ça, on ne touche jamais à une phrase (question de lecture, vente
// incomplète…).
const VERBE_DEPLACEMENT = /\b(va|vas|aller|ouvre|ouvrir|montre|montrer|affiche|afficher|emmene|emmène|amene|amène|ferme|fermer|cloture|clôture|commence|démarre|demarre)\b/;

// Ordre important : du plus spécifique au plus générique.
const REGLES: Array<{ test: RegExp; type: NavigationIntent; path: string; response: string }> = [
  {
    test: /ferme .*(journee|caisse)|cloture|cl[oô]ture .*(journee|caisse)/,
    type: 'fermer_journee', path: '/marchand/caisse', response: 'Je ferme ta journée.',
  },
  {
    test: /ouvre .*(journee)|commence .*(journee)|demarre .*(journee|caisse)/,
    type: 'ouvrir_journee', path: '/marchand/caisse', response: "J'ouvre ta journée.",
  },
  {
    test: /stock|inventaire|marchandise/,
    type: 'ajouter_stock', path: '/marchand/stock', response: "J'ouvre ton stock.",
  },
  {
    test: /vente|ventes|historique/,
    type: 'consulter_ventes', path: '/marchand/ventes-passees', response: 'J\'ouvre tes ventes.',
  },
  {
    test: /depense|depenses|cahier/,
    type: 'consulter_depenses', path: '/marchand/cahier', response: "J'ouvre tes dépenses.",
  },
  {
    test: /argent|keiwa|portefeuille|wallet/,
    type: 'consulter_argent', path: '/marchand/keiwa', response: "J'ouvre ton argent Keiwa.",
  },
  {
    test: /caisse/,
    type: 'consulter_solde', path: '/marchand/caisse', response: "J'ouvre ta caisse.",
  },
];

/**
 * Détecte une commande de NAVIGATION explicite (« va au stock », « ouvre mes
 * ventes »…). Renvoie null si aucun verbe de déplacement n'est présent — une
 * question sur les chiffres du jour ou une vente n'est jamais interceptée ici.
 */
export function detecterNavigation(texte: string): NavigationResult | null {
  if (!texte || !texte.trim()) return null;
  const t = normaliser(texte);
  if (!VERBE_DEPLACEMENT.test(t)) return null;
  for (const regle of REGLES) {
    if (regle.test.test(t)) return { type: regle.type, path: regle.path, response: regle.response };
  }
  return null;
}
