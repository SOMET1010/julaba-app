// Registre unique des permissions back-office — SOURCE DE VERITE (donnee seulement).
//
// Structure alignee sur la maquette validee docs/maquette_matrice_permissions.html
// (TREE L206-257, CAPS L266-271, DEFAULTS L273-278, superOnly L250/254) et sur
// l'union reelle des cles relevee dans la cartographie :
//   - gates SIDEBAR_MENU       : BOLayout.tsx (L92-178)
//   - appels hasPermission     : ecrans BOxxx.tsx
//   - liste autorisee serveur  : BOUtilisateurs.tsx (L431-450) ~ users.controller.ts (L406-424)
//
// Les libelles francais reutilisent PERMISSION_LABELS de BOUtilisateurs.tsx (L74-100)
// quand ils existent. Le role super_admin n'est PAS dans ce registre : il dispose de
// tout par definition (cf. hasPermission BackOfficeContext.tsx:577).
//
// ETAPE A : ce fichier n'est branche nulle part. hasPermission, SIDEBAR_MENU et le
// dashboard restent inchanges. Le branchement viendra ensuite, ecran par ecran.

export type PermissionKind = 'view' | 'write' | 'danger';

export interface PermissionLeaf {
  key: string;
  label: string;
  kind: PermissionKind;
}

export interface PermissionGroup {
  name: string;
  perms: PermissionLeaf[];
}

export interface PermissionModule {
  id: string;
  label: string;
  icon?: string;
  superOnly: boolean;
  groups: PermissionGroup[];
}

// Les 4 roles BO reglables par la matrice (super_admin exclu).
export type BoRole =
  | 'admin_general'
  | 'admin_national'
  | 'gestionnaire_zone'
  | 'operateur_terrain';

// ── Arbre du registre : MODULE > GROUPE > FEUILLE ──────────────────────────────
export const BO_PERMISSION_TREE: PermissionModule[] = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: 'LayoutDashboard',
    superOnly: false,
    groups: [
      {
        name: 'Acces',
        perms: [
          { key: 'dashboard.read', label: 'Voir le tableau de bord', kind: 'view' },
        ],
      },
      {
        name: 'Cartes KPI',
        perms: [
          { key: 'dashboard.kpi.total_acteurs', label: 'KPI Total acteurs', kind: 'view' },
          { key: 'dashboard.kpi.actifs', label: 'KPI Acteurs actifs', kind: 'view' },
          { key: 'dashboard.kpi.volume', label: 'KPI Volume total', kind: 'view' },
          { key: 'dashboard.kpi.suspendus', label: 'KPI Suspendus', kind: 'view' },
          { key: 'dashboard.kpi.attente', label: 'KPI En attente', kind: 'view' },
          { key: 'dashboard.kpi.transactions', label: 'KPI Transactions', kind: 'view' },
          { key: 'dashboard.kpi.zones', label: 'KPI Zones actives', kind: 'view' },
        ],
      },
      {
        name: 'Panneaux',
        perms: [
          { key: 'dashboard.live', label: 'Bandeau En direct', kind: 'view' },
          { key: 'dashboard.inscriptions', label: 'Inscriptions mensuelles', kind: 'view' },
          { key: 'dashboard.repartition', label: 'Repartition par type', kind: 'view' },
          { key: 'dashboard.acces_rapide', label: 'Acces rapide', kind: 'view' },
          { key: 'dashboard.objectifs', label: 'Objectifs strategiques', kind: 'view' },
          { key: 'dashboard.activite_region', label: 'Activite par region', kind: 'view' },
          { key: 'dashboard.alertes', label: 'Alertes activees', kind: 'view' },
          { key: 'dashboard.perf_identificateurs', label: 'Performance des identificateurs', kind: 'view' },
          { key: 'dashboard.qualite_donnees', label: 'Qualite des donnees', kind: 'view' },
          { key: 'dashboard.activite_directe', label: 'Activite en direct', kind: 'view' },
          { key: 'dashboard.sante_systeme', label: 'Sante systeme', kind: 'view' },
        ],
      },
    ],
  },
  {
    id: 'acteurs',
    label: 'Acteurs',
    icon: 'Users',
    superOnly: false,
    groups: [
      {
        name: 'Actions',
        perms: [
          // Libelles repris de PERMISSION_LABELS (BOUtilisateurs.tsx:75-78).
          { key: 'acteurs.read', label: 'Voir acteurs', kind: 'view' },
          { key: 'acteurs.write', label: 'Modifier acteurs', kind: 'write' },
          { key: 'acteurs.suspend', label: 'Suspendre acteurs', kind: 'danger' },
          { key: 'acteurs.delete', label: 'Supprimer acteurs', kind: 'danger' },
        ],
      },
    ],
  },
  {
    id: 'enrolement',
    label: 'Enrolement',
    icon: 'UserPlus',
    superOnly: false,
    groups: [
      {
        name: 'Actions',
        perms: [
          { key: 'enrolement.read', label: "Voir l'enrolement", kind: 'view' },
          { key: 'enrolement.write', label: "Modifier l'enrolement", kind: 'write' },
          { key: 'enrolement.validate', label: 'Valider dossiers', kind: 'write' },
        ],
      },
    ],
  },
  {
    id: 'supervision',
    label: 'Supervision',
    icon: 'Eye',
    superOnly: false,
    groups: [
      {
        name: 'Actions',
        perms: [
          { key: 'supervision.read', label: 'Voir transactions', kind: 'view' },
          { key: 'supervision.write', label: 'Modifier transactions', kind: 'write' },
          { key: 'supervision.freeze', label: 'Geler transactions', kind: 'danger' },
        ],
      },
    ],
  },
  {
    id: 'zones',
    label: 'Zones et Territoires',
    icon: 'MapPin',
    superOnly: false,
    groups: [
      {
        name: 'Actions',
        perms: [
          { key: 'zones.read', label: 'Voir zones', kind: 'view' },
          { key: 'zones.write', label: 'Modifier zones', kind: 'write' },
        ],
      },
    ],
  },
  {
    id: 'moderation',
    label: 'Moderation',
    icon: 'ShieldAlert',
    superOnly: false,
    groups: [
      {
        name: 'Actions',
        perms: [
          { key: 'moderation.read', label: 'Voir la moderation', kind: 'view' },
          { key: 'moderation.write', label: 'Traiter un signalement', kind: 'write' },
        ],
      },
    ],
  },
  {
    id: 'mutations',
    label: 'Mutations',
    icon: 'ArrowLeftRight',
    superOnly: false,
    groups: [
      {
        name: 'Actions',
        perms: [
          { key: 'mutations.read', label: 'Voir les mutations', kind: 'view' },
          { key: 'mutations.write', label: "Decider d'une mutation", kind: 'write' },
        ],
      },
    ],
  },
  {
    id: 'academy',
    label: 'Academy',
    icon: 'BookOpen',
    superOnly: false,
    groups: [
      {
        name: 'Actions',
        perms: [
          { key: 'academy.read', label: 'Voir Academy', kind: 'view' },
          { key: 'academy.write', label: 'Gerer Academy', kind: 'write' },
        ],
      },
    ],
  },
  {
    id: 'missions',
    label: 'Missions',
    icon: 'Target',
    superOnly: false,
    groups: [
      {
        name: 'Actions',
        perms: [
          { key: 'missions.read', label: 'Voir missions', kind: 'view' },
          { key: 'missions.write', label: 'Gerer missions', kind: 'write' },
        ],
      },
    ],
  },
  {
    id: 'audit',
    label: 'Audit et Logs',
    icon: 'FileText',
    superOnly: false,
    groups: [
      {
        name: 'Actions',
        perms: [
          { key: 'audit.read', label: 'Voir Audit et Logs', kind: 'view' },
        ],
      },
    ],
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: 'ShoppingBag',
    superOnly: false,
    groups: [
      {
        name: 'Actions',
        perms: [
          { key: 'marketplace.read', label: 'Voir la marketplace', kind: 'view' },
          { key: 'marketplace.write', label: 'Gerer la marketplace', kind: 'write' },
        ],
      },
    ],
  },
  {
    id: 'livraison',
    label: 'Livraison',
    icon: 'Truck',
    superOnly: false,
    groups: [
      {
        name: 'Actions',
        perms: [
          { key: 'livraison.read', label: 'Voir les livraisons', kind: 'view' },
          { key: 'livraison.write', label: 'Gerer les livraisons', kind: 'write' },
        ],
      },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: 'Send',
    superOnly: false,
    groups: [
      {
        name: 'Actions',
        perms: [
          { key: 'communication.read', label: 'Voir la communication', kind: 'view' },
          { key: 'communication.write', label: 'Gerer la communication', kind: 'write' },
        ],
      },
    ],
  },
  {
    id: 'contenus',
    label: 'Contenus',
    icon: 'FileText',
    superOnly: false,
    groups: [
      {
        name: 'Actions',
        perms: [
          { key: 'contenus.read', label: 'Voir les contenus', kind: 'view' },
          { key: 'contenus.write', label: 'Gerer les contenus', kind: 'write' },
        ],
      },
    ],
  },
  {
    id: 'monitoring_ia',
    label: 'Monitoring IA',
    icon: 'Brain',
    superOnly: false,
    groups: [
      {
        name: 'Actions',
        perms: [
          { key: 'monitoring_ia.read', label: 'Voir le monitoring IA', kind: 'view' },
        ],
      },
    ],
  },
  {
    id: 'analytics_produit',
    label: 'Analytics produit',
    icon: 'TrendingUp',
    superOnly: false,
    groups: [
      {
        name: 'Actions',
        perms: [
          { key: 'analytics_produit.read', label: 'Voir les analytics produit', kind: 'view' },
        ],
      },
    ],
  },
  {
    id: 'cron',
    label: 'Taches planifiees',
    icon: 'Timer',
    superOnly: false,
    groups: [
      {
        name: 'Actions',
        perms: [
          { key: 'cron.read', label: 'Voir les taches planifiees', kind: 'view' },
        ],
      },
    ],
  },
  {
    id: 'commissions',
    label: 'Commissions',
    icon: 'Wallet',
    superOnly: false,
    groups: [
      {
        name: 'Actions',
        perms: [
          // Libelles repris de PERMISSION_LABELS (BOUtilisateurs.tsx:87-89).
          { key: 'commissions.read', label: 'Voir commissions', kind: 'view' },
          { key: 'commissions.write', label: 'Modifier commissions', kind: 'write' },
          { key: 'commissions.pay', label: 'Payer commissions', kind: 'danger' },
        ],
      },
    ],
  },
  {
    id: 'utilisateurs',
    label: 'Utilisateurs BO',
    icon: 'Shield',
    superOnly: true,
    groups: [
      {
        name: 'Actions',
        perms: [
          { key: 'utilisateurs.read', label: 'Voir utilisateurs BO', kind: 'view' },
          { key: 'utilisateurs.write', label: 'Creer utilisateurs BO', kind: 'write' },
          { key: 'utilisateurs.delete', label: 'Supprimer utilisateurs BO', kind: 'danger' },
        ],
      },
    ],
  },
  {
    id: 'parametres',
    label: 'Config Institution',
    icon: 'Settings',
    superOnly: true,
    groups: [
      {
        name: 'Actions',
        perms: [
          { key: 'parametres.read', label: 'Voir les parametres', kind: 'view' },
          { key: 'parametres.write', label: 'Modifier les parametres', kind: 'write' },
        ],
      },
    ],
  },
];

// ── Index derives de l'arbre ───────────────────────────────────────────────────
const ALL_KEYS: string[] = BO_PERMISSION_TREE.flatMap((mod) =>
  mod.groups.flatMap((grp) => grp.perms.map((leaf) => leaf.key)),
);
const ALL_KEYS_SET: ReadonlySet<string> = new Set(ALL_KEYS);
const SUPER_ONLY_KEYS: ReadonlySet<string> = new Set(
  BO_PERMISSION_TREE.filter((mod) => mod.superOnly).flatMap((mod) =>
    mod.groups.flatMap((grp) => grp.perms.map((leaf) => leaf.key)),
  ),
);

// ── Perimetres (CAPS) : capacites maximales activables par role ────────────────
// Sources : maquette CAPS (L266-270). Les sous-elements dashboard de la maquette
// (dashboard.kpi.acteurs) sont mappes sur la cle du registre dashboard.kpi.total_acteurs.
const GESTIONNAIRE_ZONE_SCOPE: ReadonlySet<string> = new Set<string>([
  'acteurs.read', 'acteurs.write',
  'enrolement.read', 'enrolement.write', 'enrolement.validate',
  'supervision.read',
  'zones.read',
  'moderation.read', 'moderation.write',
  'mutations.read', 'mutations.write',
  'audit.read',
  'academy.read',
  'dashboard.read',
  'dashboard.kpi.total_acteurs', 'dashboard.kpi.actifs', 'dashboard.kpi.attente', 'dashboard.kpi.zones',
  'dashboard.live', 'dashboard.inscriptions', 'dashboard.repartition', 'dashboard.acces_rapide',
]);
const OPERATEUR_TERRAIN_SCOPE: ReadonlySet<string> = new Set<string>([
  'acteurs.read', 'acteurs.write', 'acteurs.suspend',
  'enrolement.read', 'enrolement.validate',
  'supervision.read', 'supervision.write', 'supervision.freeze',
  'moderation.read', 'moderation.write',
  'mutations.read', 'mutations.write',
  'audit.read',
  'academy.read',
  'dashboard.read', 'dashboard.kpi.total_acteurs', 'dashboard.live',
]);

const ROLE_SCOPES: Record<BoRole, (key: string) => boolean> = {
  // Tout sauf les modules superOnly (utilisateurs.*, parametres.*).
  admin_general: (key) => !SUPER_ONLY_KEYS.has(key),
  // Comme admin_general, sans la suppression d'acteur.
  admin_national: (key) => !SUPER_ONLY_KEYS.has(key) && key !== 'acteurs.delete',
  gestionnaire_zone: (key) => GESTIONNAIRE_ZONE_SCOPE.has(key),
  operateur_terrain: (key) => OPERATEUR_TERRAIN_SCOPE.has(key),
};

// ── Droits par defaut (DEFAULTS) : pre-coches a l'ouverture (sous-ensemble du perimetre) ──
// Sources : maquette DEFAULTS (L273-277).
const GESTIONNAIRE_ZONE_DEFAULT: ReadonlySet<string> = new Set<string>([
  'acteurs.read',
  'enrolement.read', 'enrolement.validate',
  'supervision.read',
  'zones.read',
  'moderation.read',
  'mutations.read',
  'audit.read',
  'academy.read',
  'dashboard.read', 'dashboard.kpi.total_acteurs', 'dashboard.kpi.actifs', 'dashboard.live',
]);
const OPERATEUR_TERRAIN_DEFAULT: ReadonlySet<string> = new Set<string>([
  'acteurs.read',
  'enrolement.read', 'enrolement.validate',
  'supervision.read',
  'moderation.read',
  'audit.read',
  'dashboard.read', 'dashboard.kpi.total_acteurs',
]);

const ROLE_DEFAULTS: Record<BoRole, (key: string) => boolean> = {
  // admin_general : tout le perimetre pre-coche.
  admin_general: (key) => ROLE_SCOPES.admin_general(key),
  // admin_national : perimetre sauf les deux actions sensibles.
  admin_national: (key) =>
    ROLE_SCOPES.admin_national(key) &&
    key !== 'acteurs.suspend' &&
    key !== 'supervision.freeze',
  gestionnaire_zone: (key) => GESTIONNAIRE_ZONE_DEFAULT.has(key),
  operateur_terrain: (key) => OPERATEUR_TERRAIN_DEFAULT.has(key),
};

// ── Helpers purs (sans effet de bord) ──────────────────────────────────────────

/** Toutes les cles de permission du registre, dans l'ordre de l'arbre. */
export function allPermissionKeys(): string[] {
  return [...ALL_KEYS];
}

/** Vrai si la cle appartient a un module reserve au super_admin. */
export function isSuperOnly(key: string): boolean {
  return SUPER_ONLY_KEYS.has(key);
}

/** Vrai si la cle est dans le perimetre (capacites max) du role. */
export function roleCanHave(role: BoRole, key: string): boolean {
  if (!ALL_KEYS_SET.has(key)) return false;
  return ROLE_SCOPES[role](key);
}

/** Vrai si la cle est pre-cochee par defaut pour le role (toujours dans le perimetre). */
export function roleDefault(role: BoRole, key: string): boolean {
  if (!roleCanHave(role, key)) return false;
  return ROLE_DEFAULTS[role](key);
}

/**
 * Construit l'objet boPermissions par defaut d'un role : chaque cle du registre
 * recoit sa valeur par defaut (true si pre-cochee dans le perimetre, false sinon).
 */
export function buildDefaultPermissions(role: BoRole): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const key of ALL_KEYS) {
    result[key] = roleDefault(role, key);
  }
  return result;
}

// ── Coherence (verification a froid, non bloquante) ────────────────────────────
// Cles reellement utilisees aujourd'hui : gates SIDEBAR_MENU (BOLayout) + appels
// hasPermission (ecrans BOxxx). MISSING_REGISTRY_KEYS doit rester vide.
export const USED_KEYS_TODAY: string[] = [
  // SIDEBAR_MENU (BOLayout.tsx)
  'acteurs.read', 'enrolement.read', 'supervision.read', 'zones.read',
  'moderation.read', 'mutations.read', 'marketplace.read', 'livraison.read',
  'communication.read', 'contenus.read', 'utilisateurs.read', 'parametres.read',
  'audit.read', 'monitoring_ia.read', 'analytics_produit.read', 'academy.read',
  'missions.read', 'cron.read',
  // hasPermission (ecrans BOxxx)
  'acteurs.write', 'acteurs.suspend', 'enrolement.write', 'enrolement.validate',
  'zones.write', 'utilisateurs.write', 'utilisateurs.delete', 'mutations.write',
  'moderation.write', 'academy.write', 'missions.write', 'communication.write',
  'contenus.write', 'parametres.write',
];

/** Cles utilisees aujourd'hui mais absentes du registre (doit etre []). */
export const MISSING_REGISTRY_KEYS: string[] = USED_KEYS_TODAY.filter(
  (key) => !ALL_KEYS_SET.has(key),
);
