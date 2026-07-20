// Formations pour profil Coopérative

export const cooperativeFormations = [
  {
    id: 'cooperative_gestion_membres',
    role: 'cooperative' as const,
    category: 'Gestion Coopérative',
    title: 'Gérer les membres efficacement',
    description: 'Organise et motive les membres de ta coopérative',
    duration: 3,
    points: 30,
    content: {
      title: 'Gérer les membres efficacement',
      content: 'Une coopérative forte repose sur des membres actifs et engagés. La transparence, la communication régulière et l\'équité dans la répartition des bénéfices renforcent la cohésion du groupe.',
      example: 'Tenir une assemblée générale chaque trimestre pour informer tous les membres des décisions, des ventes réalisées et des bénéfices à partager.',
      bulletPoints: [
        'Tenir des réunions régulières avec tous les membres',
        'Communiquer de manière transparente sur les finances',
        'Établir des règles claires et équitables',
        'Valoriser la contribution de chaque membre',
      ],
    },
    questions: [
      {
        question: 'À quelle fréquence organiser une assemblée générale ?',
        options: [
          'Une fois par an',
          'Chaque trimestre (tous les 3 mois)',
          'Tous les jours',
          'Ce n\'est pas nécessaire',
        ],
        correctAnswer: 1,
        explanation: 'Une assemblée générale trimestrielle (tous les 3 mois) permet de garder tous les membres informés et engagés sans surcharger l\'agenda.',
      },
      {
        question: 'Pourquoi la transparence financière est-elle importante ?',
        options: [
          'C\'est obligatoire par la loi',
          'Pour maintenir la confiance des membres',
          'Pour impressionner les partenaires',
          'Elle n\'est pas importante',
        ],
        correctAnswer: 1,
        explanation: 'La transparence financière maintient la confiance des membres, réduit les conflits et encourage l\'engagement de tous dans la réussite de la coopérative.',
      },
      {
        question: 'Comment valoriser la contribution de chaque membre ?',
        options: [
          'Donner la même chose à tout le monde',
          'Récompenser selon la participation',
          'Ignorer les contributions individuelles',
          'Favoriser uniquement les fondateurs',
        ],
        correctAnswer: 1,
        explanation: 'Récompenser selon la participation (quantité livrée, présence aux réunions, etc.) motive les membres et reconnaît leurs efforts individuels.',
      },
    ],
  },
  {
    id: 'cooperative_collecte_stockage',
    role: 'cooperative' as const,
    category: 'Gestion Coopérative',
    title: 'Organiser la collecte et le stockage',
    description: 'Optimise la collecte auprès des membres et le stockage des produits',
    duration: 3,
    points: 30,
    content: {
      title: 'Organiser la collecte et le stockage',
      content: 'Une collecte bien organisée facilite le travail des membres et garantit la qualité des produits. Le stockage adéquat préserve la valeur marchande et permet d\'attendre les meilleurs prix.',
      example: 'Fixer des points de collecte accessibles, peser les produits devant les membres, stocker dans un local sec et aéré pour éviter les moisissures.',
      bulletPoints: [
        'Établir des points de collecte accessibles',
        'Peser et contrôler la qualité devant les membres',
        'Stocker dans de bonnes conditions (sec, aéré, propre)',
        'Tenir un registre précis des collectes',
      ],
    },
    questions: [
      {
        question: 'Pourquoi peser les produits devant les membres ?',
        options: [
          'C\'est plus rapide',
          'Pour garantir la transparence et la confiance',
          'Ce n\'est pas nécessaire',
          'Pour impressionner',
        ],
        correctAnswer: 1,
        explanation: 'Peser devant les membres garantit la transparence, évite les suspicions de fraude et renforce la confiance dans la coopérative.',
      },
      {
        question: 'Quelles sont les conditions idéales de stockage ?',
        options: [
          'Humide et chaud',
          'Sec et aéré',
          'Peu importe',
          'En plein soleil',
        ],
        correctAnswer: 1,
        explanation: 'Un stockage sec et aéré préserve la qualité des produits, évite les moisissures et les pertes dues aux insectes ou aux rongeurs.',
      },
      {
        question: 'Pourquoi tenir un registre des collectes ?',
        options: [
          'Pour faire joli',
          'Pour suivre les contributions et calculer les parts',
          'C\'est obligatoire par la loi',
          'Ce n\'est pas utile',
        ],
        correctAnswer: 1,
        explanation: 'Le registre permet de suivre précisément les contributions de chaque membre et de calculer équitablement leur part des bénéfices lors de la vente.',
      },
    ],
  },
  {
    id: 'cooperative_negociation_vente',
    role: 'cooperative' as const,
    category: 'Gestion Coopérative',
    title: 'Négocier de meilleurs prix',
    description: 'Obtiens les meilleurs prix en vendant groupé',
    duration: 3,
    points: 30,
    content: {
      title: 'Négocier de meilleurs prix',
      content: 'La force d\'une coopérative réside dans le volume groupé. En vendant ensemble, les membres obtiennent de meilleurs prix et un pouvoir de négociation accru face aux acheteurs.',
      example: 'Un producteur seul vend son sac de cacao 50 000 FCFA. La coopérative avec 100 sacs négocie 55 000 FCFA le sac grâce au volume.',
      bulletPoints: [
        'Grouper les volumes pour négocier',
        'Comparer plusieurs acheteurs avant de vendre',
        'Connaître les prix du marché',
        'Ne pas vendre sous pression',
      ],
    },
    questions: [
      {
        question: 'Quel est l\'avantage de vendre groupé ?',
        options: [
          'C\'est plus rapide',
          'Meilleurs prix grâce au volume',
          'Moins de travail',
          'Il n\'y a pas d\'avantage',
        ],
        correctAnswer: 1,
        explanation: 'Vendre groupé donne un pouvoir de négociation accru et permet d\'obtenir de meilleurs prix grâce au volume important proposé.',
      },
      {
        question: 'Avant de vendre, que faut-il faire ?',
        options: [
          'Vendre au premier acheteur',
          'Comparer les offres de plusieurs acheteurs',
          'Attendre indéfiniment',
          'Vendre au prix imposé',
        ],
        correctAnswer: 1,
        explanation: 'Comparer les offres de plusieurs acheteurs permet de choisir la meilleure proposition et d\'éviter de brader les produits.',
      },
      {
        question: 'Pourquoi connaître les prix du marché ?',
        options: [
          'Pour faire plaisir aux acheteurs',
          'Pour ne pas vendre en dessous de la valeur réelle',
          'Ce n\'est pas important',
          'Pour augmenter artificiellement les prix',
        ],
        correctAnswer: 1,
        explanation: 'Connaître les prix du marché permet de négocier en position de force et d\'éviter de vendre en dessous de la valeur réelle des produits.',
      },
    ],
  },
];
