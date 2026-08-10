import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import * as ticketsApi from '../../imports/tickets-api';
import { DEV_MODE, devLog } from '../config/devMode';
import { NOT_AUTHENTICATED } from '../../imports/api-client';
import { useApp } from './AppContext';
import { useBackOfficeOptional } from './BackOfficeContext';
import { isBORole } from '../types/constants';

export type TicketStatut = 'nouveau' | 'ouvert' | 'en_cours' | 'resolu' | 'ferme';

export interface TicketMessage {
  id: string;
  texte: string;
  auteur: string;
  auteurNom?: string;
  date: string;
  lu?: boolean;
}

export interface Ticket {
  id: string;
  userId: string;
  titre: string;
  /** Alias UI (BO / support) */
  sujet?: string;
  description: string;
  categorie: 'technique' | 'paiement' | 'livraison' | 'compte' | 'autre';
  priorite: 'basse' | 'moyenne' | 'haute' | 'critique';
  statut: TicketStatut;
  messages?: TicketMessage[];
  dateCreation: string;
  luParBO?: boolean;
  numero?: string;
  role?: string;
}

function mapStatutFromApi(raw: unknown): Ticket['statut'] {
  if (raw === 'nouveau') return 'ouvert';
  if (raw === 'ouvert' || raw === 'en_cours' || raw === 'resolu' || raw === 'ferme') return raw;
  return 'ouvert';
}

function mapReponsesToMessages(reponses: unknown): TicketMessage[] {
  if (!Array.isArray(reponses)) return [];
  return reponses.map((m: any, i: number) => {
    const auteurRaw = m?.auteur;
    const isUser = auteurRaw === 'user';
    return {
      id: String(m?.id ?? `msg-${i}-${m?.date ?? i}`),
      auteur: isUser ? 'user' : 'bo',
      auteurNom: m?.auteurNom ?? (isUser ? 'Moi' : 'Support JÙLABA'),
      date: m?.date ?? m?.created_at ?? new Date().toISOString(),
      texte: String(m?.texte ?? m?.message ?? ''),
      lu: m?.lu === true,
    };
  });
}

function mapApiRowToTicket(t: any): Ticket {
  const titre = t?.titre ?? '';
  return {
    id: t.id,
    userId: t.user_id,
    titre,
    sujet: titre,
    description: t.description,
    categorie: t.categorie,
    priorite: t.priorite,
    statut: mapStatutFromApi(t.statut),
    messages: mapReponsesToMessages(t.reponses),
    dateCreation: t.created_at,
    luParBO: t.lu_par_bo,
    numero: t.numero,
    role: t.role ?? 'Utilisateur',
  };
}

export type CreateTicketInput = Pick<Ticket, 'titre' | 'description' | 'categorie' | 'priorite'>;

interface TicketsContextType {
  tickets: Ticket[];
  loading: boolean;
  nouveauxCount: number;

  createTicket: (data: CreateTicketInput) => Promise<Ticket>;
  updateTicket: (id: string, data: Partial<Ticket>) => Promise<void>;
  creerTicketDemo: () => void;
  marquerLuParBO: (id: string) => void;
  envoyerReponseBO: (id: string, message: string, agentNom: string) => Promise<void>;
  changerStatut: (id: string, statut: Ticket['statut']) => Promise<void>;

  getTicketsByStatut: (statut: Ticket['statut']) => Ticket[];
  getTicketsByPriorite: (priorite: Ticket['priorite']) => Ticket[];

  refreshTickets: () => Promise<void>;
}

const TicketsContext = createContext<TicketsContextType | undefined>(undefined);

export function TicketsProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [nouveauxCount, setNouveauxCount] = useState(0);
  const demoCounterRef = useRef(0);

  // Detection du role courant : BO (liste globale) vs acteur (mes-tickets).
  // BackOfficeContext ne peuple son user que pour les roles BO ; AppContext
  // porte le role de l'acteur connecte. isBO route loadTickets.
  const { user: appUser } = useApp();
  const bo = useBackOfficeOptional();
  const isBO = !!bo?.user || isBORole((appUser?.role as string) ?? null);

  // Refs lues par les handlers d'evenements (closures stables) pour disposer
  // toujours de la derniere valeur de isBO et de la liste courante.
  const isBORef = useRef(isBO);
  useEffect(() => { isBORef.current = isBO; }, [isBO]);
  const ticketsRef = useRef<Ticket[]>(tickets);
  useEffect(() => { ticketsRef.current = tickets; }, [tickets]);

  const loadTickets = useCallback(async () => {
    if (DEV_MODE) {
      devLog('TicketsContext', 'Mode dev - skip API call');
      return;
    }
    try {
      if (!ticketsRef.current.length) setLoading(true);
      // BO -> liste globale ; acteur -> uniquement ses tickets.
      const { tickets: data } = isBORef.current
        ? await ticketsApi.fetchTickets()
        : await ticketsApi.fetchMesTickets();

      const ticketList: Ticket[] = data.map((t: any) => mapApiRowToTicket(t));

      setTickets(ticketList);
      setNouveauxCount(ticketList.filter(t => t.statut === 'ouvert' && !t.luParBO).length);
    } catch (error: any) {
      if (error?.message === NOT_AUTHENTICATED) return;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Chargement initial + rechargement quand le role detecte change
    // (resolution differee de l'utilisateur BO apres julaba:bo-login).
    void loadTickets();
  }, [isBO, loadTickets]);

  useEffect(() => {
    // Écoute login app ET login BO
    const handler = () => { void loadTickets(); };
    window.addEventListener('julaba:token-ready', handler);
    window.addEventListener('julaba:bo-login', handler);
    return () => {
      window.removeEventListener('julaba:token-ready', handler);
      window.removeEventListener('julaba:bo-login', handler);
    };
  }, [loadTickets]);

  const createTicket = async (data: CreateTicketInput): Promise<Ticket> => {
    const apiRow = await ticketsApi.createTicket({
      titre: data.titre,
      description: data.description,
      categorie: data.categorie,
      priorite: data.priorite,
    });
    await loadTickets();
    return mapApiRowToTicket(apiRow);
  };

  const updateTicket = async (id: string, data: Partial<Ticket>) => {
    try {
      const payload: ticketsApi.UpdateTicketData = {};
      if (data.statut !== undefined) {
        payload.statut = data.statut === 'nouveau' ? 'ouvert' : data.statut;
      }
      if (data.messages !== undefined) {
        payload.reponses = data.messages;
      }
      if (Object.keys(payload).length === 0) return;
      await ticketsApi.updateTicket(id, payload);
      await loadTickets();
    } catch (error) {
      throw error;
    }
  };

  const envoyerReponseBO = useCallback(async (id: string, message: string, _agentNom: string) => {
    if (DEV_MODE) return;
    await ticketsApi.postTicketReponse(id, message);
    await loadTickets();
  }, []);

  const changerStatut = useCallback(async (id: string, statut: Ticket['statut']) => {
    if (DEV_MODE) return;
    const apiStatut = statut === 'nouveau' ? 'ouvert' : statut;
    await ticketsApi.postTicketStatut(id, apiStatut);
    await loadTickets();
  }, []);

  const DEMO_CATEGORIES: Ticket['categorie'][] = ['technique', 'paiement', 'livraison', 'compte', 'autre'];
  const DEMO_PRIORITES: Ticket['priorite'][] = ['basse', 'moyenne', 'haute', 'critique'];
  const DEMO_TITRES = [
    'Paiement non recu', 'Erreur affichage stock', 'Livraison en retard',
    'Connexion impossible', 'Besoin aide commande', 'Probleme de virement',
    'Bug sur la caisse', 'Recolte non visible', 'Acces refuse a mon compte',
  ];

  const creerTicketDemo = useCallback(() => {
    demoCounterRef.current++;
    const cnt = demoCounterRef.current;
    const now = new Date().toISOString();
    const titre = DEMO_TITRES[Math.floor(Math.random() * DEMO_TITRES.length)];
    const newTicket: Ticket = {
      id: `demo-${Date.now()}-${cnt}`,
      userId: 'demo-user',
      titre,
      sujet: titre,
      description: 'Ticket de demonstration genere automatiquement.',
      categorie: DEMO_CATEGORIES[Math.floor(Math.random() * DEMO_CATEGORIES.length)],
      priorite: DEMO_PRIORITES[Math.floor(Math.random() * DEMO_PRIORITES.length)],
      statut: 'ouvert',
      messages: [],
      dateCreation: now,
      luParBO: false,
      numero: `TK-${String(1000 + cnt).slice(-4)}`,
      role: 'Marchand',
    };
    setTickets(prev => {
      const updated = [newTicket, ...prev];
      setNouveauxCount(updated.filter(t => t.statut === 'ouvert' && !t.luParBO).length);
      return updated;
    });
  }, []);

  const marquerLuParBO = useCallback((id: string) => {
    setTickets(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, luParBO: true } : t);
      setNouveauxCount(updated.filter(t => t.statut === 'ouvert' && !t.luParBO).length);
      return updated;
    });
    ticketsApi.updateTicket(id, { lu_par_bo: true }).catch(() => {});
  }, []);

  const getTicketsByStatut = (statut: Ticket['statut']) => {
    return tickets.filter(t => t.statut === statut);
  };

  const getTicketsByPriorite = (priorite: Ticket['priorite']) => {
    return tickets.filter(t => t.priorite === priorite);
  };

  const refreshTickets = async () => {
    await loadTickets();
  };

  const value: TicketsContextType = {
    tickets,
    loading,
    nouveauxCount,
    createTicket,
    updateTicket,
    creerTicketDemo,
    marquerLuParBO,
    envoyerReponseBO,
    changerStatut,
    getTicketsByStatut,
    getTicketsByPriorite,
    refreshTickets,
  };

  return <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>;
}

export function useTickets() {
  const context = useContext(TicketsContext);
  if (!context) {
    throw new Error('useTickets must be used within TicketsProvider');
  }
  return context;
}
