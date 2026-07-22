// ── Notation acheteur / vendeur (écart CDC 8.1.5) ────────────────────────────
// On ne peut noter que la contrepartie d'une commande LIVRÉE. La moyenne d'un
// utilisateur s'affiche ensuite sur le marché virtuel.
import { apiRequest } from '../../imports/api-client';
import { API_URL } from '../utils/api';

export interface NoteUtilisateur {
  moyenne: number;
  total: number;
  evaluations: Array<{ id: string; note: number; commentaire: string | null; created_at: string }>;
}

/** Moyenne + total + derniers avis reçus par un utilisateur (fiche marché). */
export async function getNoteUtilisateur(userId: string): Promise<NoteUtilisateur> {
  try {
    return await apiRequest<NoteUtilisateur>(API_URL, `/evaluations/user/${userId}`, { method: 'GET' });
  } catch {
    return { moyenne: 0, total: 0, evaluations: [] };
  }
}

/** Est-ce que l'utilisateur courant a déjà noté cette commande ? */
export async function getMaNote(commandeId: string): Promise<{ evaluee: boolean; evaluation: { note: number; commentaire: string | null } | null }> {
  try {
    return await apiRequest(API_URL, `/evaluations/commande/${commandeId}/mine`, { method: 'GET' });
  } catch {
    return { evaluee: false, evaluation: null };
  }
}

/** Note la contrepartie d'une commande livrée (1 à 5 étoiles + commentaire). */
export async function noterCommande(commandeId: string, note: number, commentaire?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiRequest<{ success?: boolean }>(API_URL, '/evaluations', {
      method: 'POST',
      body: JSON.stringify({ commande_id: commandeId, note, commentaire: commentaire || null }),
    });
    return { success: !!res?.success };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Erreur lors de la notation' };
  }
}
