// Formations pour profil Identificateur

export const identificateurFormations = [
  {
    id: 'identificateur_processus_identification',
    role: 'identificateur' as const,
    category: 'Identification',
    title: 'Maîtriser le processus d\'identification',
    description: 'Réalise des identifications complètes et conformes',
    duration: 3,
    points: 30,
    content: {
      title: 'Maîtriser le processus d\'identification',
      content: 'L\'identification est la première étape pour intégrer un acteur dans JÙLABA. Un dossier complet et bien renseigné facilite la validation et évite les retards. La précision est essentielle.',
      example: 'Pour identifier un marchand : vérifier la pièce d\'identité, remplir tous les champs obligatoires (nom, localisation, activité), prendre une photo claire, géolocaliser le commerce.',
      bulletPoints: [
        'Vérifier l\'identité de l\'acteur (CNI, passeport)',
        'Remplir tous les champs obligatoires',
        'Prendre des photos de qualité',
        'Géolocaliser précisément le lieu d\'activité',
      ],
    },
    questions: [
      {
        question: 'Quel document est obligatoire pour identifier un acteur ?',
        options: [
          'Permis de conduire',
          'Carte d\'identité ou passeport',
          'Facture d\'électricité',
          'Aucun document',
        ],
        correctAnswer: 1,
        explanation: 'La carte d\'identité nationale (CNI) ou le passeport est obligatoire pour vérifier l\'identité de l\'acteur et éviter les fraudes.',
      },
      {
        question: 'Pourquoi géolocaliser le lieu d\'activité ?',
        options: [
          'C\'est juste une option',
          'Pour retrouver facilement l\'acteur et vérifier son activité',
          'Pour faire plaisir à JÙLABA',
          'Ce n\'est pas nécessaire',
        ],
        correctAnswer: 1,
        explanation: 'La géolocalisation permet de retrouver facilement l\'acteur, de vérifier son activité et d\'organiser le suivi sur le terrain.',
      },
      {
        question: 'Que faire si un champ obligatoire n\'est pas disponible ?',
        options: [
          'Inventer une information',
          'Laisser vide et soumettre quand même',
          'Demander l\'information à l\'acteur avant de soumettre',
          'Supprimer le dossier',
        ],
        correctAnswer: 2,
        explanation: 'Il faut toujours demander l\'information manquante à l\'acteur. Un dossier incomplet sera rejeté lors de la validation.',
      },
    ],
  },
  {
    id: 'identificateur_verification_documents',
    role: 'identificateur' as const,
    category: 'Identification',
    title: 'Vérifier les documents',
    description: 'Détecte les faux documents et garantis la conformité',
    duration: 3,
    points: 30,
    content: {
      title: 'Vérifier les documents',
      content: 'La vérification des documents est cruciale pour éviter les fraudes. Une CNI, un registre de commerce ou un certificat de formation doivent être vérifiés pour garantir leur authenticité.',
      example: 'Pour vérifier une CNI : contrôler la photo, vérifier la date d\'expiration, toucher les reliefs de sécurité, comparer le nom avec celui déclaré par l\'acteur.',
      bulletPoints: [
        'Vérifier la photo et le nom sur le document',
        'Contrôler la date d\'expiration',
        'Toucher les éléments de sécurité (hologrammes, reliefs)',
        'Comparer avec les déclarations de l\'acteur',
      ],
    },
    questions: [
      {
        question: 'Comment détecter un faux document ?',
        options: [
          'Impossible à détecter',
          'Vérifier photo, date, éléments de sécurité',
          'Demander à l\'acteur',
          'Ce n\'est pas notre rôle',
        ],
        correctAnswer: 1,
        explanation: 'Vérifier la photo, la date d\'expiration et les éléments de sécurité (hologrammes, reliefs) permet de détecter la plupart des faux documents.',
      },
      {
        question: 'Que faire si un document semble faux ?',
        options: [
          'Accepter quand même',
          'Refuser l\'identification et signaler',
          'Ignorer le problème',
          'Demander un pot-de-vin',
        ],
        correctAnswer: 1,
        explanation: 'Il faut refuser l\'identification et signaler immédiatement le cas suspect à la hiérarchie. Accepter un faux document est une faute grave.',
      },
      {
        question: 'Quels éléments de sécurité vérifier sur une CNI ?',
        options: [
          'La couleur uniquement',
          'Hologrammes, reliefs, photo',
          'Rien, faire confiance',
          'Uniquement le nom',
        ],
        correctAnswer: 1,
        explanation: 'Une CNI authentique comporte des hologrammes, des reliefs tactiles et une photo nette. Ces éléments doivent tous être vérifiés.',
      },
    ],
  },
  {
    id: 'identificateur_respect_ethique',
    role: 'identificateur' as const,
    category: 'Identification',
    title: 'Respecter l\'éthique professionnelle',
    description: 'Maintiens l\'intégrité et la confiance dans ton travail',
    duration: 3,
    points: 30,
    content: {
      title: 'Respecter l\'éthique professionnelle',
      content: 'L\'identificateur est le visage de JÙLABA sur le terrain. Respect, honnêteté et professionnalisme sont essentiels pour inspirer confiance aux acteurs et maintenir la crédibilité du système.',
      example: 'Ne jamais demander d\'argent pour une identification, traiter tous les acteurs avec respect, protéger les données personnelles collectées.',
      bulletPoints: [
        'Ne jamais demander d\'argent aux acteurs',
        'Traiter tous les acteurs avec respect',
        'Protéger les données personnelles',
        'Rester neutre et objectif',
      ],
    },
    questions: [
      {
        question: 'Est-il acceptable de demander un "petit cadeau" à un acteur ?',
        options: [
          'Oui, c\'est normal',
          'Non, c\'est de la corruption',
          'Seulement si c\'est petit',
          'Seulement s\'il offre',
        ],
        correctAnswer: 1,
        explanation: 'Demander de l\'argent ou un cadeau est de la corruption. L\'identification est un service gratuit et tout manquement à cette règle est sanctionnable.',
      },
      {
        question: 'Comment traiter les données personnelles collectées ?',
        options: [
          'Les partager avec des amis',
          'Les protéger et garder confidentielles',
          'Les vendre à des tiers',
          'Peu importe',
        ],
        correctAnswer: 1,
        explanation: 'Les données personnelles doivent être protégées et gardées strictement confidentielles. Les partager est une violation grave de la confiance.',
      },
      {
        question: 'Si un acteur ne remplit pas les critères, que faire ?',
        options: [
          'L\'identifier quand même contre paiement',
          'Refuser poliment et expliquer pourquoi',
          'L\'ignorer',
          'L\'insulter',
        ],
        correctAnswer: 1,
        explanation: 'Il faut refuser poliment et expliquer clairement les critères non remplis. Rester professionnel même en cas de refus maintient la crédibilité.',
      },
    ],
  },
];
