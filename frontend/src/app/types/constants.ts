// ============================================================
// JULABA — Constantes métier centralisées v3
// Source de vérité unique — NE PAS DUPLIQUER CES VALEURS
// ============================================================

// ── Rôles UI (valeurs utilisées PARTOUT dans le frontend) ────
// DB/Backend = cooperateur → normalisé en cooperative côté UI
export enum UserRoleUI {
  MARCHAND       = 'marchand',
  PRODUCTEUR     = 'producteur',
  COOPERATIVE    = 'cooperative',   // UI = cooperative (DB = cooperateur)
  INSTITUTION    = 'institution',
  IDENTIFICATEUR = 'identificateur',
  CONSOMMATEUR   = 'consommateur',
  SUPER_ADMIN    = 'super_admin',
}

// ── Rôles DB/Backend (valeurs stockées en DB et dans le JWT) ─
// NE PAS utiliser directement dans le frontend sauf dans normalizeRole
export enum UserRoleDB {
  COOPERATEUR = 'cooperateur',  // valeur DB officielle
}

// ── Mapping centralisé (UNIQUE POINT D'ENTRÉE) ───────────────
// À appeler UNIQUEMENT dans AppContext lors de la réception des données API
// ❌ Interdit ailleurs : if (role === 'cooperateur') ou if (role === 'cooperative')
// ✅ Autorisé ailleurs : role === UserRoleUI.COOPERATIVE
export function normalizeRole(role: string | undefined | null): UserRoleUI {
  if (!role) return UserRoleUI.MARCHAND;
  if (role === UserRoleDB.COOPERATEUR) return UserRoleUI.COOPERATIVE;
  return role as UserRoleUI;
}

// ── Helper de compatibilité (pour isCooperatif existant) ─────
// DEPRECATED — utiliser UserRoleUI.COOPERATIVE à la place
export function isCooperatif(role: string | undefined): boolean {
  return normalizeRole(role) === UserRoleUI.COOPERATIVE;
}

// ── Types de transactions ─────────────────────────────────────
export enum TxType {
  VENTE             = 'vente',
  DEPENSE           = 'depense',
  RECOLTE           = 'recolte',
  APPROVISIONNEMENT = 'approvisionnement',
}

// ── Sources de transactions ───────────────────────────────────
export enum TxSource {
  KASSA = 'kassa',
  VOCAL = 'vocal',
}

// ── Types de vendeurs marketplace ────────────────────────────
export enum SellerType {
  PRODUCTEUR  = 'producteur',
  COOPERATIVE = 'cooperative',
}

// ── Onglets marketplace ───────────────────────────────────────
export enum MarcheTab {
  PRODUCTEURS  = 'producteurs',
  COOPERATIVES = 'cooperatives',
  HISTORIQUE   = 'historique',
}

// ── Filtres source ventes ─────────────────────────────────────
export enum SourceFilter {
  TOUS  = 'tous',
  VOCAL = 'vocal',
  KASSA = 'kassa',
}

// ── Routes par rôle UI ────────────────────────────────────────
export const ROLE_ROUTES: Record<string, string> = {
  [UserRoleUI.MARCHAND]:       '/marchand',
  [UserRoleUI.PRODUCTEUR]:     '/producteur',
  [UserRoleUI.COOPERATIVE]:    '/cooperative',
  [UserRoleUI.INSTITUTION]:    '/institution',
  [UserRoleUI.IDENTIFICATEUR]: '/identificateur',
  [UserRoleUI.CONSOMMATEUR]:   '/consommateur',
  // Rôles BackOffice : tous redirigent vers le dashboard admin
  [UserRoleUI.SUPER_ADMIN]:    '/backoffice/dashboard',
  'admin':                     '/backoffice/dashboard',
  'admin_national':            '/backoffice/dashboard',
  'gestionnaire_zone':         '/backoffice/dashboard',
  'operateur_terrain':                  '/backoffice/dashboard',
};

// ── Rôles autorisés sur le BackOffice (validation cross-module) ──
// Source unique de vérité pour les checks "user.role autorisé /backoffice"
// Utilisé par : BOLogin, EntryGate, LoginPassword, ChangePasswordScreen
export const BO_ROLES: readonly string[] = [
  'admin',
  'admin_general',
  'super_admin',
  'admin_national',
  'gestionnaire_zone',
  'operateur_terrain',
] as const;

export function isBORole(role: string | undefined | null): boolean {
  if (!role) return false;
  return BO_ROLES.includes(role);
}

// ── Type guard rôle connu (sans toucher normalizeRole pour compat) ──
// Permet aux composants de vérifier explicitement la validité d'un rôle
// avant navigation (anti-état zombie post-auth)
export function isKnownRole(role: string | undefined | null): boolean {
  if (!role) return false;
  const normalized = normalizeRole(role);
  return Object.values(UserRoleUI).includes(normalized) || BO_ROLES.includes(role);
}

// ── Garde de route (AppLayout) : rôle primaire + cumul coopérative ──
// ROLE_ROUTES ne connaît qu'UN préfixe par rôle primaire. Or un utilisateur
// peut CUMULER un rôle primaire (ex: marchand) et une adhésion à une
// coopérative (User.estMembreCooperative) — cf. backend
// resolveUserCooperative() dans cooperatives-rest.controller.ts, qui
// autorise déjà TOUT membre (pas seulement le président/rôle "cooperative")
// à consulter et alimenter le Stock commun (GET/POST /cooperatives/stock*).
// Sans cette liste, un marchand-membre légitime tapant /cooperative/stock
// se faisait renvoyer silencieusement vers /marchand par la garde
// mono-rôle — le défaut corrigé ici.
// N'ajouter une route ici que si le backend l'autorise réellement à un
// simple membre (pas au seul responsable) : ne pas ouvrir tout /cooperative.
const CROSS_ROLE_ROUTES: ReadonlyArray<{ role: UserRoleUI; prefix: string }> = [
  { role: UserRoleUI.MARCHAND, prefix: '/cooperative/stock' },
];

export interface RouteAccessResult {
  allowed: boolean;
  /** Préfixe "maison" du rôle primaire — cible de redirection si refusé. */
  allowedPrefix: string;
  /**
   * true quand le refus est dû à une absence de lien coopérative sur une
   * route en cumul de rôle : refus légitime (pas un bug), à signaler
   * clairement à l'utilisateur plutôt que de rediriger en silence.
   */
  deniedForMissingCooperative: boolean;
}

export function checkRouteAccess(
  role: string | undefined | null,
  pathname: string,
  estMembreCooperative?: boolean,
): RouteAccessResult {
  const normalizedRole = normalizeRole(role);
  const allowedPrefix = ROLE_ROUTES[normalizedRole] || '/';

  if (pathname.startsWith(allowedPrefix)) {
    return { allowed: true, allowedPrefix, deniedForMissingCooperative: false };
  }

  const isBackoffice = pathname.startsWith('/backoffice') || pathname.startsWith('/admin');
  if (isBackoffice && !!role && ['super_admin', 'admin', 'admin_national'].includes(role)) {
    return { allowed: true, allowedPrefix, deniedForMissingCooperative: false };
  }

  const crossRoleMatch = CROSS_ROLE_ROUTES.find(
    (r) => r.role === normalizedRole && pathname.startsWith(r.prefix),
  );
  if (crossRoleMatch) {
    if (estMembreCooperative) {
      return { allowed: true, allowedPrefix, deniedForMissingCooperative: false };
    }
    return { allowed: false, allowedPrefix, deniedForMissingCooperative: true };
  }

  return { allowed: false, allowedPrefix, deniedForMissingCooperative: false };
}
