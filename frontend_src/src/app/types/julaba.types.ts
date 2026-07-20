/**
 * 🇨🇮 JULABA - Système de types complet
 * Plateforme nationale ivoirienne d'inclusion économique des acteurs vivriers
 * 
 * Ce fichier centralise TOUS les types métier de JULABA
 */

// ============================================================================
// 💰 WALLET & PAIEMENTS
// ============================================================================

/**
 * Compte Wallet JULABA de chaque utilisateur
 * Séparé de la "Caisse physique" des marchands
 */
export interface KeiwaAccount {
  userId: string;
  balance: number; // Solde actuel en FCFA
  currency: 'FCFA';
  escrowBalance: number; // Argent bloqué en attente de livraison
  totalReceived: number; // Cumulé reçu (lifetime)
  totalSent: number; // Cumulé envoyé (lifetime)
  createdAt: string;
  updatedAt: string;
}

/**
 * Type de transaction keiwa
 */
export type KeiwaTransactionType = 
  | 'RECHARGE' // Rechargement depuis Mobile Money
  | 'RETRAIT' // Retrait vers Mobile Money/Agent
  | 'PAIEMENT_ENVOYE' // Achat sur marketplace
  | 'PAIEMENT_RECU' // Vente sur marketplace
  | 'ESCROW_BLOQUE' // Argent bloqué en attente
  | 'ESCROW_LIBERE' // Argent libéré après livraison
  | 'ESCROW_REMBOURSE' // Annulation commande
  | 'COMMISSION_COOP' // Commission versée à la coopérative
  | 'PART_SOCIALE'; // Versement part sociale coopérative

/**
 * Transaction keiwa (historique)
 */
export interface KeiwaTransaction {
  id: string;
  keiwaId: string;
  userId: string;
  type: KeiwaTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  relatedEntityType?: 'commande' | 'recolte' | 'cooperative';
  relatedEntityId?: string;
  mobileMoneyProvider?: 'ORANGE' | 'MTN' | 'MOOV' | 'WAVE';
  mobileMoneyReference?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  completedAt?: string;
}

/**
 * Paiement en escrow (bloqué en attente de livraison)
 */
export interface EscrowPayment {
  id: string;
  commandeId: string;
  payerId: string; // Marchand qui paie
  receiverId: string; // Producteur/Coop qui reçoit
  amount: number;
  status: 'BLOCKED' | 'RELEASED' | 'REFUNDED';
  createdAt: string;
  releasedAt?: string;
  releaseTrigger?: 'MANUAL' | 'AUTO_TIMEOUT' | 'VALIDATION';
}

// ============================================================================
// 📦 COMMANDES (3 SCÉNARIOS)
// ============================================================================

/**
 * États possibles d'une commande (machine à états)
 */
export enum CommandeStatus {
  // Phase initiale
  EN_ATTENTE = 'EN_ATTENTE', // Créée, attend acceptation Producteur
  
  // Phase négociation
  EN_NEGOCIATION = 'EN_NEGOCIATION', // Producteur a contre-proposé
  CONTRE_PROPOSITION_ACCEPTEE = 'CONTRE_PROPOSITION_ACCEPTEE',
  
  // Phase paiement
  ACCEPTEE = 'ACCEPTEE', // Producteur a accepté, attend paiement
  PAYEE = 'PAYEE', // Marchand a payé (escrow bloqué)
  
  // Phase livraison
  EN_LIVRAISON = 'EN_LIVRAISON', // Producteur a cliqué "J'ai livré"
  EN_ATTENTE_CONFIRMATION_MARCHAND = 'EN_ATTENTE_CONFIRMATION_MARCHAND',
  LIVREE = 'LIVREE', // Marchand a confirmé réception
  
  // Phase finale
  TERMINEE = 'TERMINEE', // Argent libéré au Producteur
  
  // États d'annulation
  EXPIREE = 'EXPIREE', // Timeout 24h dépassé
  REFUSEE = 'REFUSEE', // Producteur a refusé
  ANNULEE = 'ANNULEE', // Annulée par l'une des parties
}

/**
 * Historique des négociations (max 2 allers-retours)
 */
export interface NegotiationHistory {
  id: string;
  commandeId: string;
  round: 1 | 2; // Maximum 2 allers-retours
  proposerId: string; // Qui propose
  proposerRole: 'marchand' | 'producteur';
  prixPropose: number; // FCFA/kg
  message?: string;
  createdAt: string;
  respondedAt?: string;
  response?: 'ACCEPTED' | 'REJECTED' | 'COUNTER_PROPOSED';
}

/**
 * Scénario de commande
 */
export type CommandeScenario = 
  | 'MARCHAND_TO_PRODUCTEUR' // Scénario 1 : Commande directe
  | 'MARKETPLACE_PRODUCTEUR' // Scénario 2 : Achat sur marché producteur
  | 'MARKETPLACE_COOPERATIVE'; // Scénario 3 : Achat sur marché coopérative

/**
 * Commande complète (tous scénarios)
 */
export interface Commande {
  id: string;
  numeroCommande: string; // Ex: CMD-2024-0001
  scenario: CommandeScenario;
  
  // Acteurs
  buyerId: string; // Marchand ou Coopérative
  buyerName: string;
  buyerRole: 'marchand' | 'cooperative';
  
  sellerId: string; // Producteur ou Coopérative
  sellerName: string;
  sellerRole: 'producteur' | 'cooperative';
  
  // Produit
  productName: string;
  quantity: number; // kg
  uniteProduit: 'kg' | 'tonne' | 'sac' | 'unite';
  
  // Prix
  prixInitial: number; // FCFA/kg proposé par acheteur
  prixNegocie?: number; // FCFA/kg après négociation
  prixFinal: number; // FCFA/kg accepté
  montantTotal: number; // quantity × prixFinal
  
  // États et workflow
  status: CommandeStatus;
  negotiationHistory: NegotiationHistory[];
  negotiationCount: number; // 0, 1 ou 2
  
  // Paiement
  paymentStatus: 'PENDING' | 'PAID' | 'RELEASED' | 'REFUNDED';
  escrowId?: string;
  paidAt?: string;
  
  // Livraison
  deliveryStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'DELIVERED' | 'CONFIRMED';
  producerMarkedDeliveredAt?: string;
  buyerConfirmedAt?: string;
  cancellationReason?: string; // Si Producteur annule sa livraison
  
  // Métadonnées
  createdAt: string;
  updatedAt: string;
  expiresAt?: string; // Timeout 24h/48h
  completedAt?: string;
  
  // Localisation (si livraison géolocalisée)
  deliveryLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

// ============================================================================
// 🌾 RÉCOLTES (PRODUCTEUR)
// ============================================================================

/**
 * États d'une récolte
 */
export enum RecolteStatus {
  DRAFT = 'DRAFT', // Créée mais pas encore publiée
  EN_LIGNE = 'EN_LIGNE', // Publiée sur marketplace
  PARTIELLEMENT_VENDUE = 'PARTIELLEMENT_VENDUE', // Au moins 1 commande acceptée
  SOLD_OUT = 'SOLD_OUT', // Stock épuisé (stockRestant = 0)
  RETIREE = 'RETIREE', // Retirée du marché par Producteur
}

/**
 * Qualité de la récolte (notation Producteur)
 */
export type RecolteQuality = 'EXCELLENT' | 'BON' | 'MOYEN';

/**
 * Récolte complète
 */
export interface Recolte {
  id: string;
  numeroRecolte: string; // Ex: REC-2024-0001
  producteurId: string;
  producteurName: string;
  
  // Produit
  produit: string;
  categorieProduit: 'LEGUME' | 'FRUIT' | 'CEREALE' | 'TUBERCULE' | 'AUTRE';
  quantiteRecoltee: number; // kg
  stockRestant: number; // kg disponible (décrémente à chaque vente)
  unite: 'kg' | 'tonne' | 'sac';
  
  // Qualité et traçabilité
  qualite: RecolteQuality;
  dateRecolte: string; // Date de la récolte physique
  localisation: {
    region: string;
    commune: string;
    parcelle?: string;
  };
  
  // Prix et vente
  prixUnitaire: number; // FCFA/kg
  prixMinimum?: number; // Prix plancher (acceptera pas moins)
  status: RecolteStatus;
  
  // Publication sur marketplace
  publishedAt?: string;
  visibleSurMarche: boolean;
  
  // Photos et certification
  photos?: string[];
  certificationBio?: boolean;
  
  // Métadonnées
  createdAt: string;
  updatedAt: string;
  
  // Statistiques
  nombreVues: number;
  nombreCommandes: number;
  tauxConversion?: number; // (commandes / vues) × 100
}

// ============================================================================
// 🏢 COOPÉRATIVE
// ============================================================================

/**
 * Rôle dans la coopérative
 */
export type CooperativeRole = 
  | 'PRESIDENT'
  | 'VICE_PRESIDENT'
  | 'TRESORIER'
  | 'SECRETAIRE'
  | 'MEMBRE';

/**
 * Statut d'un membre
 */
export type MembreStatus = 'ACTIF' | 'INACTIF' | 'SUSPENDU' | 'RETIRE';

/**
 * Membre d'une coopérative
 */
export interface CooperativeMembre {
  id: string;
  cooperativeId: string;
  userId: string;
  userName: string;
  userRole: 'producteur' | 'marchand'; // Rôle JULABA du membre
  
  cooperativeRole: CooperativeRole;
  status: MembreStatus;
  
  // Contributions
  partSocialeVersee: number; // FCFA
  contributionTotale: number; // Volume total apporté (kg)
  
  // Dates
  dateAdhesion: string;
  dateRetrait?: string;
  raisonRetrait?: string;
  
  // Statistiques
  nombreContributions: number;
  pourcentageContribution?: number; // % du total coop
}

/**
 * Transaction trésorerie coopérative
 */
export interface TresorerieTransaction {
  id: string;
  cooperativeId: string;
  type: 'PART_SOCIALE' | 'COMMISSION' | 'SUBVENTION' | 'ACHAT' | 'FRAIS' | 'REDISTRIBUTION';
  montant: number;
  membreId?: string; // Si lié à un membre
  description: string;
  createdAt: string;
  createdBy: string; // userId du Président/Trésorier
}

/**
 * Trésorerie commune de la coopérative
 */
export interface CooperativeTresorerie {
  cooperativeId: string;
  soldeCourant: number; // FCFA
  totalPartsSSociales: number; // Somme des parts versées
  totalCommissions: number; // Commissions sur ventes groupées
  totalSubventions: number; // Subventions/dons reçus
  totalCahier: number;
  
  historique: TresorerieTransaction[];
  updatedAt: string;
}

/**
 * Commande groupée (achats groupés Coop)
 */
export interface CommandeGroupee {
  id: string;
  cooperativeId: string;
  producteurId: string;
  
  // Agrégation des demandes membres
  produitsAggreges: {
    produit: string;
    quantiteTotale: number;
    repartitionMembres: {
      membreId: string;
      membreName: string;
      quantiteDemandee: number;
      pourcentage: number; // % du total
    }[];
  }[];
  
  // Négociation
  prixNegocie: number;
  economieRealisee: number; // Économie vs achat individuel
  
  // Répartition de l'économie (KPI uniquement, pas de crédit)
  repartitionEconomie: {
    membreId: string;
    montantEconomie: number; // Calculé, affiché, mais pas crédité
  }[];
  
  status: CommandeStatus;
  createdAt: string;
}

/**
 * Coopérative complète
 */
export interface Cooperative {
  id: string;
  numeroJulaba: string; // COOP-2024-0001
  idExterneRCCM?: string; // Ex: CI-ABJ-2010-B-12345 (manuel)
  
  nom: string;
  sigle?: string;
  
  // Localisation
  region: string;
  commune: string;
  siege: string; // Adresse physique
  
  // Membres
  membres: CooperativeMembre[];
  nombreMembres: number;
  presidentId?: string;
  tresorierId?: string; // Fixed typo
  
  // Trésorerie
  tresorerie: CooperativeTresorerie;
  
  // Activité
  produitsCommercialises: string[];
  volumeTotalAnnuel?: number; // kg
  
  // Documents officiels
  agrement?: string; // Numéro agrément officiel
  dateCreation: string;
  
  // Métadonnées
  createdAt: string;
  updatedAt: string;
  validated: boolean;
  score: number;
}

// ============================================================================
// ⭐ SCORING JULABA
// ============================================================================

/**
 * Critères de scoring (pondération)
 */
export interface ScoringCriteria {
  regularite: number; // 0-100
  documents: number; // 0-100
  volume: number; // 0-100
  feedback: number; // 0-100
}

/**
 * Pondération des critères
 */
export const SCORING_WEIGHTS = {
  REGULARITE: 0.35, // 35%
  DOCUMENTS: 0.15, // 15%
  VOLUME: 0.35, // 35%
  FEEDBACK: 0.15, // 15%
} as const;

/**
 * Niveau de badge JULABA
 */
export type BadgeLevel = 'BRONZE' | 'ARGENT' | 'OR' | 'PLATINE';

/**
 * Score JULABA complet
 */
export interface ScoreJulaba {
  userId: string;
  scoreTotal: number; // 0-100
  niveau: BadgeLevel;
  
  // Détail des critères
  criteres: ScoringCriteria;
  
  // Métriques individuelles
  joursActifsDerniers30j: number;
  documentsValidesRatio: number; // 0-1
  volumeDerniers30j: number; // FCFA
  volumeMoyenZone: number; // FCFA
  feedbackPositifsRatio: number; // 0-1
  
  // Impact
  visibiliteMarketplace: 'NORMALE' | 'AUGMENTEE' | 'PREMIUM';
  accessCredit: boolean;
  
  // Historique
  evolutionScore: {
    date: string;
    score: number;
  }[];
  
  lastCalculatedAt: string;
}

/**
 * Calcul du niveau de badge selon le score
 */
export function getBadgeLevel(score: number): BadgeLevel {
  if (score >= 90) return 'PLATINE';
  if (score >= 75) return 'OR';
  if (score >= 50) return 'ARGENT';
  return 'BRONZE';
}

// ============================================================================
// 🔍 AUDIT TRAIL (Event Sourcing)
// ============================================================================

/**
 * Actions critiques à auditer
 */
export enum AuditAction {
  // User
  USER_CREE = 'USER_CREE',
  USER_MODIFIE = 'USER_MODIFIE',
  USER_SUSPENDU = 'USER_SUSPENDU',
  USER_VALIDE = 'USER_VALIDE',
  
  // Commande
  COMMANDE_CREEE = 'COMMANDE_CREEE',
  COMMANDE_ACCEPTEE = 'COMMANDE_ACCEPTEE',
  COMMANDE_REFUSEE = 'COMMANDE_REFUSEE',
  COMMANDE_NEGOCIEE = 'COMMANDE_NEGOCIEE',
  COMMANDE_PAYEE = 'COMMANDE_PAYEE',
  COMMANDE_LIVREE = 'COMMANDE_LIVREE',
  COMMANDE_ANNULEE = 'COMMANDE_ANNULEE',
  
  // Document
  DOCUMENT_UPLOADE = 'DOCUMENT_UPLOADE',
  DOCUMENT_VALIDE = 'DOCUMENT_VALIDE',
  DOCUMENT_REJETE = 'DOCUMENT_REJETE',
  DOCUMENT_SUPPRIME = 'DOCUMENT_SUPPRIME',
  
  // Transaction keiwa
  WALLET_RECHARGE = 'WALLET_RECHARGE',
  WALLET_DEBITE = 'WALLET_DEBITE',
  PAIEMENT_EFFECTUE = 'PAIEMENT_EFFECTUE',
  PAIEMENT_LIBERE = 'PAIEMENT_LIBERE',
  
  // Récolte
  RECOLTE_CREEE = 'RECOLTE_CREEE',
  RECOLTE_PUBLIEE = 'RECOLTE_PUBLIEE',
  RECOLTE_MODIFIEE = 'RECOLTE_MODIFIEE',
  RECOLTE_SOLD_OUT = 'RECOLTE_SOLD_OUT',
  
  // Coopérative
  COOP_MEMBRE_AJOUTE = 'COOP_MEMBRE_AJOUTE',
  COOP_MEMBRE_RETIRE = 'COOP_MEMBRE_RETIRE',
  COOP_TRESORERIE_MOUVEMENT = 'COOP_TRESORERIE_MOUVEMENT',
}

/**
 * Type d'entité auditée
 */
export type AuditEntityType = 
  | 'user'
  | 'commande'
  | 'recolte'
  | 'document'
  | 'transaction'
  | 'cooperative'
  | 'keiwa';

/**
 * Événement d'audit (Event Sourcing light)
 */
export interface AuditEvent {
  id: string;
  timestamp: string; // ISO 8601
  
  // Acteur
  userId: string;
  userRole: 'marchand' | 'producteur' | 'cooperative' | 'identificateur' | 'institution';
  userName: string;
  
  // Action
  action: AuditAction;
  
  // Entité concernée
  entityType: AuditEntityType;
  entityId: string;
  
  // Données contextuelles
  metadata: Record<string, any>;
  
  // Technique
  ipAddress?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
  };
  deviceInfo?: string;
}

// ============================================================================
// 📊 KPIs INSTITUTION
// ============================================================================

/**
 * KPIs globaux plateforme
 */
export interface InstitutionKPIs {
  // Utilisateurs
  totalUtilisateurs: number;
  utilisateursActifs30j: number; // Au moins 1 transaction
  repartitionParRole: {
    marchands: number;
    producteurs: number;
    cooperatives: number;
    identificateurs: number;
  };
  
  // Volume économique
  volumeTotalTransactions: number; // FCFA (lifetime)
  volumeDernierMois: number; // FCFA
  caPlateformeAnnuel: number; // FCFA
  
  // Adoption par zone
  tauxAdoptionParZone: {
    zone: string;
    utilisateursActifs: number;
    populationTotale: number;
    tauxAdoption: number; // %
  }[];
  
  // Paiements digitaux
  pourcentagePaiementsDigitaux: number; // %
  
  // Cotisations sociales
  pourcentageAdhesionCNPS: number; // % (déclaratif)
  pourcentageAdhesionCNAM: number; // % (déclaratif)
  
  // Performance
  evolutionCAMensuel: {
    mois: string; // YYYY-MM
    montant: number;
  }[];
  
  // ROI Digitalisation (proxy)
  economiesTempsEstimees: number; // Heures économisées
  reductionPertesEstimee: number; // % réduction pertes produits
  
  lastCalculatedAt: string;
}

// ============================================================================
// 🎫 IDENTIFICATION (Workflow Identificateur)
// ============================================================================

/**
 * Statut d'une fiche d'identification
 * Synchronisé avec mockBO.ts (StatutBO)
 * 
 * 'draft'  = Brouillon (enregistrement local, pas encore soumis)
 * 'soumis' = Soumission (en attente validation Back Office)
 * 'valide' = Validé par le Back Office
 * 'rejete' = Rejeté par le Back Office
 */
export type IdentificationStatus = 
  | 'draft'    // Brouillon
  | 'soumis'   // En attente validation BO
  | 'valide'   // Validé par BO
  | 'rejete';  // Rejeté par BO

/** Labels lisibles pour l'interface */
export const IDENTIFICATION_STATUS_LABELS: Record<IdentificationStatus, string> = {
  draft: 'Brouillon',
  soumis: 'En attente validation BO',
  valide: 'Validé par BO',
  rejete: 'Rejeté par BO',
};

/**
 * Fiche d'identification créée par Identificateur
 */
export interface FicheIdentification {
  id: string;
  numeroJulaba: string; // Auto-généré selon rôle (MARCH-2024-XXXX)
  
  // Identificateur
  identificateurId: string;
  identificateurName: string;
  
  // Acteur identifié
  targetRole: 'marchand' | 'producteur';
  
  // Informations personnelles
  nom: string;
  prenom: string;
  telephone: string;
  commune: string;
  quartier: string;
  marche?: string; // Pour marchands
  
  // Activité
  typeActivite: string;
  produitsVendus?: string[];
  anciennete: string;
  emplacement?: string;
  
  // Documents (photos prises par Identificateur)
  photoCarteIdentite: string;
  photoActeur: string;
  photoEmplacement?: string;
  signature: string; // Signature numérique canvas
  
  // Géolocalisation obligatoire
  geolocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
    capturedAt: string;
  };
  
  // Certification
  certified: boolean; // Checkbox "Je certifie l'exactitude"
  
  // Workflow
  status: IdentificationStatus;
  createdAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string; // userId Admin
  approvedAt?: string;
  rejectionReason?: string;
  
  // Compte créé (après validation Admin)
  userAccountCreated: boolean;
  userAccountId?: string;

  // ===== SYNCHRONISATION PROFIL ACTEUR =====
  // Ces champs sont synchronisés dans le profil MOI du Marchand/Producteur
  // après validation par le Back Office

  /** La photo prise par l'Identificateur devient la photo de profil principale */
  photoEstPhotoDeProfilPrincipale: boolean;

  /** L'acteur peut modifier sa photo ultérieurement dans sa fiche */
  acteurPeutModifierPhoto: boolean;

  /** Notifications envoyées */
  notifIdentificateurEnvoyee: boolean;
  notifSMSActeurEnvoyee: boolean;
  dateNotifEnvoyee?: string;
}

// ============================================================================
// 🏪 MARKETPLACE
// ============================================================================

/**
 * Filtre marketplace
 */
export interface MarketplaceFilter {
  categorie?: string;
  region?: string;
  prixMin?: number;
  prixMax?: number;
  qualite?: RecolteQuality[];
  sellerRole?: 'producteur' | 'cooperative';
  triPar?: 'PRIX_ASC' | 'PRIX_DESC' | 'SCORE' | 'RECENT';
}

/**
 * Item sur marketplace (vue unifiée)
 */
export interface MarketplaceItem {
  id: string;
  type: 'RECOLTE' | 'OFFRE_COOPERATIVE';
  
  // Vendeur
  sellerId: string;
  sellerName: string;
  sellerRole: 'producteur' | 'cooperative';
  sellerScore: number;
  sellerBadge: BadgeLevel;
  
  // Produit
  produit: string;
  quantiteDisponible: number;
  unite: string;
  prixUnitaire: number;
  
  // Qualité et localisation
  qualite?: RecolteQuality;
  region: string;
  commune: string;
  
  // Métadonnées
  photo?: string;
  certificationBio?: boolean;
  nombreVues: number;
  createdAt: string;
  
  // Provenance (pour traçabilité)
  sourceRecolteId?: string;
  sourceCommandeGroupeeId?: string;
}

// ============================================================================
// 🔔 NOTIFICATIONS
// ============================================================================

/**
 * Type de notification étendu
 */
export type NotificationType = 
  | 'COMMANDE_NOUVELLE'
  | 'COMMANDE_ACCEPTEE'
  | 'COMMANDE_REFUSEE'
  | 'COMMANDE_NEGOCIATION'
  | 'COMMANDE_PAYEE'
  | 'COMMANDE_LIVREE'
  | 'COMMANDE_EXPIREE'
  | 'WALLET_RECHARGE'
  | 'WALLET_PAIEMENT_RECU'
  | 'ESCROW_LIBERE'
  | 'DOCUMENT_VALIDE'
  | 'DOCUMENT_REJETE'
  | 'SCORE_MISE_A_JOUR'
  | 'COOP_NOUVEAU_MEMBRE'
  // ===== Notifications Identification / Back Office =====
  | 'IDENTIFICATION_VALIDEE'   // BO valide → notif pour Identificateur
  | 'IDENTIFICATION_REJETEE'   // BO rejette → notif pour Identificateur
  | 'IDENTIFICATION_SOUMISE'   // Identificateur soumet → en attente BO
  | 'COMPTE_CREE'              // Compte Marchand/Producteur créé → SMS acteur
  | 'SYSTEM';

/**
 * Notification enrichie
 */
export interface NotificationJulaba {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  
  // Données liées
  relatedEntityType?: AuditEntityType;
  relatedEntityId?: string;
  
  // État
  read: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  
  // Actions
  actionUrl?: string;
  actionLabel?: string;
  
  // Métadonnées
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

// ============================================================================
// 🛠️ HELPERS & UTILITIES
// ============================================================================

/**
 * Génère un numéro JULABA selon le rôle
 */
export function generateNumeroJulaba(role: 'marchand' | 'producteur' | 'cooperative', increment: number): string {
  const year = new Date().getFullYear();
  const prefix = role === 'marchand' ? 'MARCH' : role === 'producteur' ? 'PROD' : 'COOP';
  const numero = String(increment).padStart(4, '0');
  return `${prefix}-${year}-${numero}`;
}

/**
 * Calcule le timeout en fonction du jour de la semaine
 * 24h ouvrées = exclut samedi/dimanche
 */
export function calculateTimeout24hOuvrees(startDate: Date): Date {
  const result = new Date(startDate);
  let hoursToAdd = 24;
  
  while (hoursToAdd > 0) {
    result.setHours(result.getHours() + 1);
    const dayOfWeek = result.getDay();
    
    // Si c'est un jour ouvré (lun-ven), décompter
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      hoursToAdd--;
    }
  }
  
  return result;
}

/**
 * Vérifie si une commande est expirée
 */
export function isCommandeExpired(commande: Commande): boolean {
  if (!commande.expiresAt) return false;
  return new Date() > new Date(commande.expiresAt);
}

/**
 * Calcule le montant total d'une commande
 */
export function calculateMontantTotal(quantity: number, prixUnitaire: number): number {
  return quantity * prixUnitaire;
}