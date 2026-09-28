// backoffice-api.ts — NestJS
import { API_URL } from '../utils/api';
// INIT-019 — convergence API : ce service passe par le client centralisé
// `apiRequest` (timeout 30s, mutex de refresh 401, HttpError typée) au lieu
// d'appeler `fetch()` en direct. Le jeton BO (sessionStorage) est réinjecté
// via l'en-tête Authorization par `boApiRequest` ci-dessous.
import { apiRequest as centralApiRequest } from './api/api-client';
import type { SousProfilMarchand } from '../types/sousProfilMarchand';

// julaba-web et julaba-api sont sur des DOMAINES différents (Render V2) : le
// cookie de session cross-domaine (SameSite=None) est bloqué par défaut par
// plusieurs navigateurs (Safari ITP, Chrome/Firefox en mode protection stricte),
// même correctement configuré côté serveur. Le backend renvoie donc AUSSI le
// jeton dans le corps de la réponse de login précisément pour ce cas — mais
// rien côté frontend ne le stockait ni ne l'envoyait en en-tête Authorization
// (authHeaders() ne renvoyait jamais que Content-Type). Résultat concret :
// un login réussi (le corps de la réponse suffit à afficher l'écran suivant)
// pouvait être suivi d'un 401 générique sur le premier appel authentifié
// (ex. /auth/change-password), à tort affiché comme "mot de passe incorrect".
const BO_TOKEN_KEY = 'julaba:bo:access-token';

export function setBoAccessToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(BO_TOKEN_KEY, token);
    else sessionStorage.removeItem(BO_TOKEN_KEY);
  } catch {
    /* stockage indisponible */
  }
}

export function getBoAccessToken(): string | null {
  try {
    return sessionStorage.getItem(BO_TOKEN_KEY);
  } catch {
    return null;
  }
}

function authHeaders(): HeadersInit {
  const token = getBoAccessToken();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
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

/**
 * Porte unique vers le client API centralisé : ajoute l'en-tête Authorization
 * BO (sessionStorage) puis délègue à `centralApiRequest` qui gère le timeout,
 * le mutex de rafraîchissement 401 et la sérialisation JSON.
 */
async function boApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getBoAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return centralApiRequest<T>(API_URL, endpoint, { ...options, headers });
}

async function apiGet(path: string): Promise<any> {
  return boApiRequest<any>(path);
}

async function apiPost(path: string, body?: any) {
  return boApiRequest<any>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function apiPatch(path: string, body?: any) {
  return boApiRequest<any>(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function apiPut(path: string, body?: any) {
  return boApiRequest<any>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function apiDelete(path: string) {
  return boApiRequest<any>(path, { method: 'DELETE' });
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

  // INIT-019 — fetch() légitime : login BO avec gestion d'erreur spéciale
  // (attemptsRemaining, httpStatus, message du corps sur 4xx). `centralApiRequest`
  // lèverait une HttpError générique et perdrait ces informations utilisées par
  // l'écran de login pour afficher « il reste N tentatives ».
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
  setBoAccessToken(data.accessToken ?? null);
  return { accessToken: data.accessToken, user: data.user };
}

export async function boGetMe(): Promise<BOUser> {
  return boApiRequest<BOUser>('/auth/me');
}

export async function boGetContactsRecoveryBo(signal?: AbortSignal): Promise<{
  contacts: Array<{ id: string; firstName: string; lastName: string; phone: string }>;
}> {
  // INIT-019 — endpoint public (pas d'en-tête Authorization) : on appelle
  // directement `centralApiRequest` sans la wrapper BO.
  return centralApiRequest<{ contacts: Array<{ id: string; firstName: string; lastName: string; phone: string }> }>(
    API_URL,
    '/auth/contacts-recovery-bo',
    { signal },
  );
}

export async function boWebAuthnAuthenticateOptions(phone: string, signal?: AbortSignal): Promise<Record<string, unknown> & { userId?: string; error?: string }> {
  // INIT-019 — fetch() légitime : la réponse est lue même sur !res.ok pour
  // extraire `error` (champ métier WebAuthn). `centralApiRequest` jette sur
  // !res.ok et perdrait ce champ.
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
  // INIT-019 — fetch() légitime : renvoie un payload `{ verified, error }` même
  // sur !res.ok (échec biométrique attendu, pas une exception).
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
  /** Photo de profil (URL) — affichée dans la barre BO. */
  photo_url?: string;
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
  // Variantes lues par BONotifications (optionnelles).
  utilisateurBO?: string;
  acteurImpacte?: string;
  module?: string;
  date?: string;
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
  modules?: Record<string, 'lecture' | 'ecriture' | 'complet' | 'admin_general' | 'aucun'>;
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
  region?: string;
  statut?: string;
}): Promise<{ data: Acteur[]; total: number; page: number; limit: number }> {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.search) q.set('search', params.search);
  if (params?.role && params.role !== 'all') q.set('role', params.role);
  if (params?.region && params.region !== 'all') q.set('region', params.region);
  if (params?.statut && params.statut !== 'all') q.set('statut', params.statut);

  let raw: any;
  try {
    raw = await boApiRequest<any>(`/users?${q}`);
  } catch (err) {
    console.error('[boGetActeurs] HTTP error:', err);
    throw err;
  }

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
  try {
    const counts = await boApiRequest<Partial<RoleCounts>>('/users/counts-by-role', { signal });
    const normalized = normalizeRoleCounts(counts);
    roleCountsCache = normalized;
    roleCountsCacheAt = Date.now();
    return normalized;
  } catch {
    return DEFAULT_ROLE_COUNTS;
  }
}

export async function boGetActeurCounts(signal?: AbortSignal, force = false): Promise<RoleCounts> {
  const isCacheFresh = roleCountsCache && Date.now() - roleCountsCacheAt < ROLE_COUNTS_CACHE_MS;
  if (!force && isCacheFresh && roleCountsCache) return roleCountsCache;
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
  const u = await boApiRequest<Record<string, any>>(`/users/${id}`);
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
    // Le backend renvoie des variantes partielles selon les routes.
  } as unknown as Acteur;
}

export async function boCreateActeur(data: Partial<Acteur> & { password: string }): Promise<Acteur> {
  return boApiRequest<Acteur>('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function boUpdateActeur(id: string, data: Partial<Acteur>): Promise<Acteur> {
  return boApiRequest<Acteur>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function boChangeSousProfilMarchand(
  id: string,
  sousProfilMarchand: 'grossiste' | 'demi_grossiste' | 'detaillant',
  motif?: string,
): Promise<{ id: string; sousProfilMarchand: string; message: string }> {
  return boApiRequest<{ id: string; sousProfilMarchand: string; message: string }>(`/users/${id}/sous-profil`, {
    method: 'PATCH',
    body: JSON.stringify({ sousProfilMarchand, motif: motif || undefined }),
  });
}

export async function boToggleActeur(id: string, is_active: boolean): Promise<Acteur> {
  return boUpdateActeur(id, { is_active });
}

export async function boDeleteActeur(id: string): Promise<void> {
  await boApiRequest<unknown>(`/users/${id}`, { method: 'DELETE' });
}

export async function boSoftDeleteActeur(id: string): Promise<{ success: boolean }> {
  // INIT-019 — `centralApiRequest` applique déjà un timeout 30s ; on garde un
  // AbortController de 20s pour conserver le message historique en cas de coupure.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const data = await boApiRequest<Partial<{ success: boolean }>>(`/users/${id}`, {
      method: 'DELETE',
      signal: controller.signal,
    });
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
    const raw = await boApiRequest<any>(`/transactions/all?${q}`);
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
  return boApiRequest<{ id: string; statut: TransactionStatusValue; motif: string | null }>(`/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ statut, motif }),
  });
}

export async function boExportTransactions(
  format: 'csv' | 'xlsx' | 'pdf',
  filters?: { date_from?: string; date_to?: string; statut?: string; region?: string },
): Promise<Blob> {
  // INIT-019 — fetch() légitime : la réponse est un Blob binaire (xlsx/pdf/csv),
  // pas du JSON. `centralApiRequest` ferait `.json()` et échouerait.
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
  const params = new URLSearchParams();
  if (filters?.date_from) params.set('date_from', filters.date_from);
  if (filters?.date_to) params.set('date_to', filters.date_to);
  const qs = params.toString();
  return boApiRequest<TransactionsGeoAggregationItem[]>(`/transactions/geo-aggregation${qs ? `?${qs}` : ''}`, { signal });
}

export async function boGetTransactionsByActeurGeo(
  filters?: { date_from?: string; date_to?: string },
  signal?: AbortSignal,
): Promise<TransactionsActeurGeoItem[]> {
  const params = new URLSearchParams();
  if (filters?.date_from) params.set('date_from', filters.date_from);
  if (filters?.date_to) params.set('date_to', filters.date_to);
  const qs = params.toString();
  return boApiRequest<TransactionsActeurGeoItem[]>(`/transactions/by-acteur-geo${qs ? `?${qs}` : ''}`, { signal });
}

export async function boGetCooperatives(): Promise<Cooperative[]> {
  try {
    const data = await boApiRequest<any>('/institutions');
    return data.institutions || data.data || data || [];
  } catch {
    return [];
  }
}

export async function boGetCooperative(id: string): Promise<Cooperative> {
  return boApiRequest<Cooperative>(`/institutions/${id}`);
}

export async function boCreateCooperative(data: Partial<Cooperative>): Promise<Cooperative> {
  return boApiRequest<Cooperative>('/institutions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function boUpdateCooperative(id: string, data: Partial<Cooperative>): Promise<Cooperative> {
  return boApiRequest<Cooperative>(`/institutions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function boGetDashboard(): Promise<DashboardStats> {
  try {
    const data = await boApiRequest<any>('/users');
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
        .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0),
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
    return await boApiRequest<any>('/rapport/rapports');
  } catch { return { rapports: [], total: 0 }; }
}

export async function boGetModeration() {
  try {
    return await boApiRequest<any>('/rapport/moderation');
  } catch { return { signalements: [], total: 0 }; }
}

export async function boGetLivraison() {
  try {
    return await boApiRequest<any>('/commandes');
  } catch { return { livraisons: [], total: 0 }; }
}

export async function boGetCommunication() {
  try {
    return await boApiRequest<any>('/notifications');
  } catch { return { messages: [], campagnes: [] }; }
}

export async function boGetCron() {
  try {
    return await boApiRequest<any>('/rapport/cron');
  } catch { return { jobs: [] }; }
}

export async function boGetAnalytics() {
  try {
    return await boApiRequest<any>('/rapport/analytics');
  } catch { return { total_users: 0, by_role: [], daily_active: [], funnel: [] }; }
}

export async function boGetMonitoring() {
  try {
    return await boApiRequest<any>('/rapport/monitoring');
  } catch { return { services: [] }; }
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
export async function boGetMarches(opts?: { zoneId?: string; region?: string; actif?: boolean; statut?: string }): Promise<any[]> {
  const params = new URLSearchParams();
  if (opts?.zoneId) params.set('zoneId', opts.zoneId);
  if (opts?.region) params.set('region', opts.region);
  if (opts?.actif !== undefined) params.set('actif', String(opts.actif));
  if (opts?.statut) params.set('statut', opts.statut);
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
    statut: string;
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
  return boApiRequest<BoCreateAdminResult>('/users/admin', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function boGetAdminsEnAttente(signal?: AbortSignal): Promise<AdminEnAttente[]> {
  return boApiRequest<AdminEnAttente[]>('/users/admin/pending', { signal });
}

export async function boValidateAdmin(userId: string): Promise<BoCreateAdminResult> {
  return boApiRequest<BoCreateAdminResult>(`/users/admin/${userId}/validate`, { method: 'POST' });
}

export async function boRejectAdmin(userId: string, motif: string): Promise<BoCreateAdminResult> {
  return boApiRequest<BoCreateAdminResult>(`/users/admin/${userId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ motif }),
  });
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
  // P0.0 (ADR-002) : présent pour tout acteur non-admin (marchand, producteur,
  // cooperateur, institution, identificateur) — le compte naît en_attente_activation
  // et ce code, à usage unique et expirant (30 min), est LA seule façon de
  // l'activer. Résiduel accepté par l'ADR : l'admin BO le voit à l'écran pour le
  // transmettre à l'acteur, comme l'identificateur sur le chemin create-with-acteur.
  activationCode?: string;
}

export async function boCreateBackofficeUser(
  payload: CreateBackofficeUserPayload,
  signal?: AbortSignal,
): Promise<CreateBackofficeUserResult> {
  return boApiRequest<CreateBackofficeUserResult>('/users/backoffice/create', {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
  });
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
    return await boApiRequest<{ count: number; groups: DuplicateGroup[] }>('/users/duplicates');
  } catch {
    return { count: 0, groups: [] };
  }
}

export async function boGetUserFlags(
  resolvedOrFilters?: boolean | { resolved?: boolean },
  signal?: AbortSignal,
): Promise<{ count: number; items: UserFlagItem[] }> {
  const resolved = typeof resolvedOrFilters === 'boolean' ? resolvedOrFilters : resolvedOrFilters?.resolved;
  const params = new URLSearchParams();
  if (resolved !== undefined) params.set('resolved', String(resolved));
  const qs = params.toString();
  return boApiRequest<{ count: number; items: UserFlagItem[] }>(`/users/flags${qs ? `?${qs}` : ''}`, { signal });
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
  return boApiRequest<{ id: string; flagType: string; raison: string; createdAt: string }>('/users/flags', {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
  });
}

export async function boResolveUserFlag(
  flagId: string,
  action: FlagResolutionAction,
  resolutionNote?: string,
): Promise<{ id: string; resolved: true; action: string }> {
  return boApiRequest<{ id: string; resolved: true; action: string }>(`/users/flags/${flagId}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ action, resolutionNote }),
  });
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

  // INIT-019 — FormData : `centralApiRequest` détecte `instanceof FormData`
  // et omet Content-Type (le navigateur pose le boundary multipart).
  return boApiRequest<{ success: boolean; photoUrl: string; filename: string }>(`/users/${userId}/photo`, {
    method: 'POST',
    body: formData,
  });
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
  return boApiRequest<any>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
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
  return boApiRequest<{ sessions: Array<{ id: string; deviceInfo: string; ipAddress: string; createdAt: string; expiresAt: string; isCurrent: boolean; }> }>('/auth/sessions');
}

/**
 * Revoque une session specifique (deconnecte un appareil)
 */
export async function revokeSession(sessionId: string): Promise<{ success: boolean }> {
  return boApiRequest<{ success: boolean }>(`/auth/sessions/${sessionId}`, { method: 'DELETE' });
}

/**
 * Revoque toutes les sessions sauf la session courante.
 */
export async function revokeAllSessions(): Promise<{ success: boolean }> {
  return boApiRequest<{ success: boolean }>('/auth/sessions', { method: 'DELETE' });
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
  return boApiRequest<{ logs: Array<{ id: string; action: string; entite: string; entite_id: string; ip: string; details: any; created_at: string; }>; total: number }>(`/audit/me?limit=${limit}`);
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
  return boApiRequest<{ success: boolean; preferences: Record<string, any> }>('/auth/preferences', {
    method: 'PATCH',
    body: JSON.stringify(prefs),
  });
}


// ── INIT-019 — admin/wallets/config (BOParametres) ─────────────────────────
// Migration des 4 fetch() directs de BOParametres.tsx vers le client centralisé.

export async function boGetWalletsConfigParametres(): Promise<Record<string, string>> {
  const cfg = await apiGet('/admin/wallets/config/parametres');
  return cfg && typeof cfg === 'object' ? cfg as Record<string, string> : {};
}

export async function boGetAdminMonitoring(): Promise<Record<string, any>> {
  try {
    const monitoring = await apiGet('/admin/monitoring');
    return monitoring && typeof monitoring === 'object' ? monitoring as Record<string, any> : {};
  } catch {
    return {};
  }
}

export async function boPutWalletsConfigParametres(payload: Record<string, string>): Promise<boolean> {
  await apiPut('/admin/wallets/config/parametres', payload);
  return true;
}

export async function boResetWalletsConfigParametres(section: string): Promise<void> {
  await apiPost(`/admin/wallets/config/parametres/reset?section=${encodeURIComponent(section)}`, {});
}

// ── INIT-019 — admin/stats brut + admin/analytics (BORapports) ──────────────
export async function boGetAdminStatsRaw(): Promise<any> {
  try {
    return await apiGet('/admin/stats');
  } catch (e) {
    console.error('[BORapports stats]', e);
    return null;
  }
}

export async function boGetAdminAnalytics(): Promise<any> {
  try {
    return await apiGet('/admin/analytics');
  } catch (e) {
    console.error('[BORapports analytics]', e);
    return null;
  }
}
