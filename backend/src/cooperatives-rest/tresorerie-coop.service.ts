import { BadRequestException } from '@nestjs/common';

/**
 * TRESORERIE COOPERATIVE — règles d'argent partagées (chantier C-02).
 *
 * Corrections C-02 « l'argent de la coopérative est déclaratif » :
 *   - AUDIT-COMPTA-ACTEURS-2026-10-12.md §4 (chaîne D — NON PRÊT POUR DE
 *     L'ARGENT RÉEL, 40/100), §6 (C-02) et §8 reco 2 (« Comptabiliser la
 *     coopérative : cotisation transactionnelle + idempotente + statut
 *     en_attente ; clôture exigeant un mouvement wallet ou un statut distinct
 *     declare_paye ≠ paye ; trésorerie atomique avec plafond ») ;
 *   - AUDIT-ACTEUR-COOPERATEUR-2026-10-19.md §3 (C-02 / COOPERATEUR-07) et §6
 *     reco 1. Preuves relocalisées le 2026-10-19 : cotisation
 *     cooperatives-rest.controller.ts:836-855, clôture :807-819, trésorerie
 *     :226-257.
 *
 * Ce module porte les CONSTANTES et la VALIDATION pure. Il n'est PAS
 * @Injectable à dessein : l'orchestration transactionnelle reste dans
 * CooperativesRestController (DataSource.transaction + verrous pessimistes,
 * motif recopié de wallets.service.debitWallet/creditWallet et de
 * distribution()/apportStock() du même contrôleur), et le contrôleur est
 * instancié positionnellement dans test/unit/cooperatives-colonnes-reelles.spec.ts
 * (7 arguments) — un 8e paramètre DI casserait ce contrat de construction.
 */

/**
 * Plafond ABSOLU d'un mouvement de trésorerie coopérative, en FCFA.
 * Toute écriture sur `cooperative_transactions` (saisie président via
 * POST /tresorerie, cotisation via POST /cotisation, sortie « achat groupé »
 * d'une clôture de commande) doit satisfaire montant ≤ ce plafond.
 * Ordre de grandeur calé sur les volumes groupés réels (dizaines de membres ×
 * dizaines de milliers de FCFA) ; à ajuster en un seul endroit si besoin.
 */
export const TRESORERIE_PLAFOND_MOUVEMENT = 1_000_000;

/**
 * Plafond d'UNE cotisation (POST /cotisation). La cotisation usuelle est
 * 25 000 FCFA (cf. CooperativeContext.loadMembres `montantCotisation: 25000`)
 * : le plafond bloque les saisies absurdes/fautes de frappe, pas les usages.
 */
export const COTISATION_PLAFOND_MONTANT = 1_000_000;

/**
 * Valeurs de `commandes.mode_paiement` (varchar(50), BaselineSchema:309) qui
 * engagent la TRÉSORERIE de la coopérative. Une clôture de commande groupée
 * (POST /cooperatives/commandes/:id/cloture) ne peut marquer
 * `statut_paiement = 'paye'` que si le mode est l'un de ceux-ci ET qu'un
 * mouvement réel de sortie est écrit dans cooperative_transactions DANS LA
 * MÊME transaction SQL. Tout autre mode (ou mode absent) aboutit à
 * `declare_paye` — jamais `paye` sans argent.
 */
export const MODES_PAIEMENT_TRESORERIE: readonly string[] = [
  'tresorerie',
  'tresorerie_cooperative',
  'tresorerie-cooperative',
];

/** Statuts réels de `cooperative_transactions.statut` (CHECK en base,
 * migration 1781300000000). La colonne est un varchar + CHECK, PAS un enum
 * PG natif. */
export type StatutTresorerie = 'en_attente' | 'validee' | 'annulee';

/**
 * Validation serveur stricte d'un montant d'argent (C-02) : nombre fini
 * (rejette NaN, Infinity, chaînes non numériques), strictement positif,
 * arrondi au centime (colonne numeric(15,2)) et plafonné.
 *
 * Lève une BadRequestException (400) au premier manquement et renvoie le
 * montant assaini. Exception levée plutôt que résultat booléen : le tsconfig
 * backend compile avec strictNullChecks:false — le rétrécissement d'une union
 * discriminée n'y est pas fiable, et un montant invalide doit de toute façon
 * interrompre la requête AVANT toute écriture.
 */
export function exigerMontantArgentValide(brut: unknown, plafond: number): number {
  const montant = Number(brut);
  if (!Number.isFinite(montant)) throw new BadRequestException('Montant invalide');
  if (montant <= 0) throw new BadRequestException('Montant invalide (doit être supérieur à 0)');
  const montantArrondi = Math.round(montant * 100) / 100;
  if (montantArrondi > plafond) {
    throw new BadRequestException(`Montant dépasse le plafond autorisé (${plafond} FCFA)`);
  }
  return montantArrondi;
}
