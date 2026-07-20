/**
 * Adaptateur API Producteur - JÙLABA
 * API réelle uniquement — pas de fallback mock
 */

import * as cyclesApi from '../../../imports/cycles-api';
import * as recoltesApi from '../../../imports/recoltes-api';
import * as publicationsApi from '../../../imports/publications-api';


// ============================================================================
// CYCLES DE PRODUCTION
// ============================================================================

export interface CreateCycleData {
  culture: string;
  surface: number;
  parcelle?: string;
  date_plantation: string;
  date_recolte_estimee: string;
  quantite_estimee: number;
  notes?: string;
  photo_url?: string;
}

export interface UpdateCycleData {
  culture?: string;
  surface?: number;
  parcelle?: string;
  date_plantation?: string;
  date_recolte_estimee?: string;
  date_recolte_reelle?: string;
  quantite_estimee?: number;
  quantite_reelle?: number;
  status?: 'preparation' | 'active' | 'completed' | 'archived';
  notes?: string;
  photo_url?: string;
}

export interface CompleteCycleData {
  date_recolte_reelle: string;
  quantite_reelle: number;
  type_cloture?: 'totale' | 'partielle';
}

export const cyclesApiAdapter = {
  async fetchCycles(): Promise<any> {

    try {
      return await cyclesApi.fetchCycles();
    } catch (e: any) {
      // API réelle uniquement — pas de fallback mock
      throw e;
    }
  },

  async createCycle(data: CreateCycleData): Promise<any> {

    try {
      return await cyclesApi.createCycle(data);
    } catch (e: any) {
      // API réelle uniquement — pas de fallback mock
      throw e;
    }
  },

  async updateCycle(id: string, data: UpdateCycleData) {

    return cyclesApi.updateCycle(id, data);
  },

  async deleteCycle(id: string) {

    return cyclesApi.deleteCycle(id);
  },

  async completeCycle(id: string, data: CompleteCycleData) {

    return cyclesApi.completeCycle(id, data);
  },
};

// ============================================================================
// RÉCOLTES
// ============================================================================

export interface CreateRecolteData {
  cycle_id?: string;
  produit: string;
  quantite: number;
  unite: string;
  qualite: 'standard' | 'premium' | 'bio';
  date_recolte: string;
  prix_unitaire: number;
  parcelle?: string;
  notes?: string;
}

export interface UpdateRecolteData {
  produit?: string;
  quantite?: number;
  unite?: string;
  qualite?: 'standard' | 'premium' | 'bio';
  date_recolte?: string;
  statut?: 'declaree' | 'validee' | 'vendue';
  prix_unitaire?: number;
  parcelle?: string;
  notes?: string;
}

export const recoltesApiAdapter = {
  async fetchRecoltes() {

    try {
      return await recoltesApi.fetchRecoltes();
    } catch(e: any) {
      // API réelle uniquement — pas de fallback mock
      throw e;
    }
  },

  async createRecolte(data: CreateRecolteData) {

    return recoltesApi.createRecolte(data);
  },

  async updateRecolte(id: string, data: UpdateRecolteData) {

    return recoltesApi.updateRecolte(id, data);
  },

  async deleteRecolte(id: string) {

    return recoltesApi.deleteRecolte(id);
  },
};

// ============================================================================
// PUBLICATIONS MARKETPLACE
// ============================================================================

export interface CreatePublicationData {
  cycle_id?: string;
  recolte_id?: string;
  produit: string;
  culture: string;
  quantite_disponible: number;
  quantite_initiale: number;
  unite: string;
  prix_unitaire: number;
  qualite: 'standard' | 'premium' | 'bio';
  localisation?: string;
  date_expiration?: string;
  date_recolte?: string;
  description?: string;
  photo_url?: string;
  conditions_vente?: string;
}

export interface UpdatePublicationData {
  produit?: string;
  quantite_disponible?: number;
  prix_unitaire?: number;
  qualite?: 'standard' | 'premium' | 'bio';
  description?: string;
  active?: boolean;
  statut?: 'disponible' | 'epuise' | 'suspendu' | 'archive';
}

export const publicationsApiAdapter = {
  async fetchPublications() {

    try {
      return await publicationsApi.fetchPublications();
    } catch(e: any) {
      // API réelle uniquement — pas de fallback mock
      throw e;
    }
  },

  async createPublication(data: CreatePublicationData) {

    return publicationsApi.createPublication(data);
  },

  async updatePublication(id: string, data: UpdatePublicationData) {

    return publicationsApi.updatePublication(id, data);
  },

  async deletePublication(id: string) {

    return publicationsApi.deletePublication(id);
  },

  async togglePublication(id: string) {

    return publicationsApi.togglePublication(id);
  },
};

