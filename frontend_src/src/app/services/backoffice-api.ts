// backoffice-api.ts — NestJS
import { API_URL } from '../utils/api';
import type { SousProfilMarchand } from '../types/sousProfilMarchand';

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}


async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    let message = raw || String(res.status);
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') {
        message = parsed;
      } else if (parsed && typeof parsed === 'object') {
        const payload = parsed as { message?: unknown; error?: unknown };
        if (typeof payload.message === 'string' && payload.message.trim()) {
          message = payload.message;
        } else if (Array.isArray(payload.message) && payload.message.length > 0) {
          message = String(payload.message[0]);
        } else if (typeof payload.error === 'string' && payload.error.trim()) {
          message = payload.error;
        }
      }
    } catch {
      // raw n'est pas du JSON : on garde le texte tel quel.
    }
    throw new Error(message || String(res.status));
  }
  return res.json() as Promise<T>;
}

async function getValidToken(): Promise<string | null> {
  // Token géré via cookie httpOnly — aucune action nécessaire
  return null;
}

async function apiGet(path: string): Promise<any> {
  const res = await fetch(API_URL + path, { headers: authHeaders(), credentials: 'include' });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

async function apiPost(path: string, body?: any) {
  const res = await fetch(API_URL + path, { method: 'POST', headers: authHeaders(), body: body ? JSON.stringify(body) : undefined, credentials: 'include' });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

/** Normalise un identifiant BO saisi (téléphone CIV ou e-mail) pour les appels WebAuthn ou login. */
export function formatBoLoginIdentifier(trimmed: string): { phone?: string; email?: string } {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  if (isEmail) {
    return { email: trimmed.toLowerCase() };
  }
  const digits = trimmed.replace(/\D/g, '');
  const formatted =
    trimmed.startsWith('+225')
      ? trimmed.replace(/\s/g, '')
      : digits.startsWith('225')
        ? `+${digits}`
        : digits.startsWith('0')
          ? `+225${digits}`
          : `+225${digits}`;
  return { phone: formatted };
}

export async function boLogin(
  identifier: string,
  password: string,
  signal?: AbortSignal
): Promise<{
  accessToken: string;
  user: BOUser;
}> {
  const trimmed = identifier.trim();

  const normalized = formatBoLoginIdentifier(trimmed);
  let body: { phone?: string; email?: string; password: string };

  if (normalized.email) {
    body = {
      email: normalized.email,
      password,
    };
  } else {
    body = {
      phone: normalized.phone!,
      password,
    };
  }

  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const errorData = (await res.json().catch(() => ({}))) as {
      message?: string;
      attemptsRemaining?: unknown;
    };
    const baseMsg =
      typeof errorData.message === 'string' && errorData.message.trim()
        ? errorData.message
        : `Échec de connexion (${res.status})`;
    const err = new Error(baseMsg) as Error & {
      attemptsRemaining?: number;
      httpStatus?: number;
    };
    err.httpStatus = res.status;
    const ar = errorData.attemptsRemaining;
    err.attemptsRemaining =
      typeof ar === 'number' && Number.isFinite(ar) ? ar : undefined;
    throw err;
  }

  const data = await res.json();
  return { accessToken: data.accessToken, user: data.user };
}

export async function boGetMe(): Promise<BOUser> {
  const res = await fetch(`${API_URL}/auth/me`, { headers: authHeaders(), credentials: 'include' });
  return handleResponse(res);
}

export async function boGetContactsRecoveryBo(signal?: AbortSignal): Promise<{
  contacts: Array<{ id: string; firstName: string; lastName: string; phone: string }>;
}> {
  const res = await fetch(`${API_URL}/auth/contacts-recovery-bo`, { signal });
  if (!res.ok) throw new Error(String(res.status));
  return res.json() as Promise<{ contacts: Array<{ id: string; firstName: string; lastName: string; phone: string }> }>;
}

export async function boWebAuthnAuthenticateOptions(phone: string, signal?: AbortSignal): Promise<Record<string, unknown> & { userId?: string; error?: string }> {
  const res = await fetch(`${API_URL}/auth/webauthn/authenticate/options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ phone }),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string; userId?: string };
  if (!res.ok || typeof data.error === 'string') {
    throw new Error(typeof data.error === 'string' ? data.error : 'Options biométriques indisponibles');
  }
  return data;
}

export async function boWebAuthnAuthenticateVerify(
  userId: string,
  webauthnResponse: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{ verified: boolean; user?: BOUser; error?: string }> {
  const res = await fetch(`${API_URL}/auth/webauthn/authenticate/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ userId, response: webauthnResponse }),
    signal,
  });
  return (await res.json().catch(() => ({}))) as { verified: boolean; user?: BOUser; error?: string };
}

export interface BOUser {
  id: string;
  phone: string;
  full_name?: string;
  firstName?: string;
  lastName?: string;
  prenom?: string;
  nom?: string;
  email?: string;
  region?: string;
  lastLogin?: string;
  actif?: boolean;
  boPermissions?: Record<string, boolean>;
  // Variante snake_case telle que renvoyee par la liste BO (SELECT u.* backend).
  bo_permissions?: Record<string, boolean> | null;
  mustChangePassword?: boolean;
  // Raison sociale d'un compte entite (colonne institution_name, peut etre null).
  institutionName?: string | null;
  // Metadonnees d'entite pour un compte admin cree en mode entite (sigle, type...).
  entiteMetadata?: {
    sigle: string;
    typeEntite: string;
    typePrecise: string | null;
    referentNom: string;
    referentFonction: string;
  } | null;
  // Aligne sur BORoleType (BackOfficeContext) : pas de role fantome 'admin'.
  role:
    | 'admin_general'
    | 'identificateur'
    | 'operateur_terrain'
    | 'super_admin'
    | 'admin_national'
    | 'gestionnaire_zone';
}

export interface Acteur {
  id: string;
  full_name: string;
  phone: string;
  telephone?: string;
  nom?: string;
  prenoms?: string;
  region?: string;
  statut?: string;
  type?: string;
  activite?: string;
  nin?: string;
  zone?: string;
  dateInscription?: string;
  email?: string;
  commune?: string;
  score?: number;
  validated?: boolean;
  photoUrl?: string;
  numCmu?: string;
  genre?: string;
  identificateur_id?: string;
  cni?: string;
  transactionsTotal?: number;
  volumeTotal?: number;
  role: string;
  created_at: string;
  is_active: boolean;
  cooperative_id?: string;
  sousProfilMarchand?: 'grossiste' | 'demi_grossiste' | 'detaillant';
  [key: string]: unknown;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  description?: string;
  created_at: string;
  user_id: string;
  date?: string;
  montant?: number;
  region?: string;
  acteurNom?: string;
  acteurType?: string;
  produit?: string;
  quantite?: number;
  modePaiement?: string;
  commission?: number;
  [key: string]: unknown;
}

export interface Cooperative {
  id: string;
  name: string;
  region: string;
  members_count: number;
  created_at: string;
}

export interface DashboardStats {
  total_acteurs: number;
  total_transactions: number;
  total_cooperatives: number;
  montant_total: number;
  nouveaux_acteurs_semaine: number;
  /** Alias backend `/admin/stats` */
  utilisateurs_actifs?: number;
  actifs?: number;
  en_attente?: number;
  suspendus?: number;
  rejetes?: number;
  revenus?: number;
  transactions_heure?: number;
  [key: string]: unknown;
}

// ── Types métier BO — dérivés des entités backend ────────────

export interface BOZone {
  id: string;
  nom: string;
  region?: string;
  description?: string;
  gestionnaire_id?: string;
  actif: boolean;
  statut?: string;
  nbActeurs?: number;
  volumeTotal?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BOTerritoire {
  id: string;
  nom: string;
  region?: string;
  actif?: boolean;
}

export interface BOAuditLog {
  id: string;
  user_id?: string;
  action?: string;
  entite?: string;
  entite_id?: string;
  details?: Record<string, unknown>;
  ip?: string;
  created_at?: string;
}

export interface BOMission {
  id: string;
  titre: string;
  description?: string;
  assignee_id?: string;
  zone_id?: string;
  statut: string;
  priorite: string;
  date_echeance?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BODossier {
  id: string;
  statut?: string;
  type_acteur?: string;
  nom?: string;
  prenom?: string;
  region?: string;
  commune?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface BOInstitution {
  id: string;
  nom: string;
  name?: string;
  region?: string;
  statut?: string;
  modules?: string[];
  created_at?: string;
  email?: string;
  referentNom?: string;
  referentTelephone?: string;
  dateCreation?: string;
  creePar?: string;
  [key: string]: unknown;
}


export async function boDashboardStats(): Promise<DashboardStats> {
  try {
    const data = await apiGet('/admin/stats');
    return {
      total_acteurs: data.total_acteurs || data.utilisateurs || 0,
      total_transactions: data.total_transactions || data.transactions || 0,
      total_cooperatives: data.total_cooperatives || 0,
      montant_total: data.montant_total || data.revenus || 0,
      nouveaux_acteurs_semaine: data.nouveaux_acteurs_semaine || data.nouveauxSemaine || 0,
      utilisateurs_actifs: data.utilisateurs_actifs ?? data.actifs ?? 0,
      actifs: data.utilisateurs_actifs ?? data.actifs ?? 0,
      en_attente: data.en_attente || 0,
      suspendus: data.suspendus || 0,
      rejetes: data.rejetes || 0,
    };
  } catch {
    return { total_acteurs: 0, total_transactions: 0, total_cooperatives: 0, montant_total: 0, nouveaux_acteurs_semaine: 0 };
  }
}

export async function boGetActeurs(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}): Promise<{ data: Acteur[]; total: number; page: number; limit: number }> {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.search) q.set('search', params.search);
  if (params?.role && params.role !== 'all') q.set('role', params.role);

  const res = await fetch(`${API_URL}/users?${q}`, { headers: authHeaders(), credentials: 'include' });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    console.error('[boGetActeurs] HTTP error:', res.status, res.statusText, errorBody);
    throw new Error(`boGetActeurs HTTP ${res.status}: ${res.statusText}`);
  }

  const raw = await res.json();
  const list = raw.users || raw.data || (Array.isArray(raw) ? raw : []);
  const mapped = list.map((u: any) => ({
    ...u,
    activite: u.activite || u.activity || '',
    dateInscription: u.dateInscription || u.createdAt || u.created_at || '',
    zone: u.zone || u.zoneId || '',
    nin: u.nin || u.cni || '',
    nom: u.nom || u.lastName || u.last_name || '',
    prenom: u.prenom || u.firstName || u.first_name || '',
    telephone: u.telephone || u.phone || '',
    type: u.type || u.role || '',
    statut: u.statut || u.status || '',
    photoUrl: u.photoUrl || u.photo_url || u.photo || '',
    numCmu: u.numCmu || u.num_cmu || '',
    genre: (u.genre || u.gender || '').toLowerCase().trim(),
    identificateur_id: u.identificateur_id || u.identificateurId || '',
    sousProfilMarchand: u.sousProfilMarchand || u.sous_profil_marchand || undefined,
  }));
  return { data: mapped, total: raw.meta?.total ?? raw.total ?? list.length, page: raw.meta?.page ?? 1, limit: raw.meta?.limit ?? 50 };
}

export interface RoleCounts {
  all: number;
  marchand: number;
  producteur: number;
  cooperateur: number;
  institution: number;
  identificateur: number;
  admin: number;
}

const DEFAULT_ROLE_COUNTS: RoleCounts = {
  all: 0,
  marchand: 0,
  producteur: 0,
  cooperateur: 0,
  institution: 0,
  identificateur: 0,
  admin: 0,
};

const ROLE_COUNTS_CACHE_MS = 60_000;
let roleCountsCache: RoleCounts | null = null;
let roleCountsCacheAt = 0;
let roleCountsRefreshPromise: Promise<RoleCounts> | null = null;

function normalizeRoleCounts(data: Partial<RoleCounts> | null | undefined): RoleCounts {
  return {
    all: Number(data?.all) || 0,
    marchand: Number(data?.marchand) || 0,
    producteur: Number(data?.producteur) || 0,
    cooperateur: Number(data?.cooperateur) || 0,
    institution: Number(data?.institution) || 0,
    identificateur: Number(data?.identificateur) || 0,
    admin: Number(data?.admin) || 0,
  };
}

async function fetchRoleCounts(signal?: AbortSignal): Promise<RoleCounts> {
  const res = await fetch(`${API_URL}/users/counts-by-role`, {
    headers: authHeaders(),
    credentials: 'include',
    signal,
  });

  if (!res.ok) return DEFAULT_ROLE_COUNTS;

  const counts = normalizeRoleCounts(await res.json());
  roleCountsCache = counts;
  roleCountsCacheAt = Date.now();
  return counts;
}

export async function boGetActeurCounts(signal?: AbortSignal, force = false): Promise<RoleCounts> {
  const isCacheFresh = roleCountsCache && Date.now() - roleCountsCacheAt < ROLE_COUNTS_CACHE_MS;
  if (!force && isCacheFresh) return roleCountsCache;
  if (!force && roleCountsRefreshPromise) return roleCountsRefreshPromise;

  try {
    roleCountsRefreshPromise = fetchRoleCounts(signal);
    return await roleCountsRefreshPromise;
  } catch (err: any) {
    void err;
    return roleCountsCache ?? DEFAULT_ROLE_COUNTS;
  } finally {
    roleCountsRefreshPromise = null;
  }
}

export async function boGetActeur(id: string): Promise<Acteur> {
  const res = await fetch(`${API_URL}/users/${id}`, { headers: authHeaders(), credentials: 'include' });
  const u = await handleResponse<Record<string, any>>(res);
  return {
    ...u,
    activite: u.activity || u.activite || '',
    dateInscription: u.createdAt || u.dateInscription || '',
    zone: u.zoneId || u.zone || '',
    nin: u.nin || u.cni || '',
    nom: u.lastName || u.nom || '',
    prenom: u.firstName || u.prenom || '',
    telephone: u.phone || u.telephone || '',
    type: u.role || u.type || '',
    statut: u.statut || u.status || 'actif',
  };
}

export async function boCreateActeur(data: Partial<Acteur> & { password: string }): Promise<Acteur> {
  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function boUpdateActeur(id: string, data: Partial<Acteur>): Promise<Acteur> {
  const res = await fetch(`${API_URL}/users/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function boChangeSousProfilMarchand(
  id: string,
  sousProfilMarchand: 'grossiste' | 'demi_grossiste' | 'detaillant',
  motif?: string,
): Promise<{ id: string; sousProfilMarchand: string; message: string }> {
  const res = await fetch(`${API_URL}/users/${id}/sous-profil`, {
    method: 'PATCH',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify({ sousProfilMarchand, motif: motif || undefined }),
  });
  return handleResponse(res);
}

export async function boToggleActeur(id: string, is_active: boolean): Promise<Acteur> {
  return boUpdateActeur(id, { is_active });
}

export async function boDeleteActeur(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Erreur ${res.status}`);
  }
}

export async function boSoftDeleteActeur(id: string): Promise<{ success: boolean }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
      credentials: 'include',
      signal: controller.signal,
    });
    const data = await handleResponse<Partial<{ success: boolean }>>(res);
    return { success: data.success ?? true };
  } catch (err) {
    if ((err as any)?.name === 'AbortError') {
      throw new Error('Délai dépassé, vérifiez votre connexion');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function boGetTransactions(params?: {
  page?: number;
  limit?: number;
  user_id?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
  statut?: string;
  region?: string;
}): Promise<{ data: Transaction[]; total: number }> {
  try {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.user_id) q.set('user_id', params.user_id);
    if (params?.type) q.set('type', params.type);
    if (params?.date_from) q.set('date_from', params.date_from);
    if (params?.date_to) q.set('date_to', params.date_to);
    if (params?.statut) q.set('statut', params.statut);
    if (params?.region) q.set('region', params.region);
    const res = await fetch(`${API_URL}/transactions/all?${q}`, { headers: authHeaders(), credentials: 'include' });
    if (!res.ok) return { data: [], total: 0 };
    const raw = await res.json();
    const data = Array.isArray(raw) ? raw : (raw.data || []);
    return { data, total: raw.meta?.total || raw.total || data.length };
  } catch {
    return { data: [], total: 0 };
  }
}

export type TransactionStatusValue = 'validee' | 'en_cours' | 'gelee' | 'annulee' | 'litige';

export type TransactionsGeoAggregationItem = {
  region: string;
  count: number;
  volume: number;
  litiges: number;
  gelees: number;
};

export type TransactionsActeurGeoItem = {
  userId: string;
  fullName: string;
  role: string;
  region: string;
  commune: string | null;
  count: number;
  volume: number;
  litiges: number;
  gelees: number;
};

export async function boUpdateTransactionStatus(
  id: string,
  statut: TransactionStatusValue,
  motif?: string,
): Promise<{ id: string; statut: TransactionStatusValue; motif: string | null }> {
  const res = await fetch(`${API_URL}/transactions/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ statut, motif }),
  });
  return handleResponse(res);
}

export async function boExportTransactions(
  format: 'csv' | 'xlsx' | 'pdf',
  filters?: { date_from?: string; date_to?: string; statut?: string; region?: string },
): Promise<Blob> {
  const url = new URL(`${API_URL}/transactions/export`);
  url.searchParams.set('format', format);
  if (filters?.date_from) url.searchParams.set('date_from', filters.date_from);
  if (filters?.date_to) url.searchParams.set('date_to', filters.date_to);
  if (filters?.statut) url.searchParams.set('statut', filters.statut);
  if (filters?.region) url.searchParams.set('region', filters.region);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Export ${format} failed: ${res.status}`);
  return res.blob();
}

export async function boGetTransactionsGeoAggregation(
  filters?: { date_from?: string; date_to?: string },
  signal?: AbortSignal,
): Promise<TransactionsGeoAggregationItem[]> {
  const url = new URL(`${API_URL}/transactions/geo-aggregation`);
  if (filters?.date_from) url.searchParams.set('date_from', filters.date_from);
  if (filters?.date_to) url.searchParams.set('date_to', filters.date_to);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
    signal,
  });
  return handleResponse(res);
}

export async function boGetTransactionsByActeurGeo(
  filters?: { date_from?: string; date_to?: string },
  signal?: AbortSignal,
): Promise<TransactionsActeurGeoItem[]> {
  const url = new URL(`${API_URL}/transactions/by-acteur-geo`);
  if (filters?.date_from) url.searchParams.set('date_from', filters.date_from);
  if (filters?.date_to) url.searchParams.set('date_to', filters.date_to);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
    signal,
  });
  return handleResponse(res);
}

export async function boGetCooperatives(): Promise<Cooperative[]> {
  try {
    const res = await fetch(`${API_URL}/institutions`, { headers: authHeaders(), credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.institutions || data.data || data || [];
  } catch {
    return [];
  }
}

export async function boGetCooperative(id: string): Promise<Cooperative> {
  const res = await fetch(`${API_URL}/institutions/${id}`, { headers: authHeaders(), credentials: 'include' });
  return handleResponse(res);
}

export async function boCreateCooperative(data: Partial<Cooperative>): Promise<Cooperative> {
  const res = await fetch(`${API_URL}/institutions`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function boUpdateCooperative(id: string, data: Partial<Cooperative>): Promise<Cooperative> {
  const res = await fetch(`${API_URL}/institutions/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function boGetDashboard(): Promise<DashboardStats> {
  try {
    const res = await fetch(`${API_URL}/users`, { headers: authHeaders(), credentials: 'include' });
    if (!res.ok) return { total_acteurs: 0, total_transactions: 0, total_cooperatives: 0, montant_total: 0, nouveaux_acteurs_semaine: 0 };
    const data = await res.json();
    const users = Array.isArray(data) ? data : (data.data || data.users || []);
    const total = typeof data.total === 'number' ? data.total : users.length;
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const nouveaux_acteurs_semaine = users.filter((u: Record<string, unknown>) => {
      const d = u.created_at ?? u.createdAt;
      if (!d || typeof d !== 'string') return false;
      const t = new Date(d).getTime();
      return !Number.isNaN(t) && now - t <= weekMs;
    }).length;
    const coopIds = new Set(
      users
        .map((u: Record<string, unknown>) => u.cooperative_id ?? u.cooperativeId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    );
    return {
      total_acteurs: total,
      total_transactions: 0,
      total_cooperatives: coopIds.size,
      montant_total: 0,
      nouveaux_acteurs_semaine,
    };
  } catch {
    return { total_acteurs: 0, total_transactions: 0, total_cooperatives: 0, montant_total: 0, nouveaux_acteurs_semaine: 0 };
  }
}

export async function boGetRapports() {
  try {
    const res = await fetch(`${API_URL}/rapport/rapports`, { headers: authHeaders(), credentials: 'include' });
    if (!res.ok) return { rapports: [], total: 0 };
    return res.json();
  } catch { return { rapports: [], total: 0 }; }
}

export async function boGetModeration() {
  try {
    const res = await fetch(`${API_URL}/rapport/moderation`, { headers: authHeaders(), credentials: 'include' });
    if (!res.ok) return { signalements: [], total: 0 };
    return res.json();
  } catch { return { signalements: [], total: 0 }; }
}

export async function boGetLivraison() {
  try {
    const res = await fetch(`${API_URL}/commandes`, { headers: authHeaders(), credentials: 'include' });
    if (!res.ok) return { livraisons: [], total: 0 };
    return res.json();
  } catch { return { livraisons: [], total: 0 }; }
}

export async function boGetCommunication() {
  try {
    const res = await fetch(`${API_URL}/notifications`, { headers: authHeaders(), credentials: 'include' });
    if (!res.ok) return { messages: [], campagnes: [] };
    return res.json();
  } catch { return { messages: [], campagnes: [] }; }
}

export async function boGetCron() {
  try {
    const res = await fetch(`${API_URL}/rapport/cron`, { headers: authHeaders(), credentials: 'include' });
    if (!res.ok) return { jobs: [] };
    return res.json();
  } catch { return { jobs: [] }; }
}

export async function boGetAnalytics() {
  try {
    const res = await fetch(`${API_URL}/rapport/analytics`, { headers: authHeaders(), credentials: 'include' });
    if (!res.ok) return { total_users: 0, by_role: [], daily_active: [], funnel: [] };
    return res.json();
  } catch { return { total_users: 0, by_role: [], daily_active: [], funnel: [] }; }
}

export async function boGetMonitoring() {
  try {
    const res = await fetch(`${API_URL}/rapport/monitoring`, { headers: authHeaders(), credentials: 'include' });
    if (!res.ok) return { services: [] };
    return res.json();
  } catch { return { services: [] }; }
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const token = await getValidToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) (headers as any)["Authorization"] = "Bearer " + token;
  const res = await fetch(API_URL + path, { ...options, headers, credentials: "include" });
  if (!res.ok) throw new Error(String(res.status));
  return res.json().catch(() => ({}));
}

async function apiPatch(path: string, body?: any) {
  const token = await getValidToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) (headers as any)["Authorization"] = "Bearer " + token;
  const res = await fetch(API_URL + path, { method: "PATCH", headers, credentials: "include", body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}
async function apiDelete(path: string) {
  return apiRequest(path, { method: 'DELETE' });
}

// ── Zones ─────────────────────────────────────────────────────
export async function boGetZones() {
  const res = await apiGet('/zones');
  const list = res.zones || res.data || (Array.isArray(res) ? res : []);
  return list.map((z: Record<string, any>) => ({
    ...z,
    statut: z.actif ? 'active' : 'inactive',
    nbActeurs: z.nbActeurs || 0,
    volumeTotal: z.volumeTotal || 0,
  }));
}
export async function boCreateZone(data: any) {
  return apiPost('/zones', data);
}
export async function boUpdateZone(id: string, data: any) {
  return apiPatch(`/zones/${id}`, data);
}
export async function boDeleteZone(id: string, opts?: { motif?: string }) {
  await apiDelete(`/zones/${id}`);
  if (opts?.motif) {
    try {
      await boPostAuditLog({
        action: 'ZONE_DELETED',
        entite: 'zone',
        entiteId: id,
        details: { motif: opts.motif },
      });
    } catch {
      /* journalisation non bloquante */
    }
  }
}

// ── Marchés (module Phase 1) ────────────────────────────────────────────────
export async function boGetMarches(opts?: { zoneId?: string; region?: string; actif?: boolean }): Promise<any[]> {
  const params = new URLSearchParams();
  if (opts?.zoneId) params.set('zoneId', opts.zoneId);
  if (opts?.region) params.set('region', opts.region);
  if (opts?.actif !== undefined) params.set('actif', String(opts.actif));
  const qs = params.toString();
  const res = await apiGet(`/marches${qs ? `?${qs}` : ''}`);
  if (Array.isArray(res)) return res;
  return res?.data || res?.marches || [];
}

export async function boGetMarche(id: string): Promise<any> {
  return apiGet(`/marches/${id}`);
}

export async function boCreateMarche(body: {
  nom: string;
  zoneId: string;
  adresse?: string;
  latitude?: number;
  longitude?: number;
  type?: 'couvert' | 'decouvert' | 'mixte' | 'autre';
  description?: string;
  actif?: boolean;
}): Promise<any> {
  return apiPost('/marches', body);
}

export async function boUpdateMarche(
  id: string,
  body: Partial<{
    nom: string;
    zoneId: string;
    adresse: string;
    latitude: number;
    longitude: number;
    type: string;
    description: string;
    actif: boolean;
  }>,
): Promise<any> {
  return apiPatch(`/marches/${id}`, body);
}

export async function boDeleteMarche(id: string, opts?: { motif?: string }): Promise<void> {
  await apiDelete(`/marches/${id}`);
  if (opts?.motif) {
    try {
      await boPostAuditLog({
        action: 'MARCHE_DELETED',
        entite: 'marche',
        entiteId: id,
        details: { motif: opts.motif },
      });
    } catch {
      /* journalisation non bloquante */
    }
  }
}

// ── Missions ──────────────────────────────────────────────────
export async function boGetMissions() {
  const res = await apiGet('/missions');
  return res.data || (Array.isArray(res) ? res : []);
}
export async function boCreateMission(data: any) {
  return apiPost('/missions', data);
}
export async function boUpdateMission(id: string, data: any) {
  return apiPatch(`/missions/${id}`, data);
}

// ── Dossiers (identifications) ────────────────────────────────
export async function boGetDossiers(params?: { page?: number; limit?: number }) {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const res = await apiGet(`/identifications?page=${page}&limit=${limit}`);
  const list = res.data || (Array.isArray(res) ? res : []);
  return list.map((d: any) => ({
    ...d,
    statut: d.statut || 'en_attente',
    dateCreation: d.date_identification || d.created_at || '',
    identificateurNom: d.identificateur_nom || d.identificateur_id || '',
    acteurNom: d.acteur_nom || d.acteur_id || '',
    motifRejet: d.motif_rejet || d.motifRejet || null,
    acteurType: d.acteur_type || d.type_acteur || d.acteurType || '',
  }));
}
export async function boUpdateDossier(id: string, data: any) {
  return apiPatch(`/identifications/${id}`, data);
}
export async function boDeleteBrouillon(id: string) {
  return apiDelete(`/identifications/${id}`);
}

// ── Audit logs ────────────────────────────────────────────────
export async function boGetAuditLogs() {
  try {
    const res = await apiGet('/audit');
    return res.logs || res.data || (Array.isArray(res) ? res : []);
  } catch {
    return [];
  }
}

// ── BO Users (utilisateurs admin) ────────────────────────────
export async function boGetBOUsers() {
  // Le serveur filtre les roles BO (scope=bo) et pagine : plus de filtre JS.
  // On parcourt les pages (limit max 100) pour recuperer tous les comptes BO.
  const limit = 100;
  let page = 1;
  const all: any[] = [];
  for (;;) {
    const res = await apiGet(`/users?scope=bo&page=${page}&limit=${limit}`);
    const rows = res?.data ?? (Array.isArray(res) ? res : []);
    all.push(...rows);
    const more = res?.meta?.hasNext ?? rows.length === limit;
    if (!more || page >= 50) break; // garde-fou anti-boucle (5000 comptes BO)
    page += 1;
  }
  return all.map((u: any) => ({
    ...u,
    actif: u.status === 'actif' || u.actif === true,
  }));
}
export async function boCreateBOUser(data: any) {
  const digits = (data.telephone || '').replace(/\D/g, '');
  const phone = digits
    ? (digits.startsWith('225') ? '+' + digits : '+225' + digits)
    : null;
  if (!phone) throw new Error('Numéro de téléphone requis');
  // Création de compte BO via l'endpoint authentifié dédié (réservé super_admin).
  // L'ancien passage par /auth/signup (public) est supprimé : le mot de passe est
  // généré côté serveur et renvoyé dans motDePasseInitial.
  return apiPost('/users/backoffice-account', {
    phone,
    firstName: data.prenom,
    lastName: data.nom,
    role: data.role,
    region: data.region || 'National',
  });
}
export async function boUpdateBOUser(id: string, data: any) {
  return apiPatch(`/users/${id}`, data);
}

/**
 * Active ou suspend un utilisateur BO : envoie le champ `status` (enum backend UserStatus), pas `is_active`.
 */
export async function updateBOUserActif(id: string, actif: boolean) {
  const status = actif ? 'actif' : 'suspendu';
  return apiPatch(`/users/${id}`, { status });
}

export async function boAdminResetPassword(userId: string) {
  return apiPost(`/users/${userId}/admin-reset-password`, {});
}

/** Rôles administrateur créables via POST /users/admin (Phase 2D). */
export type BoCreatableAdminRole =
  | 'admin_general'
  | 'admin_national'
  | 'gestionnaire_zone'
  | 'operateur_terrain';

export interface BoCreateAdminPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: BoCreatableAdminRole;
  zoneId?: string;
  boPermissions?: Record<string, Record<string, boolean>>;
}

export interface BoCreateAdminResult {
  id: string;
  status: string;
  message: string;
}

export type AdminEnAttente = {
  id: string;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: string;
  createdBy: string | null;
  pendingValidationData: Record<string, unknown> | null;
};

export async function boCreateAdmin(payload: BoCreateAdminPayload): Promise<BoCreateAdminResult> {
  const res = await fetch(`${API_URL}/users/admin`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return handleResponse<BoCreateAdminResult>(res);
}

export async function boGetAdminsEnAttente(signal?: AbortSignal): Promise<AdminEnAttente[]> {
  const res = await fetch(`${API_URL}/users/admin/pending`, {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
    signal,
  });
  return handleResponse<AdminEnAttente[]>(res);
}

export async function boValidateAdmin(userId: string): Promise<BoCreateAdminResult> {
  const res = await fetch(`${API_URL}/users/admin/${userId}/validate`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
  });
  return handleResponse<BoCreateAdminResult>(res);
}

export async function boRejectAdmin(userId: string, motif: string): Promise<BoCreateAdminResult> {
  const res = await fetch(`${API_URL}/users/admin/${userId}/reject`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify({ motif }),
  });
  return handleResponse<BoCreateAdminResult>(res);
}

/** Payload POST /users/backoffice/create (Phase 4A bis-0). */
export interface CreateBackofficeUserPayload {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  emailOptional?: string;
  role:
    | 'marchand'
    | 'producteur'
    | 'cooperateur'
    | 'institution'
    | 'identificateur'
    | 'admin_general'
    | 'admin_national'
    | 'gestionnaire_zone'
    | 'operateur_terrain';
  zoneId?: string;
  zoneIdOptional?: string;
  boPermissions?: Record<string, unknown>;
  // Metadonnees d'entite, transmises uniquement pour un compte admin cree en
  // mode entite (profil admin_general). Doit correspondre au type EntiteMetadata
  // cote backend (colonne entite_metadata).
  entiteMetadata?: {
    sigle: string;
    typeEntite: string;
    typePrecise: string | null;
    referentNom: string;
    referentFonction: string;
  };
  sousProfilMarchand?: SousProfilMarchand;
  genre?: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  nationalite?: string;
  nin?: string;
  numCmu?: string;
  photoBase64?: string;
  acteurMetierData?: Record<string, unknown>;
  institutionData?: Record<string, unknown>;
}

export interface CreateBackofficeUserResult {
  id: string;
  status: string;
  message: string;
  defaultPassword?: string;
}

export async function boCreateBackofficeUser(
  payload: CreateBackofficeUserPayload,
  signal?: AbortSignal,
): Promise<CreateBackofficeUserResult> {
  const res = await fetch(`${API_URL}/users/backoffice/create`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
    signal,
  });
  return handleResponse<CreateBackofficeUserResult>(res);
}

export interface DuplicateGroup {
  type: 'phone' | 'identity';
  key: string;
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    dateNaissance: string | null;
    role: string;
    status: string;
    createdAt: string;
  }>;
}

export type UserFlagType = 'doublon' | 'fraude' | 'abus' | 'spam' | 'usurpation' | 'autre';

export type UserFlagItem = {
  id: string;
  flagType: UserFlagType;
  raison: string;
  commentaire: string | null;
  userId: string;
  createdBy: string;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
  userFirstName?: string | null;
  userLastName?: string | null;
  userPhone?: string | null;
  creatorFirstName?: string | null;
  creatorLastName?: string | null;
};

export type UserFlag = UserFlagItem;

export type FlagResolutionAction = 'avertissement' | 'suspendre' | 'bannir' | 'rejeter';

export async function boGetDuplicates(): Promise<{ count: number; groups: DuplicateGroup[] }> {
  try {
    const res = await fetch(`${API_URL}/users/duplicates`, { headers: authHeaders(), credentials: 'include' });
    if (!res.ok) return { count: 0, groups: [] };
    return await res.json();
  } catch {
    return { count: 0, groups: [] };
  }
}

export async function boGetUserFlags(
  resolvedOrFilters?: boolean | { resolved?: boolean },
  signal?: AbortSignal,
): Promise<{ count: number; items: UserFlagItem[] }> {
  const resolved = typeof resolvedOrFilters === 'boolean' ? resolvedOrFilters : resolvedOrFilters?.resolved;
  const url = new URL(`${API_URL}/users/flags`);
  if (resolved !== undefined) url.searchParams.set('resolved', String(resolved));
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
    signal,
  });
  return handleResponse<{ count: number; items: UserFlagItem[] }>(res);
}

export async function boCreateUserFlag(
  payload: {
    userId: string;
    flagType: UserFlagType;
    raison: string;
    commentaire?: string;
  },
  signal?: AbortSignal,
): Promise<{ id: string; flagType: string; raison: string; createdAt: string }> {
  const res = await fetch(`${API_URL}/users/flags`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(payload),
    signal,
  });
  return handleResponse(res);
}

export async function boResolveUserFlag(
  flagId: string,
  action: FlagResolutionAction,
  resolutionNote?: string,
): Promise<{ id: string; resolved: true; action: string }> {
  const res = await fetch(`${API_URL}/users/flags/${flagId}/resolve`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action, resolutionNote }),
  });
  return handleResponse<{ id: string; resolved: true; action: string }>(res);
}

export async function boUpdateBOUserPermissions(id: string, permissions: Record<string, boolean>) {
  return apiPatch(`/users/${id}/bo-permissions`, { bo_permissions: permissions });
}

// ── Institutions ──────────────────────────────────────────────
export async function boGetInstitutions() {
  const res = await apiGet('/institutions');
  return res.data || (Array.isArray(res) ? res : []);
}
export async function boCreateInstitution(data: any) {
  return apiPost('/institutions', data);
}
export async function boUpdateInstitution(id: string, data: any) {
  return apiPatch(`/institutions/${id}`, data);
}
export async function boDeleteInstitutionApi(id: string) {
  return apiDelete(`/institutions/${id}`);
}

// ── Modération ────────────────────────────────────────────────
export async function boGetSignalements() {
  const res = await boGetUserFlags(false);
  return res.items;
}
export async function boUpdateSignalement(id: string, data: any) {
  const action = (data?.action || 'rejeter') as FlagResolutionAction;
  return boResolveUserFlag(id, action, data?.resolutionNote);
}

// ── Notifications ─────────────────────────────────────────────
export async function boGetNotifications() {
  const res = await apiGet('/notifications');
  return res.data || res?.notifications || [];
}
// cache-bust

// ── Territoires (Villes > Communes > Marchés) ─────────────────
export async function boGetTerritoires() {
  const res = await apiGet('/zones/territoires');
  return Array.isArray(res) ? res : [];
}

// ── ADMIN WALLETS ──────────────────────────────────────────────────────────

export interface BOWallet {
  id: string;
  user_id: string;
  solde: number;
  solde_bloque: number;
  currency: string;
  created_at: string;
  updated_at: string;
  nom: string;
  prenoms: string;
  telephone: string;
  email: string;
  role: string;
}

export interface BOWalletTransaction {
  id: string;
  user_id: string;
  type: string;
  montant: number;
  description: string;
  statut: string;
  created_at: string;
  nom: string;
  prenoms: string;
  telephone: string;
}

export interface BOWalletStats {
  total_wallets: number;
  volume_total: number;
  volume_bloque: number;
  wallets_actifs: number;
  total_transactions: number;
  transactions_today: number;
  total_credits: number;
  total_debits: number;
  volume_credits: number;
  volume_debits: number;
}

export async function boGetWalletStats(): Promise<BOWalletStats> {
  return apiGet('/admin/wallets/stats');
}

export async function boGetAllWallets(page = 1, limit = 50, search = ''): Promise<{ wallets: BOWallet[]; total: number }> {
  return apiGet(`/admin/wallets?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
}

export async function boGetAllWalletTransactions(page = 1, limit = 50, type = ''): Promise<{ transactions: BOWalletTransaction[]; total: number }> {
  return apiGet(`/admin/wallets/transactions?page=${page}&limit=${limit}&type=${type}`);
}

export async function boGetUserWallet(userId: string): Promise<{ wallet: BOWallet; transactions: BOWalletTransaction[] }> {
  return apiGet(`/admin/wallets/${userId}`);
}

export async function boCreditWallet(userId: string, montant: number, description: string): Promise<void> {
  return apiPost(`/admin/wallets/${userId}/credit`, { montant, description });
}

export async function boDebitWallet(userId: string, montant: number, description: string): Promise<void> {
  return apiPost(`/admin/wallets/${userId}/debit`, { montant, description });
}

export async function boUpdateTransaction(id: string, data: { statut: string; motif?: string }): Promise<void> {
  const requiresMotif = ['gelee', 'annulee', 'litige'].includes(data.statut);
  const motif = requiresMotif && !data.motif ? 'Action backoffice BOSupervision' : data.motif;
  await boUpdateTransactionStatus(id, data.statut as TransactionStatusValue, motif);
}

export async function boPostAuditLog(entry: Record<string, unknown>): Promise<void> {
  try {
    await apiPost('/audit', entry);
  } catch (e) {
    console.warn('[BO] audit log failed:', e);
  }
}

export async function boImportActeursCsv(rows: Array<Record<string, string>>): Promise<{ success: number; errors: string[] }> {
  const results = { success: 0, errors: [] as string[] };
  for (const row of rows) {
    try {
      const phone = (row.telephone || row.phone || '').replace(/\D/g, '');
      const formatted = phone.startsWith('225') ? '+' + phone : phone.length === 10 ? '+225' + phone : '+' + phone;
      await apiPost('/auth/signup', {
        firstName: row.prenom || row.firstName || '',
        lastName: row.nom || row.lastName || '',
        phone: formatted,
        password: 'Julaba@' + phone.slice(-8) + '!',
        role: row.type || row.role || 'producteur',
        region: row.region || '',
      });
      results.success++;
    } catch (e: any) {
      results.errors.push(`Ligne ${results.success + results.errors.length + 2}: ${e.message}`);
    }
  }
  return results;
}

// ─── BO Profil ──────────────────────────────────────────────────────────────

/**
 * Upload de la photo de profil de l'utilisateur connecte.
 * Retourne l'URL de la photo enregistree.
 */
export async function uploadProfilePhoto(userId: string, file: File): Promise<{
  success: boolean;
  photoUrl: string;
  filename: string;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/users/${userId}/photo`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    // Ne pas mettre Content-Type: le navigateur le gere automatiquement avec boundary
  });

  return handleResponse<{ success: boolean; photoUrl: string; filename: string }>(res);
}

/**
 * Met a jour le profil de l'utilisateur (firstName, lastName, email, phone, etc.)
 */
export async function updateUserProfile(userId: string, data: {
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string;
  region?: string;
  commune?: string;
}): Promise<any> {
  const res = await fetch(`${API_URL}/users/${userId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
    credentials: 'include',
  });
  return handleResponse(res);
}

/**
 * Recupere les 10 dernieres sessions actives de l'utilisateur connecte.
 */
export async function getMySessions(): Promise<{
  sessions: Array<{
    id: string;
    deviceInfo: string;
    ipAddress: string;
    createdAt: string;
    expiresAt: string;
    isCurrent: boolean;
  }>;
}> {
  const res = await fetch(`${API_URL}/auth/sessions`, {
    headers: authHeaders(),
    credentials: 'include',
  });
  return handleResponse(res);
}

/**
 * Revoque une session specifique (deconnecte un appareil)
 */
export async function revokeSession(sessionId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/auth/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    credentials: 'include',
  });
  return handleResponse(res);
}

/**
 * Revoque toutes les sessions sauf la session courante.
 */
export async function revokeAllSessions(): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/auth/sessions`, {
    method: 'DELETE',
    headers: authHeaders(),
    credentials: 'include',
  });
  return handleResponse(res);
}

/**
 * Recupere les 10 derniers logs (audit_logs) de l'utilisateur connecte.
 */
export async function getMyLogs(limit = 10): Promise<{
  logs: Array<{
    id: string;
    action: string;
    entite: string;
    entite_id: string;
    ip: string;
    details: any;
    created_at: string;
  }>;
  total: number;
}> {
  const res = await fetch(`${API_URL}/audit/me?limit=${limit}`, {
    headers: authHeaders(),
    credentials: 'include',
  });
  return handleResponse(res);
}

/**
 * Met a jour les preferences (langue, theme, notifications) de l'utilisateur.
 */
export async function updateUserPreferences(prefs: {
  language?: 'fr' | 'en';
  theme?: 'light' | 'dark' | 'auto';
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}): Promise<{ success: boolean; preferences: Record<string, any> }> {
  const res = await fetch(`${API_URL}/auth/preferences`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(prefs),
    credentials: 'include',
  });
  return handleResponse(res);
}

