// Formations pour profil Marchand

export const marchandFormations = [
  {
    id: 'marchand_gestion_caisse',
    role: 'marchand' as const,
    category: 'Gestion de Commerce',
    title: 'Gérer sa caisse correctement',
    description: 'Apprends les bonnes pratiques pour ouvrir et fermer ta caisse chaque jour',
    duration: 3,
    points: 30,
    content: {
      title: 'Gérer sa caisse correctement',
      content: 'Toujours compter ta caisse avant d\'ouvrir et après fermeture. Cela te permet de détecter immédiatement les erreurs et les vols. Une bonne gestion de caisse est la base d\'un commerce prospère.',
      example: 'Ouverture : 50 000 FCFA. Ventes de la journée : +35 000 FCFA. Cahier : -5 000 FCFA. Total attendu en caisse : 80 000 FCFA. Si tu trouves un montant différent, il y a un problème à identifier.',
      bulletPoints: [
        'Compter la caisse matin et soir systématiquement',
        'Noter tous les mouvements dans JÙLABA',
        'Conserver les preuves de toutes les transactions',
        'Faire un inventaire régulier de ton stock',
      ],
    },
    questions: [
      {
        question: 'Quand faut-il compter sa caisse ?',
        options: [
          'Le matin uniquement',
          'Le soir uniquement',
          'Matin ET soir',
          'Une fois par semaine',
        ],
        correctAnswer: 2,
        explanation: 'Compter matin et soir permet de détecter immédiatement les erreurs et vols. C\'est une règle d\'or pour tout commerçant.',
      },
      {
        question: 'Si ta caisse ne correspond pas au montant attendu, que fais-tu ?',
        options: [
          'J\'ignore la différence',
          'Je cherche l\'erreur immédiatement',
          'J\'attends la fin du mois',
          'Je rajoute l\'argent manquant',
        ],
        correctAnswer: 1,
        explanation: 'Il faut chercher l\'erreur immédiatement pendant que les transactions sont encore fraîches dans ta mémoire. Attendre rend la recherche beaucoup plus difficile.',
      },
      {
        question: 'Pourquoi est-il important de noter tous les mouvements ?',
        options: [
          'Pour faire plaisir à JÙLABA',
          'Pour suivre précisément mes finances',
          'C\'est obligatoire par la loi',
          'Pour impressionner mes clients',
        ],
        correctAnswer: 1,
        explanation: 'Noter tous les mouvements te permet de suivre précisément tes finances, d\'identifier les tendances et de prendre de meilleures décisions commerciales.',
      },
    ],
  },
  {
    id: 'marchand_fixation_prix',
    role: 'marchand' as const,
    category: 'Gestion de Commerce',
    title: 'Fixer le bon prix',
    description: 'Apprends à calculer ta marge et fixer des prix justes et rentables',
    duration: 3,
    points: 30,
    content: {
      title: 'Fixer le bon prix',
      content: 'Pour fixer un prix juste, tu dois connaître ton prix d\'achat, ajouter une marge raisonnable (généralement 20-30% pour les produits vivriers), et vérifier les prix du marché. Un prix trop élevé fait fuir les clients, un prix trop bas réduit ton bénéfice.',
      example: 'Prix d\'achat d\'un sac de riz : 10 000 FCFA. Marge de 25% : 2 500 FCFA. Prix de vente recommandé : 12 500 FCFA. Vérifie que ce prix est aligné avec le marché local.',
      bulletPoints: [
        'Connaître précisément ton prix d\'achat',
        'Ajouter une marge entre 20-30%',
        'Vérifier les prix de la concurrence',
        'Ajuster selon la qualité de ton produit',
      ],
    },
    questions: [
      {
        question: 'Si tu achètes un produit 10 000 FCFA, à combien le vendre avec 25% de marge ?',
        options: [
          '11 000 FCFA',
          '12 000 FCFA',
          '12 500 FCFA',
          '15 000 FCFA',
        ],
        correctAnswer: 2,
        explanation: '25% de 10 000 = 2 500 FCFA. Donc 10 000 + 2 500 = 12 500 FCFA. C\'est le calcul de base pour toute fixation de prix.',
      },
      {
        question: 'Que faire si ton concurrent vend moins cher ?',
        options: [
          'Baisser immédiatement mon prix',
          'Analyser la situation avant de décider',
          'Augmenter mon prix',
          'Abandonner ce produit',
        ],
        correctAnswer: 1,
        explanation: 'Analyse d\'abord : est-ce que sa qualité est identique ? A-t-il des coûts plus bas ? Peut-être peux-tu te différencier par le service ou la qualité plutôt que par le prix.',
      },
      {
        question: 'Quelle est la marge recommandée pour les produits vivriers ?',
        options: [
          '10-15%',
          '20-30%',
          '50-60%',
          '100%',
        ],
        correctAnswer: 1,
        explanation: 'Pour les produits vivriers, une marge de 20-30% est généralement raisonnable. Elle te permet de couvrir tes frais et de dégager un bénéfice tout en restant compétitif.',
      },
    ],
  },
  {
    id: 'marchand_gestion_stock',
    role: 'marchand' as const,
    category: 'Gestion de Commerce',
    title: 'Gérer son stock efficacement',
    description: 'Évite les ruptures et le gaspillage en gérant bien ton stock',
    duration: 3,
    points: 30,
    content: {
      title: 'Gérer son stock efficacement',
      content: 'Un bon stock, c\'est un stock qui tourne ! Ne garde pas trop de marchandise (risque de gaspillage) ni trop peu (risque de rupture). Pour les produits périssables, applique la règle FIFO : First In, First Out (premier entré, premier sorti).',
      example: 'Si ton stock de tomates est inférieur à 10%, commande immédiatement. Si tu as des tomates depuis 3 jours, vends-les en priorité avant les tomates fraîches du jour.',
      bulletPoints: [
        'Vérifier ton stock tous les jours',
        'Commander dès que le stock passe sous 10%',
        'Appliquer FIFO pour les produits périssables',
        'Stocker dans de bonnes conditions (frais, sec, propre)',
      ],
    },
    questions: [
      {
        question: 'Si ton stock de tomates est à 8%, que fais-tu ?',
        options: [
          'J\'attends encore un peu',
          'Je commande immédiatement',
          'J\'augmente le prix',
          'Je change de produit',
        ],
        correctAnswer: 1,
        explanation: 'Sous 10% de stock, il faut commander immédiatement pour éviter la rupture. Tes clients pourraient aller chez la concurrence si tu n\'as plus de produit.',
      },
      {
        question: 'Que signifie FIFO ?',
        options: [
          'Finir Immédiatement les Fruits et Oranges',
          'Premier entré, premier sorti',
          'Faire l\'Inventaire Fréquemment Obligatoire',
          'Fixer les prix Intelligemment et Facilement',
        ],
        correctAnswer: 1,
        explanation: 'FIFO signifie First In, First Out (premier entré, premier sorti). C\'est essentiel pour les produits périssables afin d\'éviter le gaspillage.',
      },
      {
        question: 'Pourquoi ne pas stocker trop de marchandise ?',
        options: [
          'Ça coûte plus cher en transport',
          'Risque de gaspillage et immobilisation d\'argent',
          'Les clients préfèrent les petits stocks',
          'C\'est interdit par la loi',
        ],
        correctAnswer: 1,
        explanation: 'Trop de stock, c\'est de l\'argent immobilisé et un risque de gaspillage, surtout pour les produits périssables. Mieux vaut un stock qui tourne rapidement.',
      },
    ],
  },
];