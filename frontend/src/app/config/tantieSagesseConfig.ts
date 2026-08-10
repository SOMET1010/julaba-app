// Configuration contextuelle de Tanti Sagesse par module

export type ModuleType = 'dashboard' | 'pos' | 'marche' | 'historique' | 'cotisations' | 'produits' | 'profil' | 'cahier';

export interface VoiceCommand {
  patterns: string[]; // Mots-clés à détecter
  action: string; // Action à exécuter
  description: string; // Description pour l'utilisateur
}

export interface QuickSuggestion {
  label: string;
  action: string;
  icon?: string;
}

export interface ModuleConfig {
  name: string;
  welcomeMessage: string;
  personality: string; // Rôle de l'assistant dans ce contexte
  quickSuggestions: QuickSuggestion[];
  voiceCommands: VoiceCommand[];
  color: string; // Couleur d'accentuation
  blockMessage?: string; // Message si commande hors contexte
}

export const TANTI_SAGESSE_CONFIGS: Record<ModuleType, ModuleConfig> = {
  dashboard: {
    name: 'Tableau de Bord',
    welcomeMessage: 'Bonjour ! Je suis là pour t\'aider à comprendre tes performances du jour.',
    personality: 'Assistante d\'analyse et de pilotage',
    color: '#C46210',
    quickSuggestions: [
      { label: 'Mes ventes du jour', action: 'show_sales' },
      { label: 'Mes cahier', action: 'show_expenses' },
      { label: 'Mon solde', action: 'show_balance' },
      { label: 'Ouvrir ma journée', action: 'open_day' },
    ],
    voiceCommands: [
      {
        patterns: ['combien', 'gagné', 'ventes', 'vendu'],
        action: 'announce_sales',
        description: 'Annoncer les ventes du jour',
      },
      {
        patterns: ['cahier', 'dépensé', 'sorti'],
        action: 'announce_expenses',
        description: 'Annoncer les cahier du jour',
      },
      {
        patterns: ['solde', 'reste', 'caisse'],
        action: 'announce_balance',
        description: 'Annoncer le solde',
      },
      {
        patterns: ['ouvrir', 'journée', 'commencer'],
        action: 'open_day',
        description: 'Ouvrir la journée',
      },
      {
        patterns: ['fermer', 'clôture', 'terminer'],
        action: 'close_day',
        description: 'Fermer la journée',
      },
    ],
    blockMessage: 'Je ne peux pas faire ça depuis le tableau de bord. Va dans le module approprié.',
  },

  pos: {
    name: 'Point de Vente',
    welcomeMessage: 'Prête à encaisser ! Dicte-moi tes ventes ou ajoute des produits au panier.',
    personality: 'Assistante d\'encaissement',
    color: '#00563B',
    quickSuggestions: [
      { label: 'Ajouter produit', action: 'add_product' },
      { label: 'Voir le panier', action: 'show_cart' },
      { label: 'Encaisser', action: 'checkout' },
      { label: 'Vider panier', action: 'clear_cart' },
    ],
    voiceCommands: [
      {
        patterns: ['ajoute', 'ajouter', 'mets', 'mettez'],
        action: 'add_to_cart',
        description: 'Ajouter un produit au panier',
      },
      {
        patterns: ['supprime', 'enlève', 'retire'],
        action: 'remove_from_cart',
        description: 'Retirer un produit du panier',
      },
      {
        patterns: ['panier', 'voir', 'montre'],
        action: 'show_cart',
        description: 'Afficher le panier',
      },
      {
        patterns: ['encaisse', 'payer', 'valider', 'finalise'],
        action: 'checkout',
        description: 'Encaisser la vente',
      },
      {
        patterns: ['vider', 'annuler', 'recommence'],
        action: 'clear_cart',
        description: 'Vider le panier',
      },
      {
        patterns: ['mobile money', 'orange', 'mtn', 'moov'],
        action: 'pay_mobile_money',
        description: 'Paiement Mobile Money',
      },
      {
        patterns: ['keiwa', 'portefeuille'],
        action: 'pay_keiwa',
        description: 'Paiement Keiwa',
      },
      {
        patterns: ['espèces', 'liquide', 'cash'],
        action: 'pay_cash',
        description: 'Paiement en espèces',
      },
    ],
    blockMessage: 'Je ne peux pas analyser tes ventes depuis le Point de Vente. Va dans le Dashboard.',
  },

  marche: {
    name: 'Marché Virtuel',
    welcomeMessage: 'Explore le marché ! Je peux t\'aider à trouver et commander des produits.',
    personality: 'Assistante marketplace',
    color: '#2072AF',
    quickSuggestions: [
      { label: 'Chercher produit', action: 'search_product' },
      { label: 'Voir disponibilités', action: 'show_availability' },
      { label: 'Comparer prix', action: 'compare_prices' },
      { label: 'Mes commandes', action: 'show_orders' },
    ],
    voiceCommands: [
      {
        patterns: ['cherche', 'trouve', 'recherche'],
        action: 'search_product',
        description: 'Rechercher un produit',
      },
      {
        patterns: ['commande', 'commander', 'achète'],
        action: 'order_product',
        description: 'Commander un produit',
      },
      {
        patterns: ['disponible', 'stock', 'dispo'],
        action: 'check_availability',
        description: 'Vérifier disponibilité',
      },
      {
        patterns: ['prix', 'coûte', 'combien'],
        action: 'check_price',
        description: 'Vérifier le prix',
      },
      {
        patterns: ['moins cher', 'meilleur prix', 'promo'],
        action: 'find_best_price',
        description: 'Trouver meilleur prix',
      },
    ],
    blockMessage: 'Je ne peux pas encaisser depuis le Marché. Va dans le Point de Vente.',
  },

  historique: {
    name: 'Historique',
    welcomeMessage: 'Analysons tes transactions ! Je peux filtrer et comparer tes périodes.',
    personality: 'Assistante analytique',
    color: '#702963',
    quickSuggestions: [
      { label: 'Ventes de la semaine', action: 'filter_week' },
      { label: 'Comparer mois', action: 'compare_months' },
      { label: 'Voir graphiques', action: 'show_charts' },
      { label: 'Exporter données', action: 'export_data' },
    ],
    voiceCommands: [
      {
        patterns: ['montre', 'affiche', 'voir'],
        action: 'show_transactions',
        description: 'Afficher les transactions',
      },
      {
        patterns: ['semaine', 'dernière semaine'],
        action: 'filter_week',
        description: 'Filtrer par semaine',
      },
      {
        patterns: ['mois', 'ce mois', 'dernier mois'],
        action: 'filter_month',
        description: 'Filtrer par mois',
      },
      {
        patterns: ['compare', 'comparaison', 'différence'],
        action: 'compare_periods',
        description: 'Comparer des périodes',
      },
      {
        patterns: ['graphique', 'courbe', 'évolution'],
        action: 'show_charts',
        description: 'Afficher graphiques',
      },
      {
        patterns: ['tendance', 'progression', 'baisse'],
        action: 'analyze_trends',
        description: 'Analyser tendances',
      },
    ],
    blockMessage: 'Je ne peux pas modifier le stock depuis l\'Historique. Va dans Produits.',
  },

  cotisations: {
    name: 'Cotisations',
    welcomeMessage: 'Parlons de tes cotisations sociales. CNPS et CMU, je t\'explique tout.',
    personality: 'Assistante sociale',
    color: '#16A34A',
    quickSuggestions: [
      { label: 'Mon total CNPS', action: 'show_cnps' },
      { label: 'Mon total CMU', action: 'show_cmu' },
      { label: 'Reste à payer', action: 'show_remaining' },
      { label: 'Expliquer cotisations', action: 'explain_cotisations' },
    ],
    voiceCommands: [
      {
        patterns: ['cnps', 'caisse nationale'],
        action: 'show_cnps',
        description: 'Afficher cotisations CNPS',
      },
      {
        patterns: ['cmu', 'couverture', 'santé'],
        action: 'show_cmu',
        description: 'Afficher cotisations CMU',
      },
      {
        patterns: ['combien', 'dois', 'reste', 'payer'],
        action: 'show_remaining',
        description: 'Montant restant à payer',
      },
      {
        patterns: ['explique', 'c\'est quoi', 'pourquoi'],
        action: 'explain_cotisations',
        description: 'Expliquer les cotisations',
      },
      {
        patterns: ['échéance', 'date', 'quand'],
        action: 'show_deadline',
        description: 'Afficher échéance',
      },
    ],
    blockMessage: 'Je ne peux pas calculer ça ici. Va voir tes ventes dans le Dashboard.',
  },

  produits: {
    name: 'Gestion Produits',
    welcomeMessage: 'Gérons ton stock ensemble ! Je peux t\'aider à suivre tes produits.',
    personality: 'Assistante de stock',
    color: '#C46210',
    quickSuggestions: [
      { label: 'Ajouter produit', action: 'add_product' },
      { label: 'Stock faible', action: 'show_low_stock' },
      { label: 'Mouvement stock', action: 'show_movements' },
      { label: 'Inventaire', action: 'show_inventory' },
    ],
    voiceCommands: [
      {
        patterns: ['ajoute', 'créer', 'nouveau produit'],
        action: 'add_product',
        description: 'Ajouter un produit',
      },
      {
        patterns: ['stock', 'rupture', 'faible'],
        action: 'show_low_stock',
        description: 'Produits en stock faible',
      },
      {
        patterns: ['mouvement', 'entrée', 'sortie'],
        action: 'show_movements',
        description: 'Mouvements de stock',
      },
      {
        patterns: ['inventaire', 'liste', 'tous'],
        action: 'show_inventory',
        description: 'Inventaire complet',
      },
      {
        patterns: ['modifie', 'change', 'prix'],
        action: 'edit_product',
        description: 'Modifier un produit',
      },
    ],
    blockMessage: 'Je ne peux pas faire ça depuis la Gestion Produits.',
  },

  profil: {
    name: 'Profil',
    welcomeMessage: 'Ton profil et tes paramètres. Que veux-tu modifier ?',
    personality: 'Assistante de compte',
    color: '#C46210',
    quickSuggestions: [
      { label: 'Mes informations', action: 'show_info' },
      { label: 'Mon score crédit', action: 'show_score' },
      { label: 'Mes documents', action: 'show_documents' },
      { label: 'Déconnexion', action: 'logout' },
    ],
    voiceCommands: [
      {
        patterns: ['informations', 'profil', 'données'],
        action: 'show_info',
        description: 'Afficher informations',
      },
      {
        patterns: ['score', 'crédit', 'niveau'],
        action: 'show_score',
        description: 'Afficher score crédit',
      },
      {
        patterns: ['document', 'pièce', 'justificatif'],
        action: 'show_documents',
        description: 'Mes documents',
      },
      {
        patterns: ['déconnexion', 'sortir', 'quitter'],
        action: 'logout',
        description: 'Se déconnecter',
      },
    ],
    blockMessage: 'Je ne peux pas faire ça depuis ton Profil.',
  },

  cahier: {
    name: 'Cahier',
    welcomeMessage: 'Note tes cahier du jour pour mieux gérer ta trésorerie.',
    personality: 'Assistante de gestion',
    color: '#DC2626',
    quickSuggestions: [
      { label: 'Ajouter dépense', action: 'add_expense' },
      { label: 'Total du jour', action: 'show_total' },
      { label: 'Par catégorie', action: 'by_category' },
      { label: 'Historique', action: 'show_history' },
    ],
    voiceCommands: [
      {
        patterns: ['ajoute', 'note', 'dépense'],
        action: 'add_expense',
        description: 'Ajouter une dépense',
      },
      {
        patterns: ['total', 'combien', 'dépensé'],
        action: 'show_total',
        description: 'Total des cahier',
      },
      {
        patterns: ['catégorie', 'type'],
        action: 'by_category',
        description: 'Cahier par catégorie',
      },
      {
        patterns: ['historique', 'liste', 'toutes'],
        action: 'show_history',
        description: 'Historique complet',
      },
    ],
    blockMessage: 'Je ne peux pas faire ça depuis les Cahier.',
  },
};

// Helper function to get config based on current route
export function getModuleFromPath(pathname: string): ModuleType {
  if (pathname.includes('/caisse')) return 'pos';
  if (pathname.includes('/marche') || pathname.includes('/marketplace')) return 'marche';
  if (pathname.includes('/historique') || pathname.includes('/transactions')) return 'historique';
  if (pathname.includes('/cotisations')) return 'cotisations';
  if (pathname.includes('/produits') || pathname.includes('/stock')) return 'produits';
  if (pathname.includes('/profil') || pathname.includes('/profile')) return 'profil';
  if (pathname.includes('/depense')) return 'cahier';
  
  // Default to dashboard for home or unknown routes
  return 'dashboard';
}
