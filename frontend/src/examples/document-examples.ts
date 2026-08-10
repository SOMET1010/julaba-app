/**
 * EXEMPLE D'UTILISATION - Système de Gestion des Documents JULABA
 * 
 * Ce fichier montre comment configurer et gérer les 4 états de documents
 */

import { DocumentData, DocumentStatus } from '../app/types/document';

// ========== EXEMPLES DE CONFIGURATIONS ==========

/**
 * SCÉNARIO 1: Document vide (À compléter)
 */
export const exempleDocumentEmpty: DocumentData = {
  id: 'doc-empty-001',
  type: 'permis-exploitation',
  title: 'Permis d\'exploitation',
  status: 'empty' as DocumentStatus,
  imageUrl: null,
  uploadedAt: null,
  verifiedAt: null,
  verifiedBy: null,
  rejectionReason: null,
  expirationDate: null,
  isLocked: false,
  details: {
    'Numéro de demande': 'PERM-2024-001',
    'Statut': 'À compléter',
    'Type': 'Permis d\'exploitation commercial',
    'Zone': 'Marché d\'Adjamé',
  },
};

/**
 * SCÉNARIO 2: Document en attente de vérification
 */
export const exempleDocumentPending: DocumentData = {
  id: 'doc-pending-002',
  type: 'registre-commerce',
  title: 'Registre de commerce',
  status: 'pending' as DocumentStatus,
  uploadedAt: '2024-02-28T09:15:00Z',
  verifiedAt: null,
  verifiedBy: null,
  rejectionReason: null,
  expirationDate: '2026-02-28',
  isLocked: false,
  details: {
    'Numéro': 'RC-2024-456789',
    'Date d\'émission': '28 Fév 2024',
    'Date d\'expiration': '28 Fév 2026',
    'Activité': 'Commerce de produits vivriers',
    'Statut': 'En vérification',
  },
};

/**
 * SCÉNARIO 3: Document vérifié et certifié (Protégé)
 */
export const exempleDocumentVerified: DocumentData = {
  id: 'doc-verified-003',
  type: 'carte-identite',
  title: 'Carte d\'identité nationale',
  status: 'verified' as DocumentStatus,
  uploadedAt: '2024-01-15T10:00:00Z',
  verifiedAt: '2024-01-15T14:30:00Z',
  verifiedBy: 'Jean Koffi - Bureau Abidjan',
  rejectionReason: null,
  expirationDate: '2029-01-15',
  isLocked: true, // 🔒 Verrouillé - Aucune modification possible
  details: {
    'Numéro': 'CI-2024-001234',
    'Date d\'émission': '15 Jan 2024',
    'Date d\'expiration': '15 Jan 2029',
    'Lieu d\'émission': 'Abidjan, Côte d\'Ivoire',
    'Type': 'Carte Nationale d\'Identité',
  },
  qrCode: 'JULABA-VERIFIED-CI2024001234', // QR code généré automatiquement
};

/**
 * SCÉNARIO 4: Document refusé (Nécessite une action)
 */
export const exempleDocumentRejected: DocumentData = {
  id: 'doc-rejected-004',
  type: 'attestation-domicile',
  title: 'Attestation de domicile',
  status: 'rejected' as DocumentStatus,
  uploadedAt: '2024-02-25T11:00:00Z',
  verifiedAt: null,
  verifiedBy: null,
  rejectionReason: 'Photo floue - Les informations ne sont pas lisibles. Veuillez reprendre une photo nette avec un bon éclairage.',
  expirationDate: null,
  isLocked: false,
  details: {
    'Numéro': 'ATD-2024-789',
    'Date de soumission': '25 Fév 2024',
    'Motif du rejet': 'Qualité insuffisante',
    'Statut': 'Rejeté',
  },
};

// ========== LISTE COMPLÈTE D'EXEMPLES ==========

export const exemplesDocuments = {
  empty: exempleDocumentEmpty,
  pending: exempleDocumentPending,
  verified: exempleDocumentVerified,
  rejected: exempleDocumentRejected,
};

// ========== EXEMPLE D'UTILISATION DANS UN COMPOSANT ==========

/**
 * Exemple d'initialisation des documents dans MarchandProfil
 */
export const documentsInitiauxMarchand = {
  'carte-identite': exempleDocumentVerified,
  'certification-julaba': exempleDocumentRejected,
  'attestation-activite': exempleDocumentEmpty,
  'registre-commerce': exempleDocumentPending,
};

// ========== FONCTIONS UTILITAIRES ==========

/**
 * Vérifie si un document peut être modifié
 */
export const documentModifiable = (doc: DocumentData): boolean => {
  return !doc.isLocked && doc.status !== 'verified';
};

/**
 * Vérifie si un document peut être supprimé
 */
export const documentSupprimable = (doc: DocumentData): boolean => {
  return !doc.isLocked;
};

/**
 * Compte le nombre de documents complétés (verified ou pending)
 */
export const compterDocumentsCompletes = (documents: { [key: string]: DocumentData }): number => {
  return Object.values(documents).filter(
    doc => doc.status === 'verified' || doc.status === 'pending'
  ).length;
};

/**
 * Vérifie si le profil est complet (tous les documents verified)
 */
export const profilComplet = (documents: { [key: string]: DocumentData }): boolean => {
  return Object.values(documents).every(doc => doc.status === 'verified');
};

/**
 * Retourne la liste des documents nécessitant une action
 */
export const documentsNecessitantAction = (documents: { [key: string]: DocumentData }): DocumentData[] => {
  return Object.values(documents).filter(
    doc => doc.status === 'empty' || doc.status === 'rejected'
  );
};

// ========== EXEMPLES DE RAISONS DE REJET COMMUNES ==========

export const raisonsRejetCourantes = [
  'Photo floue - Veuillez reprendre une photo nette',
  'Document illisible - Améliorez l\'éclairage',
  'Informations manquantes - Document incomplet',
  'Document expiré - Fournir un document à jour',
  'Format incorrect - Utilisez un document officiel',
  'Signature manquante - Document non signé',
  'Qualité insuffisante - Image trop sombre',
  'Document endommagé - Fournir un document en bon état',
  'Reflet gênant - Évitez les reflets sur le document',
  'Cadrage incorrect - Document coupé ou incomplet',
];

// ========== WORKFLOW TYPIQUE ==========

/**
 * Exemple de workflow de mise à jour d'un document
 * 
 * 1. Upload: empty → pending
 * 2. Validation: pending → verified (ou rejected)
 * 3. Re-upload si rejeté: rejected → pending
 * 4. Certification finale: verified + isLocked = true
 */
export const exempleWorkflow = {
  etape1_upload: {
    ...exempleDocumentEmpty,
    status: 'pending' as DocumentStatus,
    uploadedAt: new Date().toISOString(),
  },
  
  etape2_verification_success: {
    ...exempleDocumentEmpty,
    status: 'verified' as DocumentStatus,
    uploadedAt: '2024-03-01T10:00:00Z',
    verifiedAt: new Date().toISOString(),
    verifiedBy: 'Marie Koné - Bureau Cocody',
    isLocked: true,
  },
  
  etape2_verification_echec: {
    ...exempleDocumentEmpty,
    status: 'rejected' as DocumentStatus,
    uploadedAt: '2024-03-01T10:00:00Z',
    rejectionReason: 'Photo floue - Veuillez reprendre',
  },
};

// ========== NOTIFICATIONS SUGGÉRÉES ==========

export const notificationsPushSuggestions = {
  documentVerified: {
    title: '✅ Document vérifié',
    body: 'Votre [TYPE_DOCUMENT] a été vérifié avec succès par JULABA',
    action: 'Voir le document',
  },
  documentRejected: {
    title: '❌ Document refusé',
    body: 'Votre [TYPE_DOCUMENT] a été refusé. Raison : [RAISON]',
    action: 'Corriger maintenant',
  },
  profilComplet: {
    title: '🎉 Profil complété',
    body: 'Tous vos documents sont vérifiés ! Votre compte est maintenant actif',
    action: 'Commencer à vendre',
  },
  expirationProche: {
    title: '⚠️ Document bientôt expiré',
    body: 'Votre [TYPE_DOCUMENT] expire dans [JOURS] jours',
    action: 'Renouveler',
  },
};