/**
 * Client API Tickets Support - JÙLABA
 */

import { apiRequest as _apiRequest } from './api-client';

import { API_URL } from '../app/utils/api';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Ticket {
  id: string;
  user_id: string;
  titre: string;
  description: string;
  categorie: 'technique' | 'paiement' | 'livraison' | 'compte' | 'autre';
  priorite: 'basse' | 'moyenne' | 'haute' | 'critique';
  statut: 'ouvert' | 'en_cours' | 'resolu' | 'ferme';
  assigne_a?: string;
  reponses?: any;
  numero?: string;
  lu_par_bo?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketData {
  titre: string;
  description: string;
  categorie?: Ticket['categorie'];
  priorite?: Ticket['priorite'];
}

export interface UpdateTicketData {
  statut?: Ticket['statut'];
  reponses?: any;
  lu_par_bo?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupérer tous les tickets de la plateforme (BO uniquement, liste globale).
 */
export async function fetchTickets(): Promise<{ tickets: Ticket[] }> {
  return apiRequest<any>("/tickets").then(r => ({ tickets: r.data ?? [] }));
}

/**
 * Récupérer uniquement les tickets de l'acteur connecté (source acteur).
 * Même shape que fetchTickets (backend paginate → { data, meta }).
 */
export async function fetchMesTickets(): Promise<{ tickets: Ticket[] }> {
  return apiRequest<any>("/tickets/mes-tickets").then(r => ({ tickets: r.data ?? [] }));
}

/**
 * Créer un nouveau ticket (Nest renvoie l'entité à la racine, pas { ticket }).
 */
export async function createTicket(data: CreateTicketData): Promise<Ticket> {
  const raw = await apiRequest<any>('/tickets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const row = raw?.ticket ?? raw?.data ?? raw;
  if (!row || typeof row.id !== 'string') {
    throw new Error('Réponse invalide lors de la création du ticket');
  }
  return row as Ticket;
}

/**
 * Modifier un ticket
 */
export async function updateTicket(id: string, data: UpdateTicketData): Promise<{ ticket: Ticket }> {
  return apiRequest<{ ticket: Ticket }>(`/tickets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** Réponse BO (Nest: POST /tickets/:id/reponse) */
export async function postTicketReponse(id: string, message: string): Promise<Ticket> {
  const raw = await apiRequest<any>(`/tickets/${id}/reponse`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return (raw?.ticket ?? raw?.data ?? raw) as Ticket;
}

/** Changement de statut (Nest: POST /tickets/:id/statut) */
export async function postTicketStatut(id: string, statut: string): Promise<Ticket> {
  const raw = await apiRequest<any>(`/tickets/${id}/statut`, {
    method: 'POST',
    body: JSON.stringify({ statut }),
  });
  return (raw?.ticket ?? raw?.data ?? raw) as Ticket;
}