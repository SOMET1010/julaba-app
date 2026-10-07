/**
 * MODULES HORS PILOTE QUI PORTENT DE L'ARGENT — MASQUÉS, PAS SUPPRIMÉS.
 *
 * DÉCISION DE PATRICK, 07/10/2026 : « Masque les modules hors pilote qui
 * portent des actions d'argent, sans rien supprimer (drapeau ou garde de
 * route). Ne touche à aucun fichier du périmètre gelé de l'argent. »
 *
 * Elle tranche l'« À DÉFINIR » de `docs/pilote/GO-PILOTE-JULABA.md` (« Hors
 * pilote ne veut pas dire inoffensif ») : une marchande qui ouvre Keiwa, une
 * tontine ou le marché virtuel pendant deux semaines d'usage réel peut y
 * DÉBITER, CRÉDITER, TRANSFÉRER, PAYER ou COTISER — hors de la caisse, hors du
 * protocole, hors de toute garde du pilote.
 *
 * LE CRITÈRE, ET IL EST UNIQUE : un module est masqué s'il est hors pilote ET qu'un
 * de ses écrans peut faire bouger de l'argent (ou le déclarer payé). Les
 * écrans sans argent — caisse, ventes, stock, dépenses, clôture, et tout ce
 * qui, chez le producteur, la coopérative, l'identificateur ou le back-office,
 * ne fait que consulter ou tenir un registre — restent ouverts.
 *
 * UN SEUL DRAPEAU, LU À LA CONSTRUCTION : `VITE_JULABA_MODULES_HORS_PILOTE`.
 *   · absent, vide, `false`, n'importe quoi d'autre → MASQUÉ (le défaut) ;
 *   · exactement `true` → VISIBLE, pour un build de démonstration.
 * Le défaut est le côté sûr : l'APK (`.github/workflows/apk.yml`) et Render
 * (`render.yaml`, julaba-web) ne posent pas le drapeau, donc tout build livré
 * masque — sans qu'il faille se souvenir de rien. Rallumer exige un geste
 * explicite, sur un build explicite.
 *
 * DEUX EFFETS, UNE SEULE LISTE (`MODULES_HORS_PILOTE`) :
 *   1. la GARDE DE ROUTE (`RootLayout`) renvoie vers l'accueil du profil toute
 *      URL masquée — lien profond, notification, voix, bouton oublié : aucune
 *      porte dérobée, même depuis un fichier gelé qu'on n'a pas le droit
 *      d'éditer (UniversalProfil, TantieSagesseModal…) ;
 *   2. les MENUS et TUILES qu'on peut éditer retirent leurs entrées via
 *      `cheminMasque()` / `moduleVisible()`, pour qu'aucune porte ne mène à
 *      un rebond.
 * La garde est la ceinture, les menus sont les bretelles : la garde seule
 * suffit à la sûreté, les menus évitent un bouton qui « ne fait rien ».
 *
 * RIEN N'EST SUPPRIMÉ : les routes de `routes.tsx` sont toutes là, les écrans
 * aussi, le back aussi. Le jour où un module entre au pilote, on retire SA
 * ligne ici — et c'est tout.
 *
 * `test:modules-pilote` prouve les deux sens du drapeau.
 */

/** Le nom du drapeau, écrit une seule fois. */
export const DRAPEAU_MODULES_HORS_PILOTE = 'VITE_JULABA_MODULES_HORS_PILOTE';

export type ModuleHorsPilote =
  | 'keiwa'
  | 'tontines'
  | 'protection-sociale'
  | 'cotisation-cooperative'
  | 'commandes'
  | 'marche-virtuel'
  | 'paiement-public';

interface RegleMasque {
  module: ModuleHorsPilote;
  /** `prefixe` couvre la route ET ses sous-routes ; `exact` la seule route. */
  mode: 'prefixe' | 'exact';
  chemin: string;
}

/** Les profils qui portent les 6 routes Keiwa (routes.tsx) — tous, sans exception. */
const PROFILS_KEIWA = ['marchand', 'producteur', 'cooperative', 'institution', 'identificateur'] as const;

/**
 * LA LISTE — et le POURQUOI de chaque ligne, constaté dans le code le 07/10.
 */
export const MODULES_HORS_PILOTE: readonly RegleMasque[] = [
  // KEIWA — portefeuille : transfert, paiements, banque, carte. Débite et
  // crédite un wallet réel. « HORS PILOTE, contrainte permanente » (GO-PILOTE).
  // Le préfixe couvre `/keiwa` et ses 5 sous-routes, sur les 5 profils.
  ...PROFILS_KEIWA.map((p): RegleMasque => ({ module: 'keiwa', mode: 'prefixe', chemin: `/${p}/keiwa` })),
  // Le tableau de bord Keiwa du back-office CRÉDITE et DÉBITE des wallets à la
  // main (boCreditWallet / boDebitWallet). Le reste du back-office reste ouvert.
  { module: 'keiwa', mode: 'prefixe', chemin: '/backoffice/keiwa' },

  // TONTINES — « Cotiser » : épargne tournante en argent réel.
  { module: 'tontines', mode: 'prefixe', chemin: '/marchand/tontines' },

  // PROTECTION SOCIALE — « Enregistrer un versement » CNPS/CNAM, dont le mode
  // keiwa débite le wallet (le backend refuse sur solde insuffisant).
  { module: 'protection-sociale', mode: 'prefixe', chemin: '/marchand/protection-sociale' },

  // MA COOPÉRATIVE (marchand) — « Payer ma cotisation : 25 000 FCFA »
  // (POST /cooperatives/cotisation, qui la marque payée). EXACT, pas préfixe :
  // `/marchand/cooperative/besoin` (soumettre un besoin) ne porte aucun argent.
  { module: 'cotisation-cooperative', mode: 'exact', chemin: '/marchand/cooperative' },

  // COMMANDES (marchand, producteur, coopérative) — ReceptionPaiementModal et
  // « Récupérer keiwa » appellent POST /commandes/:id/paiement, qui fait
  // passer l'argent du wallet acheteur au wallet vendeur. Ce n'est PAS le
  // registre des crédits clientes de la caisse : celui-là vit dans
  // `ventes-passees` / `resume-caisse`, et reste ouvert.
  { module: 'commandes', mode: 'prefixe', chemin: '/marchand/commandes' },
  { module: 'commandes', mode: 'prefixe', chemin: '/producteur/commandes' },
  { module: 'commandes', mode: 'prefixe', chemin: '/cooperative/commandes' },

  // MARCHÉ VIRTUEL (marchand) — panier + « Mode de paiement » actif : keiwa
  // avec PIN contre le solde du wallet, mobile money, carte.
  { module: 'marche-virtuel', mode: 'prefixe', chemin: '/marchand/marche' },

  // PAIEMENT PUBLIC — `/pay/:marchandId` est le paiement par QR d'un client
  // vers le wallet d'une marchande ; `/pay/*` et `/paiement/*` en sont les
  // retours de prestataire. Hors session : renvoi vers `/`.
  { module: 'paiement-public', mode: 'prefixe', chemin: '/pay' },
  { module: 'paiement-public', mode: 'prefixe', chemin: '/paiement' },
];

/**
 * Lit le drapeau de construction. Vite remplace l'expression par un littéral
 * au build ; hors Vite (tsx, Node), `import.meta.env` n'existe pas — on retombe
 * alors sur l'environnement du processus, pour que le test puisse prouver les
 * DEUX sens du drapeau. Le `try` garantit qu'un import hors Vite ne jette pas.
 */
export function lireDrapeauModulesHorsPilote(): string | undefined {
  try {
    const v = import.meta.env.VITE_JULABA_MODULES_HORS_PILOTE;
    if (v !== undefined) return String(v);
  } catch {
    /* hors Vite : import.meta.env absent */
  }
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[DRAPEAU_MODULES_HORS_PILOTE];
}

/** `true` seulement si le drapeau vaut EXACTEMENT `true` : tout le reste masque. */
export function modulesHorsPiloteVisibles(drapeau: string | undefined = lireDrapeauModulesHorsPilote()): boolean {
  return drapeau === 'true';
}

/** Retire le `/` final et la query/le hash : `/marchand/keiwa/` ≡ `/marchand/keiwa`. */
function normaliser(chemin: string): string {
  const sansSuffixe = chemin.split(/[?#]/)[0] || '/';
  return sansSuffixe.length > 1 ? sansSuffixe.replace(/\/+$/, '') : sansSuffixe;
}

/** Le module masqué que touche ce chemin, ou `null`. */
export function moduleDuChemin(chemin: string): ModuleHorsPilote | null {
  const c = normaliser(chemin);
  for (const r of MODULES_HORS_PILOTE) {
    if (c === r.chemin) return r.module;
    if (r.mode === 'prefixe' && c.startsWith(r.chemin + '/')) return r.module;
  }
  return null;
}

/** Ce chemin est-il masqué dans CE build ? */
export function cheminMasque(chemin: string, visibles: boolean = modulesHorsPiloteVisibles()): boolean {
  return !visibles && moduleDuChemin(chemin) !== null;
}

/** Ce module est-il visible dans CE build ? (pour une tuile qui ne porte pas de chemin) */
export function moduleVisible(_module: ModuleHorsPilote, visibles: boolean = modulesHorsPiloteVisibles()): boolean {
  return visibles;
}

/**
 * L'accueil du profil d'un chemin : `/marchand/keiwa/carte` → `/marchand`.
 * Le back-office a son tableau de bord ; le paiement public, hors profil,
 * repart de la porte d'entrée unique `/` (EntryGate).
 */
export function accueilDuProfil(chemin: string): string {
  const premier = normaliser(chemin).split('/')[1] ?? '';
  if (premier === 'backoffice') return '/backoffice/dashboard';
  if (['marchand', 'producteur', 'cooperative', 'institution', 'identificateur'].includes(premier)) return `/${premier}`;
  return '/';
}

/**
 * LA GARDE : où renvoyer ce chemin, ou `null` s'il est ouvert. Pure — c'est
 * `RootLayout` qui en fait un `<Navigate replace>`.
 */
export function redirectionHorsPilote(chemin: string, visibles: boolean = modulesHorsPiloteVisibles()): string | null {
  return cheminMasque(chemin, visibles) ? accueilDuProfil(chemin) : null;
}

/** Retire d'une liste de menu les entrées dont le chemin est masqué. */
export function sansModulesMasques<T extends { path: string }>(items: T[], visibles: boolean = modulesHorsPiloteVisibles()): T[] {
  return items.filter((i) => !cheminMasque(i.path, visibles));
}
