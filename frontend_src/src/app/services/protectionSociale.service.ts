// ── Socle « Protection sociale » (écart CDC 8.1.2 « Gestion sociale » + 9.1 CNPS/CNAM) ──
//
// OBJECTIF : préparer le SOCLE maintenant, alors que les API CNPS/CNAM ne sont
// pas encore disponibles. Toute la logique passe par UNE interface
// (SourceProtectionSociale). Aujourd'hui l'implémentation est LOCALE
// (localStorage) ; le jour où l'API sera prête, on écrit un adaptateur
// SourceApiCnpsCnam qui implémente la même interface et on change UNE ligne
// (l'export `sourceProtectionSociale`). Aucun écran à réécrire.
//
// ⚠️ Rien ici n'invente de données officielles : ce sont les cotisations que la
// marchande SAISIT elle-même, en attendant la synchronisation avec la caisse.

export type Organisme = 'CNPS' | 'CNAM';

export interface Adhesion {
  organisme: Organisme;
  numeroAssure: string | null;   // numéro d'assuré (saisi ou renvoyé par l'API plus tard)
  statut: 'non_enrole' | 'en_cours' | 'actif';
  depuis?: string | null;        // date d'adhésion (ISO)
  cotisationMensuelle?: number | null; // montant de référence si connu
}

export interface Cotisation {
  id: string;
  organisme: Organisme;
  montant: number;
  periode: string;               // « 2026-07 » (mois couvert)
  datePaiement: string;          // ISO
  mode?: string;                 // espèces, keiwa, mobile money…
  reference?: string | null;     // référence de reçu / transaction
  synchronise?: boolean;         // true une fois remonté à l'organisme (futur)
}

export interface Prestation {
  id: string;
  organisme: Organisme;
  libelle: string;               // « Consultation », « Pension retraite »…
  date: string;                  // ISO
  montant?: number | null;
  statut?: string;               // remboursée, en cours…
}

export interface EtatProtectionSociale {
  adhesions: Adhesion[];
  cotisations: Cotisation[];
  prestations: Prestation[];
}

/** Contrat commun. L'implémentation locale d'aujourd'hui et l'adaptateur API de
 *  demain respectent exactement la même interface. */
export interface SourceProtectionSociale {
  readonly enLigne: boolean; // false = socle local (pas encore branché à l'API)
  charger(userId: string): Promise<EtatProtectionSociale>;
  definirAdhesion(userId: string, adhesion: Adhesion): Promise<void>;
  enregistrerCotisation(userId: string, cotisation: Omit<Cotisation, 'id'>): Promise<Cotisation>;
  supprimerCotisation(userId: string, id: string): Promise<void>;
}

// ── Implémentation LOCALE (interim, avant l'API) ────────────────────────────

const CLE = (userId: string) => `julaba_protection_sociale_${userId || 'anon'}`;

function etatVide(): EtatProtectionSociale {
  return {
    adhesions: [
      { organisme: 'CNPS', numeroAssure: null, statut: 'non_enrole' },
      { organisme: 'CNAM', numeroAssure: null, statut: 'non_enrole' },
    ],
    cotisations: [],
    prestations: [],
  };
}

function lire(userId: string): EtatProtectionSociale {
  try {
    const raw = localStorage.getItem(CLE(userId));
    if (!raw) return etatVide();
    const parsed = JSON.parse(raw) as EtatProtectionSociale;
    // garantir la présence des deux organismes
    const base = etatVide();
    const adhesions = base.adhesions.map(
      (a) => parsed.adhesions?.find((x) => x.organisme === a.organisme) || a,
    );
    return {
      adhesions,
      cotisations: Array.isArray(parsed.cotisations) ? parsed.cotisations : [],
      prestations: Array.isArray(parsed.prestations) ? parsed.prestations : [],
    };
  } catch {
    return etatVide();
  }
}

function ecrire(userId: string, etat: EtatProtectionSociale): void {
  try { localStorage.setItem(CLE(userId), JSON.stringify(etat)); } catch { /* ignore */ }
}

// identifiant local sans dépendance (Date.now/Math.random interdits côté workflow,
// mais ici on est dans le navigateur : crypto.randomUUID si dispo, sinon repli).
function nouvelId(): string {
  try {
    const c = (globalThis as any).crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch { /* ignore */ }
  return `cot_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

class SourceLocale implements SourceProtectionSociale {
  readonly enLigne = false;

  async charger(userId: string): Promise<EtatProtectionSociale> {
    return lire(userId);
  }

  async definirAdhesion(userId: string, adhesion: Adhesion): Promise<void> {
    const etat = lire(userId);
    etat.adhesions = etat.adhesions.map((a) => (a.organisme === adhesion.organisme ? adhesion : a));
    ecrire(userId, etat);
  }

  async enregistrerCotisation(userId: string, cotisation: Omit<Cotisation, 'id'>): Promise<Cotisation> {
    const etat = lire(userId);
    const complete: Cotisation = { ...cotisation, id: nouvelId(), synchronise: false };
    etat.cotisations = [complete, ...etat.cotisations];
    // Une première cotisation fait passer l'adhésion à « en_cours » si non enrôlée
    etat.adhesions = etat.adhesions.map((a) =>
      a.organisme === cotisation.organisme && a.statut === 'non_enrole'
        ? { ...a, statut: 'en_cours', depuis: a.depuis || cotisation.datePaiement }
        : a,
    );
    ecrire(userId, etat);
    return complete;
  }

  async supprimerCotisation(userId: string, id: string): Promise<void> {
    const etat = lire(userId);
    etat.cotisations = etat.cotisations.filter((c) => c.id !== id);
    ecrire(userId, etat);
  }
}

// ── Adaptateur API CNPS/CNAM (À BRANCHER quand les API seront disponibles) ───
//
// Quand la DGE fournira les endpoints + la convention, implémenter cette classe
// (mêmes méthodes) et remplacer l'export ci-dessous par :
//   export const sourceProtectionSociale = new SourceApiCnpsCnam(baseUrl, token);
// Les écrans n'ont AUCUN changement à subir.
//
// export class SourceApiCnpsCnam implements SourceProtectionSociale {
//   readonly enLigne = true;
//   constructor(private baseUrl: string, private token: string) {}
//   async charger(userId) { /* GET /cnps|cnam/assures/:id … */ }
//   async definirAdhesion(userId, adhesion) { /* POST … */ }
//   async enregistrerCotisation(userId, cotisation) { /* POST … */ }
//   async supprimerCotisation(userId, id) { /* DELETE … */ }
// }

/** Point d'injection unique. Aujourd'hui : socle local. Demain : adaptateur API. */
export const sourceProtectionSociale: SourceProtectionSociale = new SourceLocale();

// ── Helpers d'agrégation (utilisés par l'écran) ─────────────────────────────

export function totalCotise(cotisations: Cotisation[], organisme?: Organisme): number {
  return cotisations
    .filter((c) => !organisme || c.organisme === organisme)
    .reduce((s, c) => s + (Number(c.montant) || 0), 0);
}

export function derniereCotisation(cotisations: Cotisation[], organisme: Organisme): Cotisation | null {
  const list = cotisations
    .filter((c) => c.organisme === organisme)
    .sort((a, b) => (a.datePaiement < b.datePaiement ? 1 : -1));
  return list[0] || null;
}

/** Périodes (mois) non couvertes depuis l'adhésion → base des rappels d'échéance. */
export function moisEnRetard(adhesion: Adhesion, cotisations: Cotisation[], aujourdhui = new Date()): number {
  if (!adhesion.depuis) return 0;
  const debut = new Date(adhesion.depuis);
  if (isNaN(debut.getTime())) return 0;
  const moisEcoules =
    (aujourdhui.getFullYear() - debut.getFullYear()) * 12 +
    (aujourdhui.getMonth() - debut.getMonth()) + 1;
  const couverts = new Set(
    cotisations.filter((c) => c.organisme === adhesion.organisme).map((c) => c.periode),
  ).size;
  return Math.max(0, moisEcoules - couverts);
}

export const LIBELLE_ORGANISME: Record<Organisme, { nom: string; sousTitre: string }> = {
  CNPS: { nom: 'CNPS', sousTitre: 'Retraite & prévoyance' },
  CNAM: { nom: 'CNAM', sousTitre: 'Assurance maladie' },
};
