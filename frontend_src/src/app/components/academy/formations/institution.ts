// Formations pour profil Institution

export const institutionFormations = [
  {
    id: 'institution_analyse_donnees',
    role: 'institution' as const,
    category: 'Gestion Institutionnelle',
    title: 'Analyser les données de la filière',
    description: 'Exploite les données JÙLABA pour prendre de meilleures décisions',
    duration: 3,
    points: 30,
    content: {
      title: 'Analyser les données de la filière',
      content: 'JÙLABA fournit des données précieuses sur les acteurs, les volumes, les prix et les flux. Une bonne analyse permet d\'identifier les tendances, les problèmes et les opportunités dans la filière.',
      example: 'Analyser l\'évolution des prix du cacao sur 6 mois pour anticiper les périodes de baisse et conseiller les producteurs sur les moments optimaux de vente.',
      bulletPoints: [
        'Consulter régulièrement les tableaux de bord',
        'Identifier les tendances et anomalies',
        'Comparer les données entre régions',
        'Utiliser les insights pour les décisions stratégiques',
      ],
    },
    questions: [
      {
        question: 'À quelle fréquence consulter les données JÙLABA ?',
        options: [
          'Une fois par an',
          'Régulièrement (hebdomadaire ou mensuel)',
          'Jamais',
          'Seulement en cas de problème',
        ],
        correctAnswer: 1,
        explanation: 'Une consultation régulière (hebdomadaire ou mensuelle) permet de détecter rapidement les tendances et d\'agir en temps opportun.',
      },
      {
        question: 'Pourquoi comparer les données entre régions ?',
        options: [
          'Pour faire un classement',
          'Pour identifier les disparités et opportunités',
          'Ce n\'est pas utile',
          'Pour critiquer certaines régions',
        ],
        correctAnswer: 1,
        explanation: 'Comparer les régions permet d\'identifier les disparités (prix, volumes, acteurs), de comprendre les raisons et de cibler les interventions.',
      },
      {
        question: 'Comment utiliser les données pour améliorer la filière ?',
        options: [
          'Les ignorer',
          'Les analyser et prendre des décisions basées sur les insights',
          'Les garder secrètes',
          'Les vendre à des tiers',
        ],
        correctAnswer: 1,
        explanation: 'Les données doivent être analysées pour identifier les problèmes, opportunités et tendances, puis utilisées pour prendre des décisions stratégiques éclairées.',
      },
    ],
  },
  {
    id: 'institution_appui_acteurs',
    role: 'institution' as const,
    category: 'Gestion Institutionnelle',
    title: 'Apporter un appui efficace aux acteurs',
    description: 'Soutiens les acteurs de manière ciblée et impactante',
    duration: 3,
    points: 30,
    content: {
      title: 'Apporter un appui efficace aux acteurs',
      content: 'L\'appui aux acteurs doit être ciblé, adapté aux besoins réels et suivi dans le temps. Les formations, subventions et équipements doivent répondre aux problèmes identifiés sur le terrain.',
      example: 'Si les données montrent que les producteurs perdent 30% de leur récolte post-récolte, cibler l\'appui sur des formations de conservation et des kits de stockage.',
      bulletPoints: [
        'Identifier les besoins réels via les données',
        'Cibler les interventions sur les problèmes prioritaires',
        'Former et accompagner dans la durée',
        'Mesurer l\'impact des interventions',
      ],
    },
    questions: [
      {
        question: 'Comment identifier les besoins des acteurs ?',
        options: [
          'Deviner',
          'Analyser les données et échanger avec les acteurs',
          'Copier ce que font les autres',
          'Imposer ce qu\'on veut',
        ],
        correctAnswer: 1,
        explanation: 'Analyser les données JÙLABA et échanger directement avec les acteurs permet d\'identifier les besoins réels et de cibler les interventions efficacement.',
      },
      {
        question: 'Pourquoi mesurer l\'impact des interventions ?',
        options: [
          'Ce n\'est pas nécessaire',
          'Pour savoir si l\'appui a été efficace et ajuster',
          'Pour faire un rapport',
          'Pour critiquer les acteurs',
        ],
        correctAnswer: 1,
        explanation: 'Mesurer l\'impact permet de savoir si l\'appui a vraiment aidé les acteurs, de tirer des leçons et d\'ajuster les futures interventions.',
      },
      {
        question: 'Quelle est la meilleure approche d\'appui ?',
        options: [
          'Donner de l\'argent sans suivi',
          'Former et accompagner dans la durée',
          'Faire une intervention unique',
          'Laisser les acteurs se débrouiller',
        ],
        correctAnswer: 1,
        explanation: 'Former et accompagner dans la durée garantit un changement durable des pratiques, contrairement aux interventions ponctuelles qui ont un impact limité.',
      },
    ],
  },
  {
    id: 'institution_coordination_acteurs',
    role: 'institution' as const,
    category: 'Gestion Institutionnelle',
    title: 'Coordonner les acteurs de la filière',
    description: 'Facilite la collaboration entre producteurs, coopératives et marchands',
    duration: 3,
    points: 30,
    content: {
      title: 'Coordonner les acteurs de la filière',
      content: 'Une filière performante nécessite une bonne coordination entre tous les maillons. L\'institution joue un rôle de facilitateur en créant des espaces de dialogue et en résolvant les conflits.',
      example: 'Organiser des rencontres trimestrielles entre producteurs et marchands pour discuter des prix, volumes et qualité, réduisant ainsi les tensions.',
      bulletPoints: [
        'Créer des espaces de dialogue réguliers',
        'Faciliter les échanges entre acteurs',
        'Résoudre les conflits de manière neutre',
        'Promouvoir les partenariats gagnant-gagnant',
      ],
    },
    questions: [
      {
        question: 'Quel est le rôle de l\'institution dans les conflits ?',
        options: [
          'Prendre parti pour un camp',
          'Faciliter le dialogue et trouver des solutions neutres',
          'Ignorer les conflits',
          'Punir tous les acteurs',
        ],
        correctAnswer: 1,
        explanation: 'L\'institution doit rester neutre, faciliter le dialogue entre les parties et aider à trouver des solutions équitables qui satisfont tous les acteurs.',
      },
      {
        question: 'Pourquoi organiser des rencontres entre acteurs ?',
        options: [
          'Pour perdre du temps',
          'Pour faciliter les échanges et réduire les tensions',
          'Ce n\'est pas utile',
          'Pour imposer des décisions',
        ],
        correctAnswer: 1,
        explanation: 'Les rencontres régulières permettent aux acteurs d\'échanger, de se comprendre, de négocier et de construire des relations de confiance durables.',
      },
      {
        question: 'Qu\'est-ce qu\'un partenariat gagnant-gagnant ?',
        options: [
          'Seul le marchand gagne',
          'Tous les acteurs bénéficient de la collaboration',
          'Seul le producteur gagne',
          'Personne ne gagne',
        ],
        correctAnswer: 1,
        explanation: 'Un partenariat gagnant-gagnant est une collaboration où tous les acteurs (producteurs, marchands, institutions) bénéficient et trouvent leur intérêt.',
      },
    ],
  },
];
