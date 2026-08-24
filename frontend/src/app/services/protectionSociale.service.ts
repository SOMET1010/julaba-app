// ── Socle « Protection sociale » (écart CDC 8.1.2 « Gestion sociale » + 9.1 CNPS/CNAM) ──
//
// OBJECTIF : préparer le SOCLE maintenant, alors que les API CNPS/CNAM ne sont
// pas encore disponibles. Toute la logique passe par UNE interface
// (SourceProtectionSociale). Le jour où l'API OFFICIELLE sera prête, on écrit
// un adaptateur SourceApiCnpsCnam qui implémente la même interface et on
// change UNE ligne (l'export `sourceProtectionSociale`). Aucun écran à
// réécrire.
//
// ⚠️ Rien ici n'invente de données officielles : ce sont les cotisations que la
// marchande SAISIT elle-même, en attendant la synchronisation avec la caisse
// (et, un jour, avec la vraie CNPS/CNAM).
//
// État de CE lot : les COTISATIONS sont désormais persistées côté backend
// Jùlaba (table `cotisations_sociales`, endpoints `/protection-sociale/cotisations`)
// — plus de localStorage pour elles, et le mode « keiwa » débite réellement
// le wallet de la marchande (cf. `ProtectionSocialeController`, backend). Les
// ADHÉSIONS et PRESTATIONS n'ont, elles, toujours aucune contrepartie
// officielle CNPS/CNAM à consulter : elles restent un suivi purement local en
// attendant cette intégration future (hors périmètre — l'API officielle
// n'existe pas). `enLigne` reste donc `false` : il désigne la synchronisation
// avec la vraie CNPS/CNAM, pas notre propre backend.

import { apiRequest } from './api/api-client';
import { API_URL } from '../utils/api';

export type Organisme = 'CNPS' | 'CNAM';

// Valeurs acceptées par le backend (`ProtectionSocialeController`).
export type ModePaiementBackend = 'especes' | 'keiwa' | 'mobile_money';

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
  // true si l'historique des cotisations n'a pas pu être chargé (réseau,
  // backend indisponible) — champ additif : les adhésions restent
  // consultables (elles sont locales), seul l'historique manque. Absent/false
  // = chargement réussi (y compris un historique réellement vide).
  cotisationsIndisponibles?: boolean;
}

/** Contrat commun. L'implémentation d'aujourd'hui (backend pour les
 *  cotisations, local pour le reste) et l'adaptateur API officiel de demain
 *  respectent exactement la même interface. */
export interface SourceProtectionSociale {
  readonly enLigne: boolean; // false = pas encore branché à la vraie API CNPS/CNAM
  charger(userId: string): Promise<EtatProtectionSociale>;
  definirAdhesion(userId: string, adhesion: Adhesion): Promise<void>;
  enregistrerCotisation(userId: string, cotisation: Omit<Cotisation, 'id'>): Promise<Cotisation>;
  /** @deprecated Les cotisations backend sont un journal append-only (Constitution
   *  §5) : aucune route de suppression n'existe. Rejette toujours. Conservée
   *  dans l'interface pour compatibilité avec un futur adaptateur API qui,
   *  lui, pourrait exposer une vraie annulation officielle. */
  supprimerCotisation(userId: string, id: string): Promise<void>;
}

// ── Persistance LOCALE des adhésions/prestations (pas de contrepartie backend
//    tant que l'API officielle CNPS/CNAM n'existe pas) ─────────────────────

const CLE_AUX = (userId: string) => `julaba_protection_sociale_aux_${userId || 'anon'}`;

interface EtatAuxiliaire {
  adhesions: Adhesion[];
  prestations: Prestation[];
}

function adhesionsVides(): Adhesion[] {
  return [
    { organisme: 'CNPS', numeroAssure: null, statut: 'non_enrole' },
    { organisme: 'CNAM', numeroAssure: null, statut: 'non_enrole' },
  ];
}

function lireAux(userId: string): EtatAuxiliaire {
  try {
    const raw = localStorage.getItem(CLE_AUX(userId));
    if (!raw) return { adhesions: adhesionsVides(), prestations: [] };
    const parsed = JSON.parse(raw) as Partial<EtatAuxiliaire>;
    // garantir la présence des deux organismes
    const base = adhesionsVides();
    const adhesions = base.map(
      (a) => parsed.adhesions?.find((x) => x.organisme === a.organisme) || a,
    );
    return {
      adhesions,
      prestations: Array.isArray(parsed.prestations) ? parsed.prestations : [],
    };
  } catch {
    return { adhesions: adhesionsVides(), prestations: [] };
  }
}

function ecrireAux(userId: string, etat: EtatAuxiliaire): void {
  try { localStorage.setItem(CLE_AUX(userId), JSON.stringify(etat)); } catch { /* ignore */ }
}

// ── Conversion mode de paiement : libellé affiché (écran) ↔ valeur backend ──

const LIBELLE_MODE_BACKEND: Record<ModePaiementBackend, string> = {
  especes: 'espèces',
  keiwa: 'keiwa',
  mobile_money: 'mobile money',
};

function versModeBackend(mode: string | undefined): ModePaiementBackend {
  const m = (mode || '').toLowerCase();
  if (m === 'keiwa') return 'keiwa';
  if (m.includes('mobile')) return 'mobile_money';
  return 'especes';
}

function mapCotisationDepuisApi(row: any): Cotisation {
  return {
    id: row.id,
    organisme: row.organisme,
    montant: Number(row.montant),
    periode: row.periode,
    datePaiement: row.datePaiement,
    mode: LIBELLE_MODE_BACKEND[row.mode as ModePaiementBackend] || row.mode,
  };
}

// ── Implémentation BACKEND (cotisations réelles) + LOCALE (adhésions/prestations) ──

class SourceCotisationsBackend implements SourceProtectionSociale {
  // Désigne la synchronisation avec la vraie CNPS/CNAM (n'existe pas encore),
  // pas notre propre backend : le bandeau « suivi personnel, synchronisation
  // officielle en attente » de l'écran reste donc affiché à raison.
  readonly enLigne = false;

  async charger(userId: string): Promise<EtatProtectionSociale> {
    const aux = lireAux(userId);
    let cotisations: Cotisation[] = [];
    let cotisationsIndisponibles = false;
    try {
      const r = await apiRequest<{ cotisations: any[] }>(API_URL, '/protection-sociale/cotisations', {
        method: 'GET',
      });
      cotisations = Array.isArray(r?.cotisations) ? r.cotisations.map(mapCotisationDepuisApi) : [];
    } catch {
      // L'écran doit rester consultable (adhésions locales, formulaire d'ajout)
      // même si le réseau ou le backend est momentanément indisponible —
      // jamais un crash. `cotisationsIndisponibles` permet à l'écran de le
      // signaler honnêtement plutôt que d'afficher un historique vide comme
      // si la marchande n'avait réellement rien cotisé.
      cotisations = [];
      cotisationsIndisponibles = true;
    }
    return { adhesions: aux.adhesions, cotisations, prestations: aux.prestations, cotisationsIndisponibles };
  }

  async definirAdhesion(userId: string, adhesion: Adhesion): Promise<void> {
    const aux = lireAux(userId);
    aux.adhesions = aux.adhesions.map((a) => (a.organisme === adhesion.organisme ? adhesion : a));
    ecrireAux(userId, aux);
  }

  /**
   * Enregistre un versement via le backend réel. Si `cotisation.mode` vaut
   * « keiwa », le contrôleur débite réellement le wallet de la marchande dans
   * la même transaction que la création — un solde insuffisant (ou un compte
   * bloqué) fait échouer l'appel (HttpError, statut 400) SANS rien créer :
   * l'appelant (écran) doit afficher `err.message` plutôt que planter.
   */
  async enregistrerCotisation(userId: string, cotisation: Omit<Cotisation, 'id'>): Promise<Cotisation> {
    const r = await apiRequest<{ cotisation: any }>(API_URL, '/protection-sociale/cotisations', {
      method: 'POST',
      body: JSON.stringify({
        organisme: cotisation.organisme,
        montant: cotisation.montant,
        periode: cotisation.periode,
        mode: versModeBackend(cotisation.mode),
      }),
    });
    const complete = mapCotisationDepuisApi(r.cotisation);

    // Une première cotisation fait passer l'adhésion à « en_cours » si non
    // enrôlée — même règle qu'avant, appliquée localement (l'adhésion n'a
    // toujours pas de contrepartie backend).
    const aux = lireAux(userId);
    aux.adhesions = aux.adhesions.map((a) =>
      a.organisme === cotisation.organisme && a.statut === 'non_enrole'
        ? { ...a, statut: 'en_cours', depuis: a.depuis || cotisation.datePaiement }
        : a,
    );
    ecrireAux(userId, aux);

    return complete;
  }

  async supprimerCotisation(): Promise<void> {
    // Le journal `cotisations_sociales` est APPEND-ONLY côté backend
    // (Constitution §5, même patron que `fidelite_evenements`) : aucune route
    // de suppression n'existe, et il ne doit pas en exister — un versement
    // « keiwa » a réellement débité le wallet, l'effacer sans annuler ce
    // débit tromperait la marchande sur son solde. L'écran ne propose plus
    // l'action de suppression (cf. ProtectionSociale.tsx).
    throw new Error("La suppression n'est pas possible : l'historique des cotisations est permanent.");
  }
}

// ── Adaptateur API CNPS/CNAM OFFICIEL (À BRANCHER quand les API existeront) ──
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
//   async supprimerCotisation(userId, id) { /* DELETE … (si l'organisme l'autorise) */ }
// }

/** Point d'injection unique. Aujourd'hui : cotisations backend Jùlaba +
 *  adhésions/prestations locales. Demain : adaptateur API CNPS/CNAM officiel. */
export const sourceProtectionSociale: SourceProtectionSociale = new SourceCotisationsBackend();

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
