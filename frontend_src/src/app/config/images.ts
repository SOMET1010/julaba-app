/**
 * ═══════════════════════════════════════════════════════════════════
 * JÙLABA — Configuration Centralisée des Images
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Ce fichier remplace l'ancien système figma:asset par des chemins
 * organisés et maintenables dans /public/images/
 * 
 * Structure :
 * - /public/images/logos/       → Logos institutionnels et partenaires
 * - /public/images/icons/        → Icônes interface
 * - /public/images/avatars/      → Avatars Tata Lou
 * - /public/images/products/     → Images de produits vivriers
 * - /public/images/backgrounds/  → Fonds d'écran
 * - /public/images/money/        → Billets et pièces CFA
 */

const BASE_PATH = '/images';

// ══════════════════════════════════════════════════════════════════
// LOGOS INSTITUTIONNELS
// ══════════════════════════════════════════════════════════════════

export const LOGOS = {
  julaba: `${BASE_PATH}/logos/logos_julaba_white_512x512.png`,
  partenaires: `${BASE_PATH}/logos/logos_partenaires_1200x400.png`,
  orangeBackoffice: `${BASE_PATH}/logos/logos_orange_backoffice_256x256.png`,
} as const;

// ══════════════════════════════════════════════════════════════════
// MOBILE MONEY
// ══════════════════════════════════════════════════════════════════

export const MOBILE_MONEY = {
  orange: `${BASE_PATH}/logos/logos_orange_money_256x256.png`,
  mtn: `${BASE_PATH}/logos/logos_mtn_money_256x256.png`,
  moov: `${BASE_PATH}/logos/logos_moov_money_256x256.png`,
  wave: `${BASE_PATH}/logos/logos_wave_money_256x256.png`,
  tondje: `${BASE_PATH}/logos/logos_tondje_256x256.png`,
} as const;

// ══════════════════════════════════════════════════════════════════
// AVATARS TANTIE SAGESSE - ILLUSTRATIONS COMPLÈTES
// ══════════════════════════════════════════════════════════════════

export const AVATARS_TANTIE = {
  marchand: `${BASE_PATH}/avatars/avatar_tantie_marchand_full_512x512.png`,
  producteur: `${BASE_PATH}/avatars/avatar_tantie_producteur_full_512x512.png`,
  cooperative: `${BASE_PATH}/avatars/avatar_tantie_cooperative_full_512x512.png`,
  institution: `${BASE_PATH}/avatars/avatar_tantie_institution_full_512x512.png`,
  identificateur: `${BASE_PATH}/avatars/avatar_tantie_identificateur_full_512x512.png`,
  portrait: `${BASE_PATH}/avatars/avatar_tantie_portrait_modal_512x512.png`,
  login: `${BASE_PATH}/avatars/avatar_tantie_login_512x512.png`,
  venteVocale: `${BASE_PATH}/avatars/avatar_tantie_vente_vocale_512x512.png`,
} as const;

// ══════════════════════════════════════════════════════════════════
// ICÔNES TANTIE SAGESSE - BOTTOMBAR
// ══════════════════════════════════════════════════════════════════

export const ICONS_TANTIE = {
  marchand: `${BASE_PATH}/icons/icons_tantie_marchand_48x48.png`,
  producteur: `${BASE_PATH}/icons/icons_tantie_producteur_48x48.png`,
  cooperative: `${BASE_PATH}/icons/icons_tantie_cooperative_48x48.png`,
  institution: `${BASE_PATH}/icons/icons_tantie_institution_48x48.png`,
  identificateur: `${BASE_PATH}/icons/icons_tantie_identificateur_48x48.png`,
} as const;

// ══════════════════════════════════════════════════════════════════
// FONDS D'ÉCRAN
// ══════════════════════════════════════════════════════════════════

export const BACKGROUNDS = {
  onboarding: {
    bienvenue: `${BASE_PATH}/backgrounds/bg_onboarding_bienvenue_1080x1920.png`,
    marketplace: `${BASE_PATH}/backgrounds/bg_onboarding_marketplace_1080x1920.png`,
    tataLou: `${BASE_PATH}/backgrounds/bg_onboarding_tantie_sagesse_1080x1920.png`,
    cnpsCmu: `${BASE_PATH}/backgrounds/bg_onboarding_cnps_cmu_1080x1920.png`,
  },
  offline: `${BASE_PATH}/backgrounds/bg_offline_rural_1080x1920.jpg`,
  cotisations: `${BASE_PATH}/backgrounds/bg_cotisations_community_1080x1920.jpg`,
} as const;

// ══════════════════════════════════════════════════════════════════
// BILLETS CFA
// ══════════════════════════════════════════════════════════════════

export const BILLETS = {
  500: `${BASE_PATH}/money/money_billet_500_300x150.png`,
  1000: `${BASE_PATH}/money/money_billet_1000_300x150.png`,
  2000: `${BASE_PATH}/money/money_billet_2000_300x150.png`,
  5000: `${BASE_PATH}/money/money_billet_5000_300x150.png`,
  10000: `${BASE_PATH}/money/money_billet_10000_300x150.png`,
} as const;

// ══════════════════════════════════════════════════════════════════
// PIÈCES CFA
// ══════════════════════════════════════════════════════════════════

export const PIECES = {
  25: `${BASE_PATH}/money/money_piece_25_128x128.png`,
  50: `${BASE_PATH}/money/money_piece_50_128x128.png`,
  100: `${BASE_PATH}/money/money_piece_100_128x128.png`,
  200: `${BASE_PATH}/money/money_piece_200_128x128.png`,
} as const;

// ══════════════════════════════════════════════════════════════════
// PRODUITS VIVRIERS
// ══════════════════════════════════════════════════════════════════

export const PRODUCTS = {
  // Produits Figma (disponibles)
  riz: `${BASE_PATH}/products/products_riz_400x400.png`,
  tomate: `${BASE_PATH}/products/products_tomate_400x400.png`,
  aubergine: `${BASE_PATH}/products/products_aubergine_400x400.png`,
  piment: `${BASE_PATH}/products/products_piment_400x400.png`,
  gombo: `${BASE_PATH}/products/products_gombo_400x400.png`,
  manioc: `${BASE_PATH}/products/products_manioc_400x400.png`,
  igname: `${BASE_PATH}/products/products_igname_400x400.png`,
  mais: `${BASE_PATH}/products/products_mais_400x400.png`,
  banane: `${BASE_PATH}/products/products_banane_400x400.png`,
  oignon: `${BASE_PATH}/products/products_oignon_400x400.png`,
  avocat: `${BASE_PATH}/products/products_avocat_400x400.png`,
  autre: `${BASE_PATH}/products/products_autre_400x400.png`,
  
  // Produits à télécharger depuis Unsplash
  plantain: `${BASE_PATH}/products/products_plantain_400x400.jpg`,
  huile: `${BASE_PATH}/products/products_huile_palme_400x400.jpg`,
  mangue: `${BASE_PATH}/products/products_mangue_400x400.jpg`,
  ananas: `${BASE_PATH}/products/products_ananas_400x400.jpg`,
  arachide: `${BASE_PATH}/products/products_arachide_400x400.jpg`,
  repas: `${BASE_PATH}/products/products_repas_africain_400x400.jpg`,
} as const;

// ══════════════════════════════════════════════════════════════════
// EXPORTS POUR RÉTROCOMPATIBILITÉ AVEC L'ANCIEN SYSTÈME
// ══════════════════════════════════════════════════════════════════

// Logos institutionnels
export const IMG_LOGO_JULABA = LOGOS.julaba;
export const IMG_LOGO_JULABA_SPLASH = LOGOS.julaba;
export const IMG_LOGO_PARTENAIRES = LOGOS.partenaires;

// Mobile Money
export const IMG_LOGO_ORANGE = MOBILE_MONEY.orange;
export const IMG_LOGO_ORANGE_MONEY = MOBILE_MONEY.orange;
export const IMG_LOGO_MTN = MOBILE_MONEY.mtn;
export const IMG_LOGO_MOOV = MOBILE_MONEY.moov;
export const IMG_LOGO_WAVE = MOBILE_MONEY.wave;
export const IMG_LOGO_TONDJE = MOBILE_MONEY.tondje;

// Tata Lou - Avatars complets
export const IMG_TANTIE_SAGESSE = AVATARS_TANTIE.marchand;
export const IMG_TANTIE_SAGESSE_ADMIN = AVATARS_TANTIE.marchand;
export const IMG_TANTIE_SAGESSE_COOPERATIVE = AVATARS_TANTIE.cooperative;
export const IMG_TANTIE_SAGESSE_IDENTIFICATEUR = AVATARS_TANTIE.identificateur;
export const IMG_TANTIE_SAGESSE_PRODUCTEUR = AVATARS_TANTIE.producteur;
export const IMG_TANTIE_SAGESSE_INSTITUTION = AVATARS_TANTIE.institution;
export const IMG_TANTIE_SAGESSE_VENTE = AVATARS_TANTIE.marchand;

// Tata Lou - Icônes BottomBar
export const IMG_TANTIE_SAGESSE_ICON = ICONS_TANTIE.marchand;
export const IMG_TANTIE_SAGESSE_ICON_COOPERATIVE = ICONS_TANTIE.cooperative;
export const IMG_TANTIE_SAGESSE_ICON_PRODUCTEUR = ICONS_TANTIE.producteur;
export const IMG_TANTIE_SAGESSE_ICON_INSTITUTION = ICONS_TANTIE.institution;
export const IMG_TANTIE_SAGESSE_ICON_IDENTIFICATEUR = ICONS_TANTIE.identificateur;

// Billets CFA
export const IMG_BILLET_500 = BILLETS[500];
export const IMG_BILLET_1000 = BILLETS[1000];
export const IMG_BILLET_2000 = BILLETS[2000];
export const IMG_BILLET_5000 = BILLETS[5000];
export const IMG_BILLET_10000 = BILLETS[10000];

// Pièces CFA
export const IMG_PIECE_25 = PIECES[25];
export const IMG_PIECE_50 = PIECES[50];
export const IMG_PIECE_100 = PIECES[100];
export const IMG_PIECE_200 = PIECES[200];

// Produits vivriers
export const IMG_PRODUIT_RIZ = PRODUCTS.riz;
export const IMG_PRODUIT_TOMATE = PRODUCTS.tomate;
export const IMG_PRODUIT_AUBERGINE = PRODUCTS.aubergine;
export const IMG_PRODUIT_PIMENT = PRODUCTS.piment;
export const IMG_PRODUIT_GOMBO = PRODUCTS.gombo;
export const IMG_PRODUIT_MANIOC = PRODUCTS.manioc;
export const IMG_PRODUIT_IGNAME = PRODUCTS.igname;
export const IMG_PRODUIT_MAIS = PRODUCTS.mais;
export const IMG_PRODUIT_BANANE = PRODUCTS.banane;
export const IMG_PRODUIT_PLANTAIN = PRODUCTS.plantain;
export const IMG_PRODUIT_OIGNON = PRODUCTS.oignon;
export const IMG_PRODUIT_AVOCAT = PRODUCTS.avocat;
export const IMG_PRODUIT_HUILE = PRODUCTS.huile;
export const IMG_PRODUIT_MANGUE = PRODUCTS.mangue;
export const IMG_PRODUIT_ANANAS = PRODUCTS.ananas;
export const IMG_PRODUIT_ARACHIDE = PRODUCTS.arachide;
export const IMG_PRODUIT_AUTRE = PRODUCTS.autre;
export const IMG_PRODUIT_AUTRE = PRODUCTS.repas;

// Fonds d'écran
export const IMG_BG_MARKET = BACKGROUNDS.onboarding.cnpsCmu;
export const IMG_BG_MARKETPLACE = BACKGROUNDS.onboarding.marketplace;
export const IMG_BG_TANTIE = BACKGROUNDS.onboarding.tataLou;
export const IMG_BG_OFFLINE = BACKGROUNDS.offline;
export const IMG_BG_COTISATIONS = BACKGROUNDS.cotisations;
export const IMG_BG_VIRTUAL_MARKET = BACKGROUNDS.onboarding.marketplace;
export const IMG_BG_MARCHE_VENTE = BACKGROUNDS.onboarding.marketplace;

// ══════════════════════════════════════════════════════════════════
// HELPERS - Fonctions utilitaires
// ══════════════════════════════════════════════════════════════════

/**
 * Obtenir l'avatar Tata Lou selon le rôle
 */
export function getTataLouAvatar(role: string): string {
  const roleMap: Record<string, string> = {
    marchand: AVATARS_TANTIE.marchand,
    producteur: AVATARS_TANTIE.producteur,
    cooperative: AVATARS_TANTIE.cooperative,
    institution: AVATARS_TANTIE.institution,
    identificateur: AVATARS_TANTIE.identificateur,
    admin: AVATARS_TANTIE.marchand,
  };
  return roleMap[role.toLowerCase()] || AVATARS_TANTIE.marchand;
}

/**
 * Obtenir l'icône Tata Lou selon le rôle
 */
export function getTataLouIcon(role: string): string {
  const roleMap: Record<string, string> = {
    marchand: ICONS_TANTIE.marchand,
    producteur: ICONS_TANTIE.producteur,
    cooperative: ICONS_TANTIE.cooperative,
    institution: ICONS_TANTIE.institution,
    identificateur: ICONS_TANTIE.identificateur,
    admin: ICONS_TANTIE.marchand,
  };
  return roleMap[role.toLowerCase()] || ICONS_TANTIE.marchand;
}

/**
 * Obtenir l'image d'un produit
 */
export function getProductImage(productName: string): string {
  const normalizedName = productName.toLowerCase().trim();
  
  // Mapping exact
  if (normalizedName in PRODUCTS) {
    return PRODUCTS[normalizedName as keyof typeof PRODUCTS];
  }
  
  // Mapping avec variations
  const variations: Record<string, keyof typeof PRODUCTS> = {
    'riz': 'riz',
    'rice': 'riz',
    'tomates': 'tomate',
    'tomato': 'tomate',
    'aubergines': 'aubergine',
    'eggplant': 'aubergine',
    'piments': 'piment',
    'pepper': 'piment',
    'gombos': 'gombo',
    'okra': 'gombo',
    'maniocs': 'manioc',
    'cassava': 'manioc',
    'ignames': 'igname',
    'yam': 'igname',
    'maïs': 'mais',
    'corn': 'mais',
    'bananes': 'banane',
    'banana': 'banane',
    'plantains': 'plantain',
    'plantain': 'plantain',
    'oignons': 'oignon',
    'onion': 'oignon',
    'avocats': 'avocat',
    'avocado': 'avocat',
    'huile de palme': 'huile',
    'palm oil': 'huile',
    'mangues': 'mangue',
    'mango': 'mangue',
    'ananas': 'ananas',
    'pineapple': 'ananas',
    'arachides': 'arachide',
    'peanut': 'arachide',
    'repas': 'repas',
    'meal': 'repas',
  };
  
  for (const [key, value] of Object.entries(variations)) {
    if (normalizedName.includes(key)) {
      return PRODUCTS[value];
    }
  }
  
  // Fallback
  return PRODUCTS.autre;
}

/**
 * Obtenir le logo d'un opérateur mobile money
 */
export function getMobileMoneyLogo(operator: string): string {
  const normalizedOperator = operator.toLowerCase().trim();
  
  const operatorMap: Record<string, string> = {
    'orange': MOBILE_MONEY.orange,
    'orange money': MOBILE_MONEY.orange,
    'om': MOBILE_MONEY.orange,
    'mtn': MOBILE_MONEY.mtn,
    'mtn money': MOBILE_MONEY.mtn,
    'moov': MOBILE_MONEY.moov,
    'moov money': MOBILE_MONEY.moov,
    'wave': MOBILE_MONEY.wave,
    'tondje': MOBILE_MONEY.tondje,
    'ton djè': MOBILE_MONEY.tondje,
  };
  
  return operatorMap[normalizedOperator] || MOBILE_MONEY.orange;
}

/**
 * Obtenir l'image d'un billet selon sa valeur
 */
export function getBilletImage(value: number): string {
  if (value in BILLETS) {
    return BILLETS[value as keyof typeof BILLETS];
  }
  return BILLETS[5000]; // Fallback
}

/**
 * Obtenir l'image d'une pièce selon sa valeur
 */
export function getPieceImage(value: number): string {
  if (value in PIECES) {
    return PIECES[value as keyof typeof PIECES];
  }
  return PIECES[100]; // Fallback
}
