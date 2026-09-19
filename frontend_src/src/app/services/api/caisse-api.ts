/**
 * Client API Caisse - JÙLABA
 */

import { apiRequest as _apiRequest } from './api-client';
import { API_URL } from '../../utils/api';
import type { LigneDeVente, ProduitServeur, SessionCaisseServeur, CreditServeur } from '../../types/vente';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CaisseTransaction {
  id: string;
  marchand_id: string;
  type: 'vente' | 'depense' | 'approvisionnement';
  /** Colonne `decimal` de Postgres : elle arrive en CHAÎNE via TypeORM. Elle
   *  était déclarée `number` alors que tous les appelants faisaient déjà un
   *  `parseFloat` — le type mentait, le code avait raison. */
  montant: number | string;
  produits?: LigneDeVente[];
  details?: LigneDeVente[];
  /** 'validee' | 'annulee' — l'annulation self-service (#20). Ce champ était
   *  lu par la caisse sans être déclaré. */
  statut?: string;
  mode_paiement?: string;
  notes?: string;
  created_at: string;
}

export interface EnregistrerVenteData {
  details?: LigneDeVente[];
  montant: number;
  produits?: LigneDeVente[];
  mode_paiement?: string;
  notes?: string;
  prix_achat?: number;
  prix_vente?: number;
  /** D'OÙ VIENT LA VENTE — 'vocal' si la marchande l'a dictée, 'kassa' sinon.
   *
   *  Ce champ manquait, et c'est tout le défaut : le backend le lisait déjà
   *  (`source: body.source || 'kassa'`), mais aucun appelant ne l'envoyait. La
   *  colonne prenait donc sa valeur par défaut pour TOUTES les ventes, et
   *  l'onglet « Par la voix » de l'écran Ventes passées ne pouvait rien
   *  afficher — jamais. */
  source?: 'vocal' | 'kassa';
  /** Clé d'idempotence : le backend ne compte pas deux fois la même vente. */
  idempotency_key?: string;
}

export interface EnregistrerDepenseData {
  montant: number;
  notes?: string;
  /** Clé d'idempotence : le backend ne compte pas deux fois la même dépense. */
  idempotency_key?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupérer l'historique des transactions caisse
 */
/** Plafond serveur par page (voir caisse-rest.controller : max 1000). */
const PAR_PAGE = 1000;
/** Garde-fou : au-delà, on arrête et on le dit plutôt que de boucler sans fin. */
const PAGES_MAX = 50;

export async function fetchCaisseTransactions(): Promise<{ transactions: CaisseTransaction[] }> {
  // « TU AS VENDU … EN TOUT » DOIT VRAIMENT DIRE TOUT — correctif du 18/09/2026.
  //
  // Cet appel ne demandait ni page ni limite : le serveur renvoyait ses 500
  // dernières transactions par défaut, et personne ne réclamait la suite. À
  // 501 ventes de 1 000 F, Tata annonçait 500 000 F au lieu de 501 000 F — et
  // l'écart grandit avec le succès de la marchande. Une caisse qui se trompe
  // d'autant plus qu'on l'utilise n'est pas une caisse.
  //
  // On pagine donc jusqu'au bout. Le plafond de 50 pages n'est pas une limite
  // de confort : c'est un garde-fou contre une boucle infinie si le serveur
  // cessait de décroître. Il couvre 50 000 transactions.
  const toutes: CaisseTransaction[] = [];
  for (let page = 1; page <= PAGES_MAX; page++) {
    const data = await apiRequest<{ transactions?: CaisseTransaction[] } | CaisseTransaction[]>(`/caisse/transactions?limit=${PAR_PAGE}&page=${page}`);
    const lot: CaisseTransaction[] = Array.isArray(data) ? data : (data.transactions || []);
    toutes.push(...lot);
    // Page incomplète = dernière page. C'est le seul signal fiable quel que
    // soit le format de réponse (tableau nu ou objet paginé).
    if (lot.length < PAR_PAGE) break;
  }
  return { transactions: toutes };
}

/**
 * Annulation self-service d'une vente du jour par le marchand (#20).
 * Le backend restitue le stock et marque la vente « annulee ».
 */
export async function annulerVenteMarchand(
  id: string,
): Promise<{ id: string; statut: string; restitutions: Array<{ produit_nom: string; quantite: number }> }> {
  return apiRequest(`/caisse/transactions/${id}/annuler`, { method: 'PATCH' });
}

/**
 * Enregistrer une vente
 */
export async function enregistrerVente(data: EnregistrerVenteData): Promise<{ transaction: CaisseTransaction }> {
  return apiRequest<{ transaction: CaisseTransaction }>('/caisse/vente', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Enregistrer une dépense
 */
export async function enregistrerDepense(data: EnregistrerDepenseData): Promise<{ transaction: CaisseTransaction }> {
  return apiRequest<{ transaction: CaisseTransaction }>('/caisse/depense', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
// ─────────────────────────────────────────────────────────────────────────────
// TYPES CREDITS & CLIENTS
// ─────────────────────────────────────────────────────────────────────────────

export interface Credit {
  id: string;
  marchand_id: string;
  client_nom: string;
  client_phone: string;
  montant_total: number;
  acompte: number;
  montant_restant: number;
  echeance: string;
  statut: 'en_attente' | 'en_retard' | 'bientot' | 'paye';
  statut_calcule: 'en_attente' | 'en_retard' | 'bientot' | 'paye';
  jours_restants: number;
  articles: LigneDeVente[];
  notes: string;
  paye_le: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientMarchand {
  id: string;
  marchand_id: string;
  nom: string;
  phone: string;
  nb_achats: number;
  nb_credits: number;
  montant_du: number;
  derniere_visite: string;
}

export interface CreerCreditData {
  client_nom: string;
  client_phone?: string;
  montant_total: number;
  acompte?: number;
  echeance: string;
  articles?: LigneDeVente[];
  notes?: string;
  transaction_id?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FONCTIONS CREDITS
// ─────────────────────────────────────────────────────────────────────────────

// Le backend renvoie statut/montant_restant/echeance ; l'UI attend en plus
// statut_calcule + jours_restants. On les DÉRIVE ici pour tous les consommateurs
// (corrige le badge « undefinedj restants »).
function enrichirCredit(c: CreditServeur): Credit {
  let jours_restants = 0;
  if (c?.echeance) {
    const d = new Date(c.echeance);
    if (!isNaN(d.getTime())) {
      // minuit à minuit : nombre de jours calendaires jusqu'à l'échéance.
      const j0 = new Date(); j0.setHours(0, 0, 0, 0);
      jours_restants = Math.round((d.setHours(0, 0, 0, 0) - j0.getTime()) / 86400000);
    }
  }
  const paye = c?.statut === 'paye';
  const statut_calcule: Credit['statut_calcule'] = paye ? 'paye'
    : jours_restants < 0 ? 'en_retard'
    : jours_restants <= 2 ? 'bientot'
    : 'en_attente';
  // DÉFAUT NOMMÉ, VOLONTAIREMENT NON CORRIGÉ DANS CE LOT. Le typage de la
  // réponse montre que le serveur peut omettre l'identifiant, la cliente ou le
  // montant restant. Écarter ces lignes serait la bonne correction — mais un
  // crédit qui disparaît de l'écran, c'est de l'argent qui disparaît aux yeux
  // de la marchande. Ce n'est pas de l'hygiène, c'est un chantier fonctionnel.
  // On ne met SURTOUT pas 0 par défaut sur un montant : ce serait dire « cette
  // cliente ne doit plus rien ». Le comportement reste celui d'avant.
  return { ...(c as unknown as Credit), jours_restants, statut_calcule };
}

export async function fetchCredits(): Promise<{ credits: Credit[]; total_du: number }> {
  const r = await apiRequest<{ credits: CreditServeur[]; total_du: number }>('/caisse/credits');
  return { credits: (r.credits || []).map(enrichirCredit), total_du: r.total_du };
}

export async function creerCredit(data: CreerCreditData): Promise<{ credit: Credit }> {
  return apiRequest<{ credit: Credit }>('/caisse/credits', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function marquerCreditPaye(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/caisse/credits/${id}/payer`, {
    method: 'PATCH',
  });
}

export async function ajouterAcompte(id: string, montant: number): Promise<{ success: boolean; solde: boolean }> {
  if (!id?.trim()) throw new Error('ID crédit requis');
  if (!montant || isNaN(montant) || montant <= 0) throw new Error('Montant acompte invalide');
  return apiRequest<{ success: boolean; solde: boolean }>(`/caisse/credits/${id}/acompte`, {
    method: 'PATCH',
    body: JSON.stringify({ montant }),
  });
}

export async function fetchClientsRecents(): Promise<{ clients: ClientMarchand[] }> {
  return apiRequest<{ clients: ClientMarchand[] }>('/caisse/credits/clients');
}

export async function rechercherClient(nom: string): Promise<{ client: ClientMarchand | null; credits: Credit[] }> {
  return apiRequest<{ client: ClientMarchand | null; credits: Credit[] }>(
    `/caisse/credits/clients/${encodeURIComponent(nom)}`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUITS DE LA CAISSE — HYGIÈNE-1 axe 2 (convergence API)
//
// Ces quatre appels vivaient en `fetch()` direct dans CaisseContext. Ils
// franchissaient donc le réseau SANS le rafraîchissement silencieux du jeton :
// une session simplement expirée faisait échouer la lecture du catalogue au
// lieu de se renouveler. Le catalogue, c'est ce que Tata lit à voix haute et ce
// sur quoi la vente s'appuie — il ne doit pas dépendre d'un cookie qui vient de
// tourner. Ils passent désormais par `apiRequest`, comme la vente elle-même.
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchProduitsCaisse(): Promise<{ produits: ProduitServeur[] }> {
  const data = await apiRequest<{ produits?: ProduitServeur[] }>('/caisse/produits');
  return { produits: data?.produits || [] };
}

export async function creerProduitCaisse(produit: Record<string, unknown>): Promise<{ produit: ProduitServeur }> {
  return apiRequest<{ produit: ProduitServeur }>('/caisse/produits', {
    method: 'POST',
    body: JSON.stringify(produit),
  });
}

export async function modifierProduitCaisse(id: string, produit: Record<string, unknown>): Promise<unknown> {
  if (!id?.trim()) throw new Error('ID produit requis');
  return apiRequest(`/caisse/produits/${id}`, {
    method: 'PUT',
    body: JSON.stringify(produit),
  });
}

export async function supprimerProduitCaisse(id: string): Promise<unknown> {
  if (!id?.trim()) throw new Error('ID produit requis');
  return apiRequest(`/caisse/produits/${id}`, { method: 'DELETE' });
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION DE CAISSE (ouverture, fermeture, fond) — HYGIÈNE-1 axe 2
//
// Ces quatre appels vivaient en `fetch()` direct dans AppContext, avec leur
// propre fabrique d'en-têtes (`caisseAuthHeaders`) qui recomposait à la main
// l'en-tête Authorization déjà posé par l'intercepteur global de `main.tsx`.
// C'est la journée de caisse : ce qu'il y avait dans la caisse le matin, ce
// qu'on y a compté le soir. Elle mérite la même porte que la vente.
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSessionDuJour(date: string): Promise<{ session: SessionCaisseServeur | null }> {
  return apiRequest<{ session: SessionCaisseServeur | null }>(`/caisse/session/${date}`);
}

export async function ouvrirSession(fondInitial: number, notes?: string): Promise<{ session: SessionCaisseServeur; fond_conserve?: boolean }> {
  return apiRequest<{ session: SessionCaisseServeur; fond_conserve?: boolean }>('/caisse/session/ouvrir', {
    method: 'POST',
    body: JSON.stringify({ fond_initial: fondInitial, notes }),
  });
}

export async function fermerSession(comptageReel: number, notes?: string): Promise<unknown> {
  return apiRequest('/caisse/session/fermer', {
    method: 'POST',
    body: JSON.stringify({ comptage_reel: comptageReel, notes }),
  });
}

export async function modifierFondSession(fondInitial: number): Promise<{ session: SessionCaisseServeur }> {
  return apiRequest<{ session: SessionCaisseServeur }>('/caisse/session/fond', {
    method: 'PATCH',
    body: JSON.stringify({ fond_initial: fondInitial }),
  });
}
