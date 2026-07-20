/**
 * Configuration centralisée des rôles JULABA
 * Respecte strictement les règles d'harmonisation :
 * - 100% du système UI est identique
 * - Seule la couleur primaire et les données métier changent
 */

export const ROLE_COLORS = {
  marchand: '#C66A2C',
  producteur: '#2E8B57',
  cooperative: '#2072AF',
  cooperateur: '#2072AF',
  identificateur: '#9F8170',
  institution: '#712864',
  administrateur: '#712864',
} as const;

export type RoleType = keyof typeof ROLE_COLORS;

export interface RoleConfig {
  name: string;
  primaryColor: string;
  gradientFrom: string;
  gradientTo: string;
  bgWarm: string;
  greeting: string;
  bottomBar: {
    items: Array<{
      label: string;
      path: string;
      icon: string;
    }>;
  };
  dashboardKPIs: {
    kpi1: {
      label: string;
      unit: string;
      icon: string;
      color: string;
    };
    kpi2: {
      label: string;
      unit: string;
      icon: string;
      color: string;
    };
  };
  mainActions: {
    action1: {
      label: string;
      subtitle: string;
      route: string;
      color: string;
      icon: string;
    };
    action2: {
      label: string;
      subtitle: string;
      route: string;
      color: string;
      icon: string;
    };
  };
  // 🆕 Configuration des pages universelles
  pages?: {
    accueil: {
      hasSessionManagement: boolean; // Gestion journée (Marchand uniquement)
      hasKeiwa: boolean; // Afficher le keiwa
      hasTerritoire?: boolean; // Section territoire (Identificateur)
    };
    menu2: {
      menuLabel: string; // "MARCHÉ" | "PRODUCTION" | "MEMBRES" | "ACTEURS"
      pageTitle: string;
      description: string;
      dataType: 'produits' | 'cultures' | 'membres' | 'acteurs';
    };
    menu3: {
      menuLabel: string; // "PRODUITS" | "COMMANDES" | "SUIVI" | "ANALYTICS"
      pageTitle: string;
      description: string;
      dataType: 'stock' | 'commandes' | 'dossiers' | 'analytics';
      tabs: string[];
    };
  };
}

export const ROLE_CONFIGS: Record<RoleType, RoleConfig> = {
  marchand: {
    name: 'Marchand',
    primaryColor: ROLE_COLORS.marchand,
    gradientFrom: 'from-orange-50',
    gradientTo: 'to-white',
    bgWarm: '#FFF2E9',
    greeting: 'Ouvre ta journée pour commencer',
    bottomBar: {
      items: [
        { label: 'Accueil', path: '/marchand', icon: 'Home' },
        { label: 'Marché', path: '/marchand/marche', icon: 'Store' },
        { label: 'Commandes', path: '/marchand/commandes', icon: 'ShoppingCart' },
        { label: 'Moi', path: '/marchand/profil', icon: 'User' },
      ],
    },
    dashboardKPIs: {
      kpi1: {
        label: 'Ventes du jour',
        unit: 'FCFA',
        icon: 'TrendingUp',
        color: '#16A34A',
      },
      kpi2: {
        label: 'Marge du jour',
        unit: 'FCFA',
        icon: 'TrendingUp',
        color: '#16A34A',
      },
    },
    mainActions: {
      action1: {
        label: "Je vends",
        subtitle: 'Encaisser une vente',
        route: '/marchand/vendre',
        color: '#16A34A',
        icon: 'TrendingUp',
      },
      action2: {
        label: "Je dépense",
        subtitle: 'Saisir tes cahier',
        route: '/marchand/cahier',
        color: '#DC2626',
        icon: 'TrendingDown',
      },
    },
    // 🆕 Configuration des pages universelles
    pages: {
      accueil: {
        hasSessionManagement: true,
        hasKeiwa: true,
      },
      menu2: {
        menuLabel: 'MARCHÉ',
        pageTitle: 'Marché',
        description: 'Gérer tes produits et ventes',
        dataType: 'produits',
      },
      menu3: {
        menuLabel: 'PRODUITS',
        pageTitle: 'Stocks',
        description: 'Gérer tes stocks de produits',
        dataType: 'stock',
        tabs: ['Stocks', 'Historique'],
      },
    },
  },
  producteur: {
    name: 'Producteur',
    primaryColor: ROLE_COLORS.producteur,
    gradientFrom: 'from-green-50',
    gradientTo: 'to-white',
    bgWarm: '#F0FAF4',
    greeting: 'Enregistre tes récoltes et ventes aujourd\'hui',
    bottomBar: {
      items: [
        { label: 'Accueil', path: '/producteur', icon: 'Home' },
        { label: 'Production', path: '/producteur/production', icon: 'Sprout' },
        { label: 'Commandes', path: '/producteur/commandes', icon: 'ShoppingCart' },
        { label: 'Moi', path: '/producteur/profil', icon: 'User' },
      ],
    },
    dashboardKPIs: {
      kpi1: {
        label: 'Production totale',
        unit: 'kg',
        icon: 'Sprout',
        color: '#16A34A',
      },
      kpi2: {
        label: 'Revenus totaux',
        unit: 'FCFA',
        icon: 'TrendingUp',
        color: '#2563EB',
      },
    },
    mainActions: {
      action1: {
        label: "Nouvelle plantation",
        subtitle: 'Créer une plantation agricole',
        route: '/producteur/production',
        color: '#16A34A',
        icon: 'Sprout',
      },
      action2: {
        label: "Déclarer récolte",
        subtitle: 'Enregistrer une récolte',
        route: '/producteur/production',
        color: '#2563EB',
        icon: 'Package',
      },
    },
    // 🆕 Configuration des pages universelles
    pages: {
      accueil: {
        hasSessionManagement: false,
        hasKeiwa: true,
      },
      menu2: {
        menuLabel: 'PRODUCTION',
        pageTitle: 'Production',
        description: 'Gérer tes cultures et récoltes',
        dataType: 'cultures',
      },
      menu3: {
        menuLabel: 'COMMANDES',
        pageTitle: 'Commandes',
        description: 'Gérer tes commandes',
        dataType: 'commandes',
        tabs: ['Commandes', 'Historique'],
      },
    },
  },
  cooperative: {
    name: 'Coopérative',
    primaryColor: ROLE_COLORS.cooperative,
    gradientFrom: 'from-blue-50',
    gradientTo: 'to-white',
    bgWarm: '#EFF6FF',
    greeting: 'Gère tes membres et stocks communs',
    bottomBar: {
      items: [
        { label: 'Accueil', path: '/cooperative', icon: 'Home' },
        { label: 'Marché', path: '/cooperative/marche', icon: 'Store' },
        { label: 'Membres', path: '/cooperative/membres', icon: 'Users' },
        { label: 'Moi', path: '/cooperative/profil', icon: 'User' },
      ],
    },
    dashboardKPIs: {
      kpi1: {
        label: 'Volume groupé',
        unit: 'kg',
        icon: 'Package',
        color: '#16A34A',
      },
      kpi2: {
        label: 'Transactions',
        unit: 'FCFA',
        icon: 'TrendingUp',
        color: '#2563EB',
      },
    },
    mainActions: {
      action1: {
        label: 'Achats groupés',
        subtitle: 'Voir les achats',
        route: '/cooperative/marche',
        color: '#16A34A',
        icon: 'ShoppingCart',
      },
      action2: {
        label: 'Ventes groupées',
        subtitle: 'Voir les ventes',
        route: '/cooperative/marche',
        color: '#2563EB',
        icon: 'TrendingUp',
      },
    },
    // 🆕 Configuration des pages universelles
    pages: {
      accueil: {
        hasSessionManagement: false,
        hasKeiwa: true,
      },
      menu2: {
        menuLabel: 'MEMBRES',
        pageTitle: 'Membres',
        description: 'Gérer tes membres',
        dataType: 'membres',
      },
      menu3: {
        menuLabel: 'COMMANDES',
        pageTitle: 'Commandes Groupées',
        description: 'Gérer les commandes communes',
        dataType: 'commandes',
        tabs: ['En cours', 'Livrées', 'Historique'],
      },
    },
  },
  cooperateur: {
    name: 'Coopérative',
    primaryColor: ROLE_COLORS.cooperative,
    gradientFrom: 'from-blue-50',
    gradientTo: 'to-white',
    bgWarm: '#EFF6FF',
    greeting: 'Gère tes membres et stocks communs',
    bottomBar: {
      items: [
        { label: 'Accueil', path: '/cooperative', icon: 'Home' },
        { label: 'Marché', path: '/cooperative/marche', icon: 'Store' },
        { label: 'Membres', path: '/cooperative/membres', icon: 'Users' },
        { label: 'Moi', path: '/cooperative/profil', icon: 'User' },
      ],
    },
    dashboardKPIs: {
      kpi1: {
        label: 'Volume groupé',
        unit: 'kg',
        icon: 'Package',
        color: '#16A34A',
      },
      kpi2: {
        label: 'Transactions',
        unit: 'FCFA',
        icon: 'TrendingUp',
        color: '#2563EB',
      },
    },
    mainActions: {
      action1: {
        label: 'Achats groupés',
        subtitle: 'Voir les achats',
        route: '/cooperative/marche',
        color: '#16A34A',
        icon: 'ShoppingCart',
      },
      action2: {
        label: 'Ventes groupées',
        subtitle: 'Voir les ventes',
        route: '/cooperative/marche',
        color: '#2563EB',
        icon: 'TrendingUp',
      },
    },
    // 🆕 Configuration des pages universelles
    pages: {
      accueil: {
        hasSessionManagement: false,
        hasKeiwa: true,
      },
      menu2: {
        menuLabel: 'MEMBRES',
        pageTitle: 'Membres',
        description: 'Gérer tes membres',
        dataType: 'membres',
      },
      menu3: {
        menuLabel: 'COMMANDES',
        pageTitle: 'Commandes Groupées',
        description: 'Gérer les commandes communes',
        dataType: 'commandes',
        tabs: ['En cours', 'Livrées', 'Historique'],
      },
    },
  },
  identificateur: {
    name: 'Identificateur',
    primaryColor: ROLE_COLORS.identificateur,
    gradientFrom: 'from-stone-50',
    gradientTo: 'to-white',
    bgWarm: '#F9F4F0',
    greeting: 'Identifie les nouveaux acteurs Jùlaba',
    bottomBar: {
      items: [
        { label: 'Accueil', path: '/identificateur', icon: 'Home' },
        { label: 'Acteurs', path: '/identificateur/identifications', icon: 'Users' },
        { label: 'Suivi', path: '/identificateur/rapports', icon: 'BarChart3' },
        { label: 'Moi', path: '/identificateur/profil', icon: 'User' },
      ],
    },
    dashboardKPIs: {
      kpi1: {
        label: 'Identifications',
        unit: 'acteurs',
        icon: 'UserCheck',
        color: '#16A34A',
      },
      kpi2: {
        label: 'Commissions',
        unit: 'FCFA',
        icon: 'TrendingUp',
        color: '#F59E0B',
      },
    },
    mainActions: {
      action1: {
        label: 'Nouveau marchand',
        subtitle: 'Identifier un marchand',
        route: '/identificateur/fiche-identification',
        color: ROLE_COLORS.marchand,
        icon: 'UserPlus',
      },
      action2: {
        label: 'Nouveau producteur',
        subtitle: 'Identifier un producteur',
        route: '/identificateur/fiche-identification',
        color: ROLE_COLORS.producteur,
        icon: 'Sprout',
      },
    },
    // 🆕 Configuration des pages universelles
    pages: {
      accueil: {
        hasSessionManagement: false,
        hasKeiwa: false,
        hasTerritoire: true,
      },
      menu2: {
        menuLabel: 'ACTEURS',
        pageTitle: 'Acteurs',
        description: 'Gérer les acteurs identifiés',
        dataType: 'acteurs',
      },
      menu3: {
        menuLabel: 'SUIVI',
        pageTitle: 'Suivi',
        description: 'Suivre les identifications',
        dataType: 'dossiers',
        tabs: ['Identifications', 'Commissions'],
      },
    },
  },
  institution: {
    name: 'Institution',
    primaryColor: ROLE_COLORS.institution,
    gradientFrom: 'from-purple-50',
    gradientTo: 'to-white',
    bgWarm: '#F9F0FF',
    greeting: 'Supervise l\'ensemble de la plateforme Jùlaba',
    bottomBar: {
      items: [
        { label: 'Accueil', path: '/institution', icon: 'Home' },
        { label: 'Acteurs', path: '/institution/acteurs', icon: 'Users' },
        { label: 'Supervision', path: '/institution/supervision', icon: 'BarChart3' },
        { label: 'Moi', path: '/institution/profil', icon: 'User' },
      ],
    },
    dashboardKPIs: {
      kpi1: {
        label: 'Utilisateurs actifs',
        unit: 'acteurs',
        icon: 'Users',
        color: '#16A34A',
      },
      kpi2: {
        label: 'Volume total',
        unit: 'FCFA',
        icon: 'TrendingUp',
        color: '#2563EB',
      },
    },
    mainActions: {
      action1: {
        label: 'Gestion utilisateurs',
        subtitle: 'Voir tous les utilisateurs',
        route: '/institution/acteurs',
        color: '#16A34A',
        icon: 'Users',
      },
      action2: {
        label: 'Analytics',
        subtitle: 'Voir les statistiques',
        route: '/institution/analytics',
        color: '#2563EB',
        icon: 'BarChart3',
      },
    },
    // 🆕 Configuration des pages universelles
    pages: {
      accueil: {
        hasSessionManagement: false,
        hasKeiwa: false,
      },
      menu2: {
        menuLabel: 'ACTEURS',
        pageTitle: 'Acteurs',
        description: 'Gérer les acteurs identifiés',
        dataType: 'acteurs',
      },
      menu3: {
        menuLabel: 'ANALYTICS',
        pageTitle: 'Analytics',
        description: 'Voir les statistiques',
        dataType: 'analytics',
        tabs: ['Production', 'Ventes'],
      },
    },
  },
  administrateur: {
    name: 'Administrateur',
    primaryColor: ROLE_COLORS.administrateur,
    gradientFrom: 'from-purple-50',
    gradientTo: 'to-white',
    bgWarm: '#F9F0FF',
    greeting: 'Supervise l\'ensemble de la plateforme Jùlaba',
    bottomBar: {
      items: [
        { label: 'Dashboard', path: '/institution', icon: 'LayoutDashboard' },
        { label: 'Utilisateurs', path: '/institution/acteurs', icon: 'Users' },
        { label: 'Transactions', path: '/institution/transactions', icon: 'DollarSign' },
        { label: 'Paramètres', path: '/institution/parametres', icon: 'Settings' },
      ],
    },
    dashboardKPIs: {
      kpi1: {
        label: 'Utilisateurs actifs',
        unit: 'acteurs',
        icon: 'Users',
        color: '#16A34A',
      },
      kpi2: {
        label: 'Volume total',
        unit: 'FCFA',
        icon: 'TrendingUp',
        color: '#2563EB',
      },
    },
    mainActions: {
      action1: {
        label: 'Gestion utilisateurs',
        subtitle: 'Voir tous les utilisateurs',
        route: '/institution/acteurs',
        color: '#16A34A',
        icon: 'Users',
      },
      action2: {
        label: 'Analytics',
        subtitle: 'Voir les statistiques',
        route: '/institution/analytics',
        color: '#2563EB',
        icon: 'BarChart3',
      },
    },
    // 🆕 Configuration des pages universelles
    pages: {
      accueil: {
        hasSessionManagement: false,
        hasKeiwa: false,
      },
      menu2: {
        menuLabel: 'ACTEURS',
        pageTitle: 'Acteurs',
        description: 'Gérer les acteurs identifiés',
        dataType: 'acteurs',
      },
      menu3: {
        menuLabel: 'ANALYTICS',
        pageTitle: 'Analytics',
        description: 'Voir les statistiques',
        dataType: 'analytics',
        tabs: ['Production', 'Ventes'],
      },
    },
  },
};

/**
 * Retourne la configuration d'un rôle
 */
export function getRoleConfig(role?: RoleType | null): RoleConfig {
  // Si pas de rôle, retourner la config marchand par défaut
  if (!role) {
    return ROLE_CONFIGS.marchand;
  }
  
  const config = ROLE_CONFIGS[role];
  if (!config) {
    // Retourner une configuration par défaut
    return ROLE_CONFIGS.marchand;
  }
  return config;
}

/**
 * Retourne la couleur primaire d'un rôle
 */
export function getRoleColor(role?: RoleType | null): string {
  // Si pas de rôle, retourner la couleur marchand par défaut
  if (!role) {
    return ROLE_COLORS.marchand;
  }
  
  const color = ROLE_COLORS[role];
  if (!color) {
    return ROLE_COLORS.marchand;
  }
  return color;
}