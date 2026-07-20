// ═══════════════════════════════════════════════════════════════════
//  JÙLABA — Store de données partagé entre Producteur / Coopérative / Marchand
//  Source unique de vérité (mock) — sera remplacé par Supabase
// ═══════════════════════════════════════════════════════════════════

export type QualiteType = 'A' | 'B' | 'C';

export type StatutCommande =
  | 'en_attente'
  | 'acceptee'
  | 'en_negociation'
  | 'refusee'
  | 'livree'
  | 'annulee';

// ─── Types partagés ───────────────────────────────────────────────

export interface ProduitMarche {
  id: string;
  produit: string;
  categorie: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
  qualite: QualiteType;
  /** 'producteur' = exposé directement par un producteur
   *  'cooperative' = publié par la coop (après achat + marge) */
  vendeurType: 'producteur' | 'cooperative';
  vendeurNom: string;
  vendeurId: string;
  village: string;
  region: string;
  telephone: string;
  scoreVendeur: number;
  datePublication: string;
  image?: string;
  // Pour les produits re-publiés par la coop
  prixOrigine?: number;
  vendeurOrigineNom?: string;
}

export interface CommandeMarche {
  id: string;
  /** Qui achète */
  acheteurType: 'cooperative' | 'marchand';
  acheteurNom: string;
  /** Qui vend */
  vendeurType: 'producteur' | 'cooperative';
  vendeurId: string;
  vendeurNom: string;
  produit: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
  montantTotal: number;
  statut: StatutCommande;
  dateCreation: string;
  dateLivraison: string;
  /** Message de négociation éventuel */
  messageNegociation?: string;
  prixNegocie?: number;
  /** Mode de paiement */
  modePaiement?: string;
  operateurMobile?: string;
}

export interface NotifMarche {
  id: string;
  /** À qui est destinée la notif */
  destinataireType: 'producteur' | 'cooperative' | 'marchand';
  commandeId: string;
  produit: string;
  acheteurNom: string;
  quantite: number;
  unite: string;
  montantTotal: number;
  statut: StatutCommande;
  dateCreation: string;
  lu: boolean;
}

// ─── Produits exposés par les Producteurs ─────────────────────────
// Visibles par : Coopérative (VUE 01 Achats) + Marchand (Tab 2)

export const PRODUITS_PRODUCTEURS: any[] = [];

// ─── Produits publiés par la Coopérative ──────────────────────────
// Visibles par : Marchand (Tab 1)

export const PRODUITS_COOPERATIVE: ProduitMarche[] = [];

// ─── Commandes croisées ─────────────────────────────────────────

export const COMMANDES_MARCHE: any[] = [];

// ─── Notifications croisées ───────────────────────────────────────

export const NOTIFS_MARCHE: NotifMarche[] = [
  // Pour le Producteur (Kouassi Jean-Baptiste) — commande de la Coop
  {
    id: 'nm1',
    destinataireType: 'producteur',
    commandeId: 'cm1',
    produit: 'Riz local',
    acheteurNom: 'Coop Agricole du Bélier',
    quantite: 500,
    unite: 'kg',
    montantTotal: 310000,
    statut: 'acceptee',
    dateCreation: '2026-03-01',
    lu: false,
  },
  {
    id: 'nm2',
    destinataireType: 'producteur',
    commandeId: 'cm2',
    produit: 'Ignames fraîches',
    acheteurNom: 'Coop Agricole du Bélier',
    quantite: 350,
    unite: 'kg',
    montantTotal: 133000,
    statut: 'en_negociation',
    dateCreation: '2026-03-02',
    lu: false,
  },
  // Pour la Coopérative — commandes du Marchand
  {
    id: 'nm3',
    destinataireType: 'cooperative',
    commandeId: 'cm4',
    produit: 'Riz local (Coop)',
    acheteurNom: 'Marché Central Abidjan',
    quantite: 300,
    unite: 'kg',
    montantTotal: 216000,
    statut: 'acceptee',
    dateCreation: '2026-03-03',
    lu: false,
  },
  // Pour le Producteur (Diabaté Ibrahim) — commande directe du Marchand
  {
    id: 'nm4',
    destinataireType: 'producteur',
    commandeId: 'cm6',
    produit: 'Banane plantain',
    acheteurNom: 'Marché Central Abidjan',
    quantite: 50,
    unite: 'régimes',
    montantTotal: 75000,
    statut: 'en_negociation',
    dateCreation: '2026-03-02',
    lu: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────

export const Q_LABELS: Record<QualiteType, { label: string; color: string; bg: string }> = {
  A: { label: 'Qualité A', color: '#16A34A', bg: '#F0FDF4' },
  B: { label: 'Qualité B', color: '#D97706', bg: '#FFFBEB' },
  C: { label: 'Qualité C', color: '#9CA3AF', bg: '#F9FAFB' },
};

export const STATUT_CMD_LABELS: Record<StatutCommande, { label: string; color: string; bg: string; border: string }> = {
  en_attente:     { label: 'En attente',    color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
  acceptee:       { label: 'Acceptée',      color: '#2072AF', bg: '#EBF4FB', border: '#BFDBFE' },
  en_negociation: { label: 'Négociation',   color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
  refusee:        { label: 'Refusée',       color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  livree:         { label: 'Livrée',        color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  annulee:        { label: 'Annulée',       color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
};

// Thèmes couleur par profil
export const THEME_PROFIL = {
  producteur:  { primary: '#2E8B57', light: '#F0FDF4', dark: '#1F6B3F' },
  cooperative: { primary: '#2072AF', light: '#EBF4FB', dark: '#1E5A8E' },
  marchand:    { primary: '#C66A2C', light: '#FFF7ED', dark: '#A0541E' },
};