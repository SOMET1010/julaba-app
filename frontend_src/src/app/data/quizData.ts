/**
 * 🎮 QUIZ DATA - Base de données des questions par profil
 * 
 * Questions organisées par profil et catégorie
 */

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
  difficulty: 'facile' | 'moyen' | 'difficile';
  points: number;
}

// ==================== MARCHAND ====================

export const marchandQuiz: QuizQuestion[] = [
  // Gestion de Stock
  {
    id: 'mar-stock-001',
    question: 'Quelle est la meilleure pratique pour gérer ton stock de riz ?',
    options: [
      'Vendre d\'abord ce qui est arrivé en premier (FIFO)',
      'Vendre ce qui reste le plus longtemps',
      'Mélanger tout ensemble',
      'Vendre au hasard',
    ],
    correctAnswer: 0,
    explanation: 'Le FIFO (First In, First Out) garantit que les produits les plus anciens sont vendus en premier, évitant ainsi les pertes et le gaspillage.',
    category: 'Gestion de Stock',
    difficulty: 'facile',
    points: 20,
  },
  {
    id: 'mar-stock-002',
    question: 'À quelle fréquence dois-tu faire l\'inventaire de ton stock ?',
    options: ['Une fois par mois', 'Une fois par semaine', 'Chaque jour', 'Une fois par an'],
    correctAnswer: 1,
    explanation: 'Un inventaire hebdomadaire te permet de mieux contrôler tes stocks, d\'identifier rapidement les produits qui se vendent mal et de réapprovisionner à temps.',
    category: 'Gestion de Stock',
    difficulty: 'moyen',
    points: 30,
  },

  // Service Client
  {
    id: 'mar-client-001',
    question: 'Un client se plaint du prix. Que fais-tu ?',
    options: [
      'Tu l\'ignores',
      'Tu expliques calmement la qualité du produit',
      'Tu baisses immédiatement le prix',
      'Tu te fâches',
    ],
    correctAnswer: 1,
    explanation: 'La communication calme et la mise en valeur de la qualité créent la confiance. Un bon service client fidélise et attire de nouveaux clients.',
    category: 'Service Client',
    difficulty: 'facile',
    points: 20,
  },
  {
    id: 'mar-client-002',
    question: 'Comment garder tes clients fidèles ?',
    options: [
      'Prix toujours bas',
      'Qualité constante et bon accueil',
      'Promotions tous les jours',
      'Publicité intensive',
    ],
    correctAnswer: 1,
    explanation: 'La fidélisation repose sur la qualité constante des produits et un accueil chaleureux. C\'est la relation de confiance qui compte !',
    category: 'Service Client',
    difficulty: 'moyen',
    points: 30,
  },

  // Hygiène et Sécurité
  {
    id: 'mar-hygiene-001',
    question: 'Combien de fois par jour dois-tu nettoyer ton espace de vente ?',
    options: ['Une fois par semaine', 'Une fois par jour', 'Deux fois par jour minimum', 'Jamais'],
    correctAnswer: 2,
    explanation: 'L\'hygiène est cruciale ! Nettoyer au moins 2 fois par jour (matin et soir) garantit la salubrité et inspire confiance à tes clients.',
    category: 'Hygiène et Sécurité',
    difficulty: 'facile',
    points: 20,
  },
  {
    id: 'mar-hygiene-002',
    question: 'Que fais-tu avec les produits avariés ?',
    options: [
      'Tu les vends à prix réduit',
      'Tu les jettes immédiatement',
      'Tu les mélanges aux bons produits',
      'Tu attends qu\'ils se vendent',
    ],
    correctAnswer: 1,
    explanation: 'Les produits avariés doivent être jetés immédiatement pour éviter tout risque sanitaire. Ta réputation en dépend !',
    category: 'Hygiène et Sécurité',
    difficulty: 'moyen',
    points: 30,
  },

  // Gestion Financière
  {
    id: 'mar-finance-001',
    question: 'Quelle est la formule pour calculer ta marge bénéficiaire ?',
    options: [
      'Ventes - Achats',
      'Prix de vente × Quantité',
      '(Prix de vente - Prix d\'achat) ÷ Prix de vente × 100',
      'Total des ventes',
    ],
    correctAnswer: 2,
    explanation: 'La marge bénéficiaire se calcule : (Prix de vente - Prix d\'achat) ÷ Prix de vente × 100. C\'est essentiel pour connaître ta rentabilité !',
    category: 'Gestion Financière',
    difficulty: 'difficile',
    points: 40,
  },
];

// ==================== PRODUCTEUR ====================

export const producteurQuiz: QuizQuestion[] = [
  // Bonnes Pratiques Agricoles
  {
    id: 'prod-agri-001',
    question: 'Quel est le meilleur moment pour récolter les tomates ?',
    options: ['Très tôt le matin', 'En plein midi', 'La nuit', 'N\'importe quand'],
    correctAnswer: 0,
    explanation: 'Récolter tôt le matin garantit que les tomates sont fraîches et gorgées d\'eau, ce qui améliore leur conservation et leur qualité.',
    category: 'Bonnes Pratiques Agricoles',
    difficulty: 'facile',
    points: 20,
  },
  {
    id: 'prod-agri-002',
    question: 'Quelle rotation de culture est recommandée ?',
    options: [
      'Même culture chaque saison',
      'Alterner légumes feuilles et légumes fruits',
      'Pas de rotation',
      'Rotation tous les 5 ans',
    ],
    correctAnswer: 1,
    explanation: 'Alterner légumes feuilles et légumes fruits préserve la fertilité du sol et réduit les maladies. C\'est l\'agriculture durable !',
    category: 'Bonnes Pratiques Agricoles',
    difficulty: 'moyen',
    points: 30,
  },

  // Conservation
  {
    id: 'prod-conserv-001',
    question: 'Comment conserver les aubergines après la récolte ?',
    options: ['Au soleil', 'À l\'ombre dans un endroit frais', 'Dans l\'eau', 'Dans un sac plastique fermé'],
    correctAnswer: 1,
    explanation: 'Les aubergines se conservent mieux à l\'ombre dans un endroit frais et aéré. Évite le soleil direct et l\'humidité excessive.',
    category: 'Conservation',
    difficulty: 'facile',
    points: 20,
  },
  {
    id: 'prod-conserv-002',
    question: 'Combien de temps peux-tu conserver des tomates fraîches ?',
    options: ['1-2 jours', '3-5 jours', '1-2 semaines', '1 mois'],
    correctAnswer: 1,
    explanation: 'Les tomates fraîches se conservent 3 à 5 jours dans de bonnes conditions (ombre, frais). Au-delà, leur qualité diminue.',
    category: 'Conservation',
    difficulty: 'moyen',
    points: 30,
  },

  // Planification
  {
    id: 'prod-plan-001',
    question: 'Combien de semaines avant la récolte dois-tu planifier tes ventes ?',
    options: ['1 semaine', '2-3 semaines', 'Le jour même', '1 mois'],
    correctAnswer: 1,
    explanation: 'Planifier 2-3 semaines à l\'avance te permet de trouver les meilleurs acheteurs et d\'obtenir de meilleurs prix. Anticiper = Gagner plus !',
    category: 'Planification',
    difficulty: 'moyen',
    points: 30,
  },
];

// ==================== COOPÉRATIVE ====================

export const cooperativeQuiz: QuizQuestion[] = [
  // Gestion de Groupe
  {
    id: 'coop-gest-001',
    question: 'Comment résoudre un conflit entre membres ?',
    options: [
      'Exclure immédiatement le membre',
      'Organiser une réunion de médiation',
      'Ignorer le problème',
      'Prendre parti pour l\'un des membres',
    ],
    correctAnswer: 1,
    explanation: 'La médiation et le dialogue sont les clés ! Une réunion collective permet de résoudre les conflits de manière juste et transparente.',
    category: 'Gestion de Groupe',
    difficulty: 'facile',
    points: 20,
  },
  {
    id: 'coop-gest-002',
    question: 'Quelle est la fréquence idéale des réunions de coopérative ?',
    options: ['Tous les jours', 'Une fois par semaine', 'Une fois par mois', 'Une fois par an'],
    correctAnswer: 2,
    explanation: 'Une réunion mensuelle assure un bon suivi sans être trop contraignant. C\'est l\'équilibre parfait pour une coopérative efficace !',
    category: 'Gestion de Groupe',
    difficulty: 'moyen',
    points: 30,
  },

  // Finances Collectives
  {
    id: 'coop-finance-001',
    question: 'Quelle part des bénéfices doit être réservée aux fonds communs ?',
    options: ['0%', '5-10%', '50%', '100%'],
    correctAnswer: 1,
    explanation: 'Réserver 5-10% des bénéfices crée un fonds de réserve pour les urgences et les investissements futurs. C\'est la garantie de pérennité !',
    category: 'Finances Collectives',
    difficulty: 'moyen',
    points: 30,
  },
];

// ==================== INSTITUTION ====================

export const institutionQuiz: QuizQuestion[] = [
  // Politique Agricole
  {
    id: 'inst-pol-001',
    question: 'Quel est l\'objectif principal de JULABA ?',
    options: [
      'Vendre des produits',
      'Inclusion économique des acteurs vivriers',
      'Collecter des données',
      'Remplacer les marchés physiques',
    ],
    correctAnswer: 1,
    explanation: 'JULABA vise l\'inclusion économique de tous les acteurs de la chaîne vivrière en Côte d\'Ivoire. C\'est notre mission première !',
    category: 'Politique Agricole',
    difficulty: 'facile',
    points: 20,
  },

  // Validation
  {
    id: 'inst-valid-001',
    question: 'Combien de temps max pour valider un nouveau marchand ?',
    options: ['24 heures', '48 heures', '1 semaine', '1 mois'],
    correctAnswer: 1,
    explanation: 'Une validation en 48 heures maximum favorise l\'engagement des nouveaux acteurs et améliore l\'expérience utilisateur.',
    category: 'Validation',
    difficulty: 'moyen',
    points: 30,
  },
];

// ==================== IDENTIFICATEUR ====================

export const identificateurQuiz: QuizQuestion[] = [
  // Vérification d'Identité
  {
    id: 'ident-verif-001',
    question: 'Quel document est obligatoire pour identifier un marchand ?',
    options: ['Carte d\'électeur', 'CNI (Carte Nationale d\'Identité)', 'Permis de conduire', 'Passeport'],
    correctAnswer: 1,
    explanation: 'La CNI est le document d\'identité officiel obligatoire en Côte d\'Ivoire. C\'est la base de toute identification fiable.',
    category: 'Vérification d\'Identité',
    difficulty: 'facile',
    points: 20,
  },

  // Qualité de Données
  {
    id: 'ident-qualite-001',
    question: 'Que fais-tu si les informations du marchand sont incomplètes ?',
    options: [
      'Tu valides quand même',
      'Tu remplis toi-même les informations',
      'Tu demandes au marchand de compléter',
      'Tu refuses l\'inscription',
    ],
    correctAnswer: 2,
    explanation: 'Demander au marchand de compléter garantit des données exactes et de qualité. C\'est essentiel pour la fiabilité de la plateforme !',
    category: 'Qualité de Données',
    difficulty: 'moyen',
    points: 30,
  },
];

// ==================== EXPORT PAR PROFIL ====================

export const quizByRole = {
  marchand: marchandQuiz,
  producteur: producteurQuiz,
  cooperative: cooperativeQuiz,
  institution: institutionQuiz,
  identificateur: identificateurQuiz,
};

export type UserRole = keyof typeof quizByRole;

// Fonction pour obtenir un quiz aléatoire
export function getRandomQuiz(role: UserRole, count: number = 5): QuizQuestion[] {
  const allQuestions = quizByRole[role];
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, allQuestions.length));
}

// Fonction pour obtenir un quiz par catégorie
export function getQuizByCategory(role: UserRole, category: string): QuizQuestion[] {
  return quizByRole[role].filter((q) => q.category === category);
}

// Fonction pour obtenir toutes les catégories d'un rôle
export function getCategories(role: UserRole): string[] {
  const categories = new Set(quizByRole[role].map((q) => q.category));
  return Array.from(categories);
}
