// Formations pour profil Producteur

export const producteurFormations = [
  {
    id: 'producteur_plannification_culture',
    role: 'producteur' as const,
    category: 'Production Agricole',
    title: 'Planifier sa culture efficacement',
    description: 'Apprends à choisir les bonnes périodes de semis et récolte',
    duration: 3,
    points: 30,
    content: {
      title: 'Planifier sa culture efficacement',
      content: 'La planification est la clé d\'une production réussie. Connaître le calendrier cultural de chaque produit te permet d\'optimiser tes récoltes et d\'éviter les pertes. Chaque culture a sa saison idéale.',
      example: 'Pour le maïs : semis en avril-mai, récolte en août-septembre. Pour le manioc : planter en début de saison des pluies, récolter après 8-12 mois.',
      bulletPoints: [
        'Respecter le calendrier cultural de chaque produit',
        'Prévoir les semis selon les saisons',
        'Anticiper les besoins en intrants',
        'Planifier la main d\'œuvre nécessaire',
      ],
    },
    questions: [
      {
        question: 'Quelle est la meilleure période pour semer le maïs en Côte d\'Ivoire ?',
        options: [
          'Janvier-février',
          'Avril-mai',
          'Août-septembre',
          'Novembre-décembre',
        ],
        correctAnswer: 1,
        explanation: 'Le maïs se sème en avril-mai, au début de la grande saison des pluies. Cela garantit une bonne germination et une croissance optimale.',
      },
      {
        question: 'Pourquoi planifier ses cultures à l\'avance ?',
        options: [
          'Pour faire plaisir à JÙLABA',
          'Pour optimiser les récoltes et éviter les pertes',
          'C\'est obligatoire par la loi',
          'Pour avoir plus de temps libre',
        ],
        correctAnswer: 1,
        explanation: 'La planification permet d\'optimiser tes récoltes, d\'anticiper les besoins en intrants et main d\'œuvre, et de réduire les risques de pertes.',
      },
      {
        question: 'Combien de temps faut-il pour récolter le manioc après plantation ?',
        options: [
          '3-4 mois',
          '5-6 mois',
          '8-12 mois',
          '18-24 mois',
        ],
        correctAnswer: 2,
        explanation: 'Le manioc se récolte généralement 8 à 12 mois après la plantation. Il peut être laissé plus longtemps en terre si nécessaire.',
      },
    ],
  },
  {
    id: 'producteur_gestion_sol',
    role: 'producteur' as const,
    category: 'Production Agricole',
    title: 'Gérer la fertilité du sol',
    description: 'Maintiens ton sol fertile pour de meilleures récoltes',
    duration: 3,
    points: 30,
    content: {
      title: 'Gérer la fertilité du sol',
      content: 'Un sol fertile est la base d\'une bonne production. La rotation des cultures, le compostage et l\'utilisation raisonnée d\'engrais permettent de maintenir la fertilité du sol sur le long terme.',
      example: 'Alterner maïs et niébé enrichit le sol en azote. Le compost fait maison coûte moins cher que les engrais chimiques et améliore durablement le sol.',
      bulletPoints: [
        'Pratiquer la rotation des cultures',
        'Utiliser du compost organique',
        'Éviter le brûlage systématique des résidus',
        'Tester régulièrement la qualité du sol',
      ],
    },
    questions: [
      {
        question: 'Pourquoi pratiquer la rotation des cultures ?',
        options: [
          'Pour avoir plus de variété',
          'Pour maintenir la fertilité du sol',
          'C\'est plus joli visuellement',
          'Pour économiser les semences',
        ],
        correctAnswer: 1,
        explanation: 'La rotation des cultures permet de maintenir la fertilité du sol, car différentes plantes ont des besoins nutritifs différents et certaines enrichissent même le sol.',
      },
      {
        question: 'Quel est l\'avantage du compost par rapport aux engrais chimiques ?',
        options: [
          'Il agit plus rapidement',
          'Il coûte moins cher et améliore durablement le sol',
          'Il est plus facile à appliquer',
          'Il n\'a aucun avantage',
        ],
        correctAnswer: 1,
        explanation: 'Le compost coûte moins cher (souvent gratuit), améliore la structure du sol durablement et apporte des nutriments progressivement.',
      },
      {
        question: 'Quelle culture enrichit naturellement le sol en azote ?',
        options: [
          'Le maïs',
          'Le riz',
          'Le niébé (haricot)',
          'Le manioc',
        ],
        correctAnswer: 2,
        explanation: 'Le niébé et les autres légumineuses fixent l\'azote de l\'air dans le sol grâce à leurs racines, enrichissant ainsi naturellement la terre.',
      },
    ],
  },
  {
    id: 'producteur_recolte_qualite',
    role: 'producteur' as const,
    category: 'Production Agricole',
    title: 'Récolter au bon moment',
    description: 'Assure la meilleure qualité et le meilleur prix pour tes produits',
    duration: 3,
    points: 30,
    content: {
      title: 'Récolter au bon moment',
      content: 'Le moment de la récolte détermine la qualité et le prix de vente de tes produits. Récolter trop tôt ou trop tard réduit la valeur marchande. Connaître les signes de maturité est essentiel.',
      example: 'La tomate récoltée à pleine maturité (bien rouge) se vend mieux mais se conserve moins. La tomate récoltée au tournant (orange) se conserve mieux pour le transport.',
      bulletPoints: [
        'Connaître les signes de maturité de chaque produit',
        'Récolter aux heures fraîches (matin ou soir)',
        'Manipuler délicatement pour éviter les blessures',
        'Trier immédiatement après récolte',
      ],
    },
    questions: [
      {
        question: 'Quel est le meilleur moment de la journée pour récolter ?',
        options: [
          'En plein midi',
          'Tôt le matin ou tard le soir',
          'Peu importe l\'heure',
          'Uniquement la nuit',
        ],
        correctAnswer: 1,
        explanation: 'Récolter aux heures fraîches (tôt le matin ou tard le soir) préserve la qualité des produits et évite le flétrissement rapide.',
      },
      {
        question: 'Pourquoi trier les produits juste après la récolte ?',
        options: [
          'C\'est obligatoire',
          'Pour séparer les produits de bonne et mauvaise qualité',
          'Pour faire passer le temps',
          'Ce n\'est pas nécessaire',
        ],
        correctAnswer: 1,
        explanation: 'Le tri immédiat permet de séparer les produits de bonne qualité (vente directe) des produits abîmés (vente rapide ou transformation), maximisant ainsi le revenu.',
      },
      {
        question: 'Comment savoir si une tomate est mûre ?',
        options: [
          'Elle est verte',
          'Elle est bien rouge et ferme',
          'Elle est molle',
          'Elle a des taches noires',
        ],
        correctAnswer: 1,
        explanation: 'Une tomate mûre est bien rouge et ferme au toucher. Une tomate molle est trop mûre, une tomate verte n\'est pas encore prête.',
      },
    ],
  },
];
