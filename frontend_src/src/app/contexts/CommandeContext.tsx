import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import * as commandesApi from '../../imports/commandes-api';
import type { NegociationApi } from '../../imports/commandes-api';
import { useApp } from './AppContext';

import type { PaymentMethodId, MobileOperatorId } from '../types/payment';
import { formatPaymentForAPI, parsePaymentFromAPI } from '../types/payment';

export interface Commande {
  id: string;
  acheteurId: string;
  vendeurId: string;
  acheteurNom?: string;
  vendeurNom?: string;
  acheteurRole?: string;
  vendeurRole?: string;
  /** Id négociation côté API — requis pour repondreNegociation (≠ commandeId) */
  negociationId?: string;
  publicationId?: string;
  /** achat | vente | vente_directe | … (selon API) */
  type?: string;
  produit: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
  statut: 'en_attente' | 'confirmee' | 'en_cours' | 'en_livraison' | 'livree' | 'annulee' | 'litige';
  statutPaiement?: 'non_paye' | 'paye';
  payeAt?: string;
  dateCommande: string;
  dateLivraison?: string;
  notes?: string;
  raison_refus?: string;
  modePaiement?: PaymentMethodId;
  operateurMobile?: MobileOperatorId;
  imageUrl?: string;
  acheteurTelephone?: string;
  localite?: string;
  categorie?: string;
  unite?: string;
}

interface CommandeContextType {
  commandes: Commande[];
  loading: boolean;
  
  addCommande: (data: Omit<Commande, 'id' | 'dateCommande'>) => Promise<void>;
  updateCommande: (id: string, data: Partial<Commande>) => Promise<void>;
  annulerCommande: (id: string) => Promise<void>;
  
  // Operations metier
  creerCommandeDirecte: (data: Omit<Commande, 'id' | 'dateCommande'>) => Promise<void>;
  accepterCommande: (id: string) => Promise<void>;
  refuserCommande: (id: string, raison?: string) => Promise<void>;
  contreProposerPrix: (id: string, nouveauPrix: number, message?: string) => Promise<void>;
  marquerLivree: (id: string, dateLivraisonReelle?: string) => Promise<void>;
  marquerEnLivraison: (id: string) => Promise<void>;
  recupererPaiement: (id: string) => Promise<void>;
  accepterNegociation: (id: string) => Promise<void>;
  refuserNegociation: (id: string) => Promise<void>;
  livrerCommande: (id: string) => Promise<void>;

  getCommandesByStatut: (statut: Commande['statut']) => Commande[];
  getCommandesAchat: () => Commande[];
  getCommandesVente: () => Commande[];
  
  refreshCommandes: () => Promise<void>;
}

const CommandeContext = createContext<CommandeContextType | undefined>(undefined);


export function CommandeProvider({ children }: { children: ReactNode }) {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const { user } = useApp();



  const loadCommandes = async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      if (!commandes?.length) setLoading(true);
      const { commandes: data } = await commandesApi.fetchCommandes();
      type ApiCommande = Record<string, unknown>;
      const commandeList: Commande[] = data.map((c: ApiCommande) => {
        const parsed = (c.modePaiement || c.mode_paiement) ? parsePaymentFromAPI(c.modePaiement || c.mode_paiement) : { method: undefined, operator: undefined };
        return {
          id: c.id,
          acheteurId: c.acheteurId || c.acheteur_id || c.user_id || '',
          vendeurId: c.vendeurId || c.vendeur_id || '',
          acheteurNom: c.acheteurNom || c.acheteur_nom || '',
          vendeurNom: c.vendeurNom || c.vendeur_nom || '',
          acheteurRole: c.acheteurRole || c.acheteur_role || '',
          vendeurRole: c.vendeurRole || c.vendeur_role || '',
          negociationId: c.negociation_id ?? c.negociationId ?? c.negociation?.id,
          publicationId: c.publication_id || c.publicationId,
          type: c.type,
          produit: c.produit,
          quantite: typeof c.quantite === 'string' ? parseFloat(c.quantite) || 0 : c.quantite,
          prixUnitaire: c.prixUnitaire || c.prix_unitaire || c.prix || 0,
          total: c.total,
          statut: c.statut === 'en_route' ? 'en_cours' : c.statut,
          dateCommande: c.dateCommande || c.date_commande || c.created_at,
          dateLivraison: c.dateLivraison || c.date_livraison,
          statutPaiement: (c.statutPaiement || c.statut_paiement || 'non_paye') as 'non_paye' | 'paye',
          payeAt: (c.payeAt || c.paye_at) as string | undefined,
          notes: c.notes ?? undefined,
          modePaiement: parsed.method,
          operateurMobile: parsed.operator,
          imageUrl: c.imageUrl || c.image_url || undefined,
          acheteurTelephone: c.acheteurTelephone || c.acheteur_telephone || undefined,
          localite: c.localite || undefined,
          categorie: c.categorie,
          unite: c.unite ?? undefined,
        };
      });
      setCommandes(commandeList);
    } catch (error: any) {
      console.warn('[CommandeContext] loadCommandes failed:', error?.message);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    const rolesAvecCommandes = ['marchand', 'producteur', 'cooperateur'];
    if (!rolesAvecCommandes.includes(user.role as string)) return;
    loadCommandes();
  }, [user?.id, user?.role]);

  useEffect(() => {
    const rolesAvecCommandes = ['marchand', 'producteur', 'cooperateur'];
    const handler = () => {
      if (!user?.id) return;
      if (!rolesAvecCommandes.includes(user.role as string)) return;
      void loadCommandes();
    };
    window.addEventListener('julaba:token-ready', handler);
    return () => window.removeEventListener('julaba:token-ready', handler);
  }, [user?.id, user?.role]);

  const addCommande = async (data: Omit<Commande, 'id' | 'dateCommande'>) => {
    const src = data as any;
    await commandesApi.createCommande({
      type: data.type,
      produit: data.produit,
      quantite: String(data.quantite),
      prix_unitaire: data.prixUnitaire,
      total: data.total,
      vendeur_id: data.vendeurId,
      acheteur_id: data.acheteurId,
      acheteur_nom: data.acheteurNom || src.acheteur_nom || undefined,
      acheteur_telephone: data.acheteurTelephone || src.acheteur_telephone || undefined,
      localite: data.localite || undefined,
      date_livraison: data.dateLivraison || src.date_livraison || undefined,
      notes: data.notes || undefined,
      publication_id: data.publicationId,
      mode_paiement: formatPaymentForAPI(data.modePaiement, data.operateurMobile),
      operateur_mobile: data.operateurMobile,
    });
    await loadCommandes();
  };

  const updateCommande = async (id: string, data: Partial<Commande>) => {
    const payload: Record<string, unknown> = {};
    if (data.statut !== undefined) payload.statut = data.statut;
    if (data.dateLivraison !== undefined) payload.dateLivraison = data.dateLivraison;
    if (data.raison_refus !== undefined) payload.raison_refus = data.raison_refus;
    await commandesApi.updateCommande(id, payload);
    await loadCommandes();
  };

  const annulerCommande = async (id: string) => {
    await commandesApi.cancelCommande(id);
    setCommandes(prev => prev.filter(c => c.id !== id));
  };

  // ── Operations metier ────────────────────────────────────────
  const creerCommandeDirecte = async (data: Omit<Commande, 'id' | 'dateCommande'>) => {
    await addCommande(data);
  };

  const accepterCommande = async (id: string) => {
    await updateCommande(id, { statut: 'confirmee' });
  };

  const refuserCommande = async (id: string, raison?: string) => {
    await updateCommande(id, { statut: 'annulee', raison_refus: raison });
  };

  const contreProposerPrix = async (id: string, nouveauPrix: number, message?: string) => {
    const cmd = commandes.find(c => c.id === id);
    if (!cmd) throw new Error('Commande introuvable');
    /** repondreNegociation attend un negociationId, pas un commandeId */
    let negociationId = cmd.negociationId;
    if (!negociationId) {
      let negociations: NegociationApi[] = [];
      try {
        ({ negociations } = await commandesApi.fetchNegociations());
      } catch {
        negociations = [];
      }
      const row = (negociations ?? []).find(
        (n: any) =>
          n.commande_id === id ||
          n.commandeId === id ||
          n.id_commande === id ||
          (n.commande && n.commande.id === id),
      );
      negociationId = row?.id;
    }
    if (!negociationId) {
      throw new Error(
        'Négociation introuvable pour cette commande : exposer negociation_id sur la commande ou lier la liste /commandes/negociations.',
      );
    }
    await commandesApi.repondreNegociation(negociationId, {
      statut: 'contre_propose',
      prixContreOffre: nouveauPrix,
      messageReponse: message,
    });
    await loadCommandes();
  };

  const marquerLivree = async (id: string, dateLivraisonReelle?: string) => {
    await updateCommande(id, {
      statut: 'livree',
      dateLivraison: dateLivraisonReelle || new Date().toISOString()
    });
  };

  const marquerEnLivraison = async (id: string) => {
    await updateCommande(id, { statut: 'en_livraison' });
  };

  const livrerCommande = async (id: string) => {
    await commandesApi.livrerCommande(id);
    await loadCommandes();
  };

  const recupererPaiement = async (id: string) => {
    try {
      const commande = commandes.find(c => c.id === id);
      if (!commande) throw new Error('Commande introuvable');
      if (commande.statut !== 'livree') {
        throw new Error('Le paiement ne peut être encaissé qu\'après livraison confirmée');
      }
      await commandesApi.recupererPaiementCommande(id);
      await loadCommandes();
    } catch (error: any) {
      console.warn('[CommandeContext] recupererPaiement failed:', error?.message);
      throw error;
    }
  };

  const accepterNegociation = async (id: string) => {
    const cmd = commandes.find(c => c.id === id);
    let negociationId = cmd?.negociationId;
    if (!negociationId) {
      let negociations: NegociationApi[] = [];
      try {
        ({ negociations } = await commandesApi.fetchNegociations());
      } catch {
        negociations = [];
      }
      const row = (negociations ?? []).find(
        (n: any) =>
          n.commande_id === id ||
          n.commandeId === id ||
          n.id_commande === id ||
          (n.commande && n.commande.id === id),
      );
      negociationId = row?.id;
    }
    if (negociationId) {
      await commandesApi.repondreNegociation(negociationId, { statut: 'accepte' });
      await loadCommandes();
    } else {
      await updateCommande(id, { statut: 'confirmee' });
    }
  };

  const refuserNegociation = async (id: string) => {
    const cmd = commandes.find(c => c.id === id);
    let negociationId = cmd?.negociationId;
    if (!negociationId) {
      let negociations: any[] = [];
      try {
        ({ negociations } = await commandesApi.fetchNegociations());
      } catch {
        negociations = [];
      }
      const row = (negociations ?? []).find(
        (n: any) =>
          n.commande_id === id ||
          n.commandeId === id ||
          n.id_commande === id ||
          (n.commande && n.commande.id === id),
      );
      negociationId = row?.id;
    }
    if (negociationId) {
      await commandesApi.repondreNegociation(negociationId, { statut: 'refuse' });
      await loadCommandes();
    } else {
      await updateCommande(id, { statut: 'annulee' });
    }
  };

  const getCommandesByStatut = (statut: Commande['statut']) => {
    return commandes.filter(c => c.statut === statut);
  };

  const getCommandesAchat = () => {
    return commandes.filter(c => c.type === 'achat');
  };

  const getCommandesVente = () => {
    return commandes.filter(c => c.type === 'vente');
  };

  const refreshCommandes = async () => {
    await loadCommandes();
  };

  const value: CommandeContextType = {
    commandes,
    loading,
    addCommande,
    updateCommande,
    annulerCommande,
    creerCommandeDirecte,
    accepterCommande,
    refuserCommande,
    contreProposerPrix,
    marquerLivree,
    marquerEnLivraison,
    recupererPaiement,
    accepterNegociation,
    refuserNegociation,
    livrerCommande,
    getCommandesByStatut,
    getCommandesAchat,
    getCommandesVente,
    refreshCommandes,
  };

  return <CommandeContext.Provider value={value}>{children}</CommandeContext.Provider>;
}

export function useCommande() {
  const context = useContext(CommandeContext);
  if (!context) {
    throw new Error('useCommande must be used within CommandeProvider');
  }
  return context;
}