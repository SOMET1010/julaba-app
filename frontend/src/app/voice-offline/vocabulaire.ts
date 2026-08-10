export type Intention =
  | 'vente'
  | 'depense'
  | 'solde'
  | 'credit'         // on a vendu à crédit / un client doit de l'argent
  | 'remboursement'  // un client a remboursé / payé sa dette
  | 'recette'        // recette du jour, bénéfice, chiffre d'affaires
  | 'reappro';       // stock reçu / arrivé / réapprovisionnement

export interface PhraseCible {
  id: number;
  texte: string;
  attendu: {
    intention: Intention | null;
    produit: string | null;
    quantite: number | null;
    montant: number | null;
  };
  /** Cas volontairement difficile (parler du marché). Un échec ici est informatif, pas un bug. */
  piege?: boolean;
  /** Explication du piège / de la difficulté testée. */
  note?: string;
}

export const PRODUITS: string[] = [
  'tomate', 'piment', 'gombo', 'attiéké', 'attieke', 'banane', 'plantain',
  'banane plantain', 'igname', 'manioc', 'aubergine', 'oignon', 'ail',
  'poisson', 'viande', 'poulet', 'huile', 'sel', 'sucre', 'riz',
  'haricot', 'maïs', 'mais', 'foutou', 'orange',
];

// Formes normalisées pour la détection (sans accents)
export const PRODUITS_FORMES: Record<string, string> = {
  tomate: 'tomate', tomates: 'tomate',
  piment: 'piment', piments: 'piment',
  gombo: 'gombo', gombos: 'gombo',
  attieké: 'attiéké', attieke: 'attiéké', "attiéké": 'attiéké',
  banane: 'banane', bananes: 'banane',
  plantain: 'banane plantain',
  'banane plantain': 'banane plantain',
  'bananes plantain': 'banane plantain',
  'banane plantains': 'banane plantain',
  'bananes plantains': 'banane plantain',
  igname: 'igname', ignames: 'igname',
  manioc: 'manioc',
  aubergine: 'aubergine', aubergines: 'aubergine',
  oignon: 'oignon', oignons: 'oignon',
  ail: 'ail',
  poisson: 'poisson', poissons: 'poisson',
  viande: 'viande',
  poulet: 'poulet', poulets: 'poulet',
  huile: 'huile',
  sel: 'sel',
  sucre: 'sucre',
  riz: 'riz',
  haricot: 'haricot', haricots: 'haricot',
  maïs: 'maïs', mais: 'maïs',
  foutou: 'foutou',
  orange: 'orange', oranges: 'orange',
  // Produits courants entendus au marché
  savon: 'savon', savons: 'savon', farine: 'farine',
  jus: 'jus', bière: 'bière', biere: 'bière', bières: 'bière',
  biscuit: 'biscuit', biscuits: 'biscuit', lait: 'lait',
};

export const INTENTIONS_MAP: Record<string, Intention> = {
  vendu: 'vente', vendue: 'vente', vendus: 'vente', vendues: 'vente',
  vente: 'vente', vends: 'vente',
  acheté: 'depense', achetée: 'depense', achetés: 'depense', achetées: 'depense',
  achète: 'depense', achete: 'depense', acheter: 'depense',
  // Formes réelles entendues au marché (transcriptions Vosk terrain) :
  pris: 'depense', prise: 'depense',
  dépensé: 'depense', dépensée: 'depense', depensé: 'depense', depense: 'depense',
  dépense: 'depense',
  payé: 'depense', payée: 'depense', payés: 'depense', payer: 'depense',
  solde: 'solde', reste: 'solde',
  // ── Crédit / dettes ──
  crédit: 'credit', credit: 'credit', dette: 'credit', dettes: 'credit',
  doit: 'credit', dois: 'credit', doivent: 'credit',
  // ── Remboursement ──
  remboursé: 'remboursement', remboursée: 'remboursement',
  rembourser: 'remboursement', remboursement: 'remboursement',
  // ── Recette / bilan / bénéfice ──
  recette: 'recette', bénéfice: 'recette', benefice: 'recette',
  gagné: 'recette', gagnée: 'recette',
  // ── Réappro / stock reçu ──
  reçu: 'reappro', recu: 'reappro', reçue: 'reappro',
  arrivé: 'reappro', arrivés: 'reappro', arrivée: 'reappro', arrivées: 'reappro',
  épuisé: 'reappro', epuise: 'reappro',
};

// Dérive la grammaire Vosk directement depuis les phrases de référence +
// les tables de vocabulaire. Garantit qu'aucun mot dicté ne peut être absent
// de la grammaire par construction — ce qui empêche les substitutions phonétiques
// parasites (ex : "j'ai" → "riz" faute de token correspondant).
function buildGrammarWords(): string[] {
  const acc = new Set<string>();

  function add(word: string) { if (word) acc.add(word.toLowerCase()); }
  function addAll(words: string[]) { words.forEach(add); }

  // 1. Tous les tokens issus des phrases de référence.
  //    L'apostrophe est splittée : "j'ai" → ["j", "ai"].
  //    Les traits d'union sont conservés comme token unique (quatre-vingt-dix).
  for (const p of PHRASES_T1) {
    p.texte
      .toLowerCase()
      .replace(/['']/g, "'")
      .split(/[\s']+/)
      .map((t) => t.replace(/[.,!?;:]/g, ''))
      .filter(Boolean)
      .forEach(add);
  }

  // 2. Nombres absents des 16 phrases de référence + mots fonctionnels stricts.
  //    Règle : rien qui ne soit pas susceptible d'apparaître dans une dictée SAD
  //    réelle. Chaque mot superflu est un candidat de substitution phonétique.
  addAll([
    // Nombres hors corpus
    'zéro', 'zero',
    'onze', 'douze', 'treize', 'quatorze', 'seize',
    'dix-sept', 'dix-huit', 'dix-neuf',
    'trente', 'quarante', 'soixante',
    'soixante-dix', 'quatre-vingts', 'quatre-vingt', 'quatre-vingt-dix',
    'cent', 'cents', 'mille', 'et',
    // Mots fonctionnels (prépositions, articles, pronoms)
    'je', 'j', 'ai', 'de', 'du', 'des', 'le', 'la', 'les', 'à', 'a', 'pour', 'd',
    // Unités commerciales
    'franc', 'francs', 'tas', 'sac', 'sacs', 'kilo', 'kilos',
    // Réponses de CONFIRMATION (« c'est bien ça ? » → oui / non). Sans ces mots
    // dans la grammaire, Vosk ne pouvait PAS transcrire la réponse de la vendeuse.
    'oui', 'ouais', 'voilà', 'voila', 'exact', 'accord', 'ok', 'okay', 'bon', 'ça', 'ca',
    'non', 'pas', 'faux', 'annule', 'annuler', 'efface', 'recommence',
  ]);

  // 3. Toutes les flexions verbales d'intention : vendu/vendus/vendue/vendues/vends,
  //    acheté/achetés/achetée/achetées/achète, dépensé/…, payé/…
  //    Règle : la grammaire doit contenir TOUTES les formes que le locuteur peut
  //    prononcer ; c'est le parseur (INTENTIONS_MAP) qui normalise ensuite.
  addAll(Object.keys(INTENTIONS_MAP));

  // 4. Formes singulier ET pluriel de chaque produit dans le périmètre.
  //    Les phrases de référence ne couvrent pas toutes les formes (ex. « tomate »
  //    singulier n'apparaît dans aucune phrase → absent de la grammaire → Vosk
  //    se rabat sur « riz »). On garantit ici la couverture complète.
  //    Hors périmètre intentionnellement absents : sel, poulet, viande, sucre,
  //    ail, foutou, haricot, bénéfice.
  addAll([
    'tomate', 'tomates',
    'piment', 'piments',
    'gombo', 'gombos',
    'attieke', 'attiéké',
    'banane', 'bananes', 'plantain',
    'igname', 'ignames',
    'manioc',
    'oignon', 'oignons',
    'orange', 'oranges',
    'poisson',
    'riz',
  ]);

  // 5. Token spécial Vosk pour les mots hors-vocabulaire.
  acc.add('[unk]');

  return [...acc].sort();
}

export const PHRASES_T1: PhraseCible[] = [
  {
    id: 1,
    texte: "j'ai vendu dix tomates à deux mille francs",
    attendu: { intention: 'vente', produit: 'tomate', quantite: 10, montant: 2000 },
  },
  {
    id: 2,
    texte: "j'ai vendu cinq kilos de gombo pour mille cinq cents francs",
    attendu: { intention: 'vente', produit: 'gombo', quantite: 5, montant: 1500 },
  },
  {
    id: 3,
    texte: "j'ai acheté trois sacs de riz à six mille francs",
    attendu: { intention: 'depense', produit: 'riz', quantite: 3, montant: 6000 },
  },
  {
    id: 4,
    texte: "j'ai dépensé deux mille francs pour le piment",
    attendu: { intention: 'depense', produit: 'piment', quantite: null, montant: 2000 },
  },
  {
    id: 5,
    texte: "vendu vingt bananes plantain à cinq cents francs",
    attendu: { intention: 'vente', produit: 'banane plantain', quantite: 20, montant: 500 },
  },
  {
    id: 6,
    texte: "j'ai vendu deux tas d'attiéké pour mille francs",
    attendu: { intention: 'vente', produit: 'attiéké', quantite: 2, montant: 1000 },
  },
  {
    id: 7,
    texte: "acheté dix kilos d'igname à quatre mille francs",
    attendu: { intention: 'depense', produit: 'igname', quantite: 10, montant: 4000 },
  },
  {
    id: 8,
    texte: "j'ai vendu sept oignons à trois cents francs",
    attendu: { intention: 'vente', produit: 'oignon', quantite: 7, montant: 300 },
  },
  {
    id: 9,
    texte: "dépensé mille deux cents francs pour le manioc",
    attendu: { intention: 'depense', produit: 'manioc', quantite: null, montant: 1200 },
  },
  {
    id: 10,
    texte: "solde de la journée deux mille cinq cents francs",
    attendu: { intention: 'solde', produit: null, quantite: null, montant: 2500 },
  },
  {
    id: 11,
    texte: "j'ai vendu quinze piments à deux cent cinquante francs",
    attendu: { intention: 'vente', produit: 'piment', quantite: 15, montant: 250 },
  },
  {
    id: 12,
    texte: "acheté un sac d'oignons pour huit mille francs",
    attendu: { intention: 'depense', produit: 'oignon', quantite: 1, montant: 8000 },
  },
  // Cas limites
  {
    id: 13,
    texte: "j'ai vendu quatre-vingt-dix tomates à mille cinq cents",
    attendu: { intention: 'vente', produit: 'tomate', quantite: 90, montant: 1500 },
  },
  {
    id: 14,
    texte: "j'ai vendu vingt et un piments à trois cents",
    attendu: { intention: 'vente', produit: 'piment', quantite: 21, montant: 300 },
  },
  {
    id: 15,
    texte: "j'ai vendu soixante-quinze oranges à deux mille",
    attendu: { intention: 'vente', produit: 'orange', quantite: 75, montant: 2000 },
  },
  {
    id: 16,
    texte: "deux mille francs de poisson",
    attendu: { intention: null, produit: 'poisson', quantite: null, montant: 2000 },
  },

  // ── Ventes : produits et unités variés du marché ──
  {
    id: 17,
    texte: "j'ai vendu trois poulets à quatre mille francs",
    attendu: { intention: 'vente', produit: 'poulet', quantite: 3, montant: 4000 },
  },
  {
    id: 18,
    texte: "j'ai vendu cinquante bananes à mille francs",
    attendu: { intention: 'vente', produit: 'banane', quantite: 50, montant: 1000 },
  },
  {
    id: 19,
    texte: "j'ai vendu deux kilos de viande à cinq mille francs",
    attendu: { intention: 'vente', produit: 'viande', quantite: 2, montant: 5000 },
  },
  {
    id: 20,
    texte: "vendu six aubergines pour neuf cents francs",
    attendu: { intention: 'vente', produit: 'aubergine', quantite: 6, montant: 900 },
  },
  {
    id: 21,
    texte: "j'ai vendu huit poissons à sept cent cinquante francs",
    attendu: { intention: 'vente', produit: 'poisson', quantite: 8, montant: 750 },
  },
  {
    id: 22,
    texte: "j'ai vendu quatre bidons d'huile à six mille francs",
    attendu: { intention: 'vente', produit: 'huile', quantite: 4, montant: 6000 },
  },
  {
    id: 23,
    texte: "j'ai vendu cent tomates à mille francs",
    attendu: { intention: 'vente', produit: 'tomate', quantite: 100, montant: 1000 },
  },
  {
    id: 24,
    texte: "vendu quinze kilos d'igname pour cinq mille francs",
    attendu: { intention: 'vente', produit: 'igname', quantite: 15, montant: 5000 },
  },
  {
    id: 25,
    texte: "j'ai vendu deux sacs de maïs à huit mille francs",
    attendu: { intention: 'vente', produit: 'maïs', quantite: 2, montant: 8000 },
  },
  {
    id: 26,
    texte: "j'ai vendu deux cents oranges à quinze mille francs",
    attendu: { intention: 'vente', produit: 'orange', quantite: 200, montant: 15000 },
  },

  // ── Dépenses / achats ──
  {
    id: 27,
    texte: "j'ai acheté cinq kilos de sucre à trois mille francs",
    attendu: { intention: 'depense', produit: 'sucre', quantite: 5, montant: 3000 },
  },
  {
    id: 28,
    texte: "j'ai dépensé cinq cents francs pour le sel",
    attendu: { intention: 'depense', produit: 'sel', quantite: null, montant: 500 },
  },
  {
    id: 29,
    texte: "acheté deux bottes d'oignons pour mille francs",
    attendu: { intention: 'depense', produit: 'oignon', quantite: 2, montant: 1000 },
  },
  {
    id: 30,
    texte: "j'ai payé quatre mille francs pour le poulet",
    attendu: { intention: 'depense', produit: 'poulet', quantite: null, montant: 4000 },
  },
  {
    id: 31,
    texte: "acheté dix kilos de haricot à sept mille francs",
    attendu: { intention: 'depense', produit: 'haricot', quantite: 10, montant: 7000 },
  },
  {
    id: 32,
    texte: "j'ai acheté trois régimes de banane plantain à six mille francs",
    attendu: { intention: 'depense', produit: 'banane plantain', quantite: 3, montant: 6000 },
  },

  // ── Solde / point du jour ──
  {
    id: 33,
    texte: "combien il me reste en caisse",
    attendu: { intention: 'solde', produit: null, quantite: null, montant: null },
  },
  {
    id: 34,
    texte: "solde de la journée trois mille francs",
    attendu: { intention: 'solde', produit: null, quantite: null, montant: 3000 },
  },
  {
    id: 35,
    texte: "il me reste combien de tomates",
    attendu: { intention: 'solde', produit: 'tomate', quantite: null, montant: null },
  },

  // ── Cas simples sans montant ou sans quantité ──
  {
    id: 36,
    texte: "j'ai vendu des tomates",
    attendu: { intention: 'vente', produit: 'tomate', quantite: null, montant: null },
  },
  {
    id: 37,
    texte: "j'ai vendu un poulet",
    attendu: { intention: 'vente', produit: 'poulet', quantite: 1, montant: null },
  },
  {
    id: 38,
    texte: "j'ai vendu quatre-vingt-quinze piments à mille francs",
    attendu: { intention: 'vente', produit: 'piment', quantite: 95, montant: 1000 },
  },

  // ── Pièges du marché : échec informatif, pas un bug ──
  {
    id: 39,
    texte: "j'ai vendu dix tomates à mille cinq",
    attendu: { intention: 'vente', produit: 'tomate', quantite: 10, montant: 1500 },
    piege: true,
    note: "Prix elliptique : « mille cinq » = 1500 au marché (désormais géré par une règle dédiée du parseur).",
  },
  {
    id: 40,
    texte: "j'ai vendu dix tomates et cinq piments à deux mille",
    attendu: { intention: 'vente', produit: 'tomate', quantite: 10, montant: 2000 },
    piege: true,
    note: "Deux produits dans une phrase : le schéma ne retient qu'un seul produit. Limite du modèle actuel.",
  },
  {
    id: 41,
    texte: "euh attends j'ai vendu vingt tomates à trois mille francs",
    attendu: { intention: 'vente', produit: 'tomate', quantite: 20, montant: 3000 },
    piege: true,
    note: "Hésitations avant la phrase utile (parler naturel).",
  },
  {
    id: 42,
    texte: "j'ai vendu un demi sac de riz à quatre mille francs",
    attendu: { intention: 'vente', produit: 'riz', quantite: 1, montant: 4000 },
    piege: true,
    note: "Quantité approximative (« un demi sac ») non gérée par le parseur d'entiers.",
  },
];

export const GRAMMAR_WORDS: string[] = buildGrammarWords();
