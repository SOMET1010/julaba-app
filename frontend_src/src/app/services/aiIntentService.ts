/**
 * ═══════════════════════════════════════════════════════════════════
 * JÙLABA - Service d'Intention IA (Frontend)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Service frontend pour communiquer avec le moteur d'intention IA
 * Utilisé par Tata Nanti Lou pour interpréter les messages utilisateur
 */

import { API_URL } from '../utils/api';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type Intent =
  | 'create_order'
  | 'update_order'
  | 'cancel_order'
  | 'create_harvest'
  | 'update_stock'
  | 'check_stock'
  | 'create_identification'
  | 'validate_identification'
  | 'view_dashboard'
  | 'view_keiwa'
  | 'create_support_ticket'
  | 'update_profile'
  | 'show_sales'
  | 'show_expenses'
  | 'show_balance'
  | 'add_product'
  | 'checkout'
  | 'search_product'
  | 'unknown';

export type Entity =
  | 'commande'
  | 'stock'
  | 'profil'
  | 'support'
  | 'récolte'
  | 'coopérative'
  | 'identification'
  | 'keiwa'
  | 'caisse'
  | 'produit'
  | 'dashboard';

export type Action = 'create' | 'read' | 'update' | 'delete';

export interface IntentRequest {
  message: string;
  role: string;
  screen: string;
  userId?: string;
  context?: Record<string, any>;
}

export interface IntentResponse {
  intent: Intent;
  entity: Entity;
  action: Action;
  confidence: number;
  parameters: Record<string, any>;
  requiresConfirmation: boolean;
  message: string;
}

export interface IntentResult {
  success: boolean;
  result?: IntentResponse;
  metadata?: {
    model: string;
    tokens: number;
    timestamp: string;
  };
  error?: string;
  details?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

class AIIntentService {
  /**
   * Analyser un message utilisateur pour détecter l'intention
   */
  async interpret(request: IntentRequest): Promise<IntentResult> {
    try {

      const response = await fetch(`${API_URL}/voice/intent`, { credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Erreur lors de l\'analyse',
          details: data.details,
        };
      }
      return data;

    } catch (error) {
      return {
        success: false,
        error: 'Erreur de connexion au serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Récupérer la liste des intentions disponibles
   */
  async getAvailableIntents(): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/voice/intent`, {
        credentials: 'include',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return await response.json();

    } catch (error) {
      return {
        success: false,
        error: 'Erreur de récupération des intentions',
      };
    }
  }

  /**
   * Mapper une intention vers une action applicative
   */
  mapIntentToAction(intent: Intent, role: string): string {
    const rolePrefix = `/${role}`;

    const actionMap: Record<Intent, string> = {
      // Commandes
      create_order: `${rolePrefix}/caisse`,
      update_order: `${rolePrefix}/historique`,
      cancel_order: 'action:cancel_order',

      // Récoltes
      create_harvest: `${rolePrefix}/recolte`,

      // Stock
      update_stock: `${rolePrefix}/produits`,
      check_stock: 'action:show_stock',

      // Identification
      create_identification: `${rolePrefix}/identifier`,
      validate_identification: 'action:validate_identification',

      // Vues
      view_dashboard: `${rolePrefix}/dashboard`,
      view_keiwa: `${rolePrefix}/keiwa`,

      // Support
      create_support_ticket: `${rolePrefix}/support`,

      // Profil
      update_profile: `${rolePrefix}/profil`,

      // Dashboard actions
      show_sales: 'action:announce_sales',
      show_expenses: 'action:announce_expenses',
      show_balance: 'action:announce_balance',

      // POS
      add_product: 'action:add_to_cart',
      checkout: 'action:checkout',

      // Marché
      search_product: 'action:search_product',

      // Fallback
      unknown: 'action:unknown',
    };

    return actionMap[intent] || 'action:unknown';
  }

  /**
   * Extraire les paramètres utiles d'une intention
   */
  extractParameters(result: IntentResponse): Record<string, any> {
    const { parameters } = result;

    // Nettoyer et typer les paramètres
    return {
      product: parameters.product || null,
      quantity: parameters.quantity ? parseFloat(parameters.quantity) : null,
      unit: parameters.unit || null,
      price: parameters.price ? parseFloat(parameters.price) : null,
      targetUser: parameters.targetUser || null,
      zone: parameters.zone || null,
      period: parameters.period || null,
      ...parameters, // Conserver tous les autres paramètres
    };
  }

  /**
   * Vérifier si une action nécessite une confirmation
   */
  requiresConfirmation(result: IntentResponse): boolean {
    return result.requiresConfirmation;
  }

  /**
   * Obtenir un message d'erreur convivial
   */
  getErrorMessage(error: string): string {
    const errorMessages: Record<string, string> = {
      'Moteur d\'intelligence artificielle non configuré': 'Le moteur IA n\'est pas encore configuré. Contacte le support.',
      'Message requis pour l\'analyse d\'intention': 'Dis-moi ce que tu veux faire.',
      'Erreur de connexion au serveur': 'Problème de connexion. Vérifie ta connexion internet.',
      'Réponse vide de l\'IA': 'Je n\'ai pas compris. Peux-tu reformuler ?',
    };

    return errorMessages[error] || 'Une erreur est survenue. Réessaye.';
  }

  /**
   * Suggérer des exemples de messages selon le rôle
   */
  getSuggestionsByRole(role: string): string[] {
    const suggestions: Record<string, string[]> = {
      marchand: [
        'Combien j\'ai gagné aujourd\'hui ?',
        'Ajouter un produit au panier',
        'Voir mon stock',
        'Fermer ma caisse',
      ],
      producteur: [
        'Déclarer ma récolte de cacao',
        'Combien vaut ma récolte ?',
        'Voir mes cycles agricoles',
        'Créer un nouveau cycle',
      ],
      cooperative: [
        'Combien de membres actifs ?',
        'Trésorerie de la coopérative',
        'Créer un achat groupé',
        'Liste des cotisations',
      ],
      identificateur: [
        'Identifier un nouveau producteur',
        'Mes identifications du mois',
        'Valider un dossier',
        'Mes commissions',
      ],
      institution: [
        'Statistiques de la plateforme',
        'Valider un compte',
        'Générer un rapport',
        'Utilisateurs actifs',
      ],
    };

    return suggestions[role] || suggestions.marchand;
  }
}

// Export singleton
export const aiIntentService = new AIIntentService();
export default aiIntentService;