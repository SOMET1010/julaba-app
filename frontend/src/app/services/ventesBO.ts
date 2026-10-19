/**
 * LES VENTES QUE LE BACK-OFFICE A LE DROIT DE COMPTER — démo 12/10/2026.
 *
 * LES DÉFAUTS (Rapports, Supervision) :
 *   · « Volume » = somme de la PAGE reçue (50 lignes au plus) qui mêle ventes,
 *     dépenses et ventes annulées, avec `t.montant || t.amount || 0` : un
 *     montant illisible devenait zéro, une dépense devenait du chiffre d'affaires ;
 *   · « Commissions » = montant × 3 %, ou `tx.commission` (champ inexistant) :
 *     aucune commission n'existe côté backend. Inventé, donc retiré.
 *
 * LA RÈGLE (même définition que le backend, `commun/vente-de-caisse.ts`) :
 * une vente retenue est une ligne `type = 'vente'` non annulée. Le volume d'un
 * écran vient du résumé calculé par le serveur sur TOUT le filtre
 * (`resume.volume_ventes` de GET /transactions/all) ; `null` = un montant est
 * illisible → « Indisponible », jamais 0. Une série recalculée côté front n'est
 * mesurée que si la page contient TOUTES les lignes ; sinon « non mesuré ».
 *
 * MODULE PUR : ni React, ni appel réseau.
 */
import type { AffichageKpi, EtatLecture } from './etatLectureBO';

export const MOT_NON_MESURE = 'non mesuré';

/** Montant lu ; illisible (absent, vide, non numérique) → `null`, jamais 0. */
export function montantLisible(brut: unknown): number | null {
  if (brut === null || brut === undefined) return null;
  if (typeof brut === 'string' && brut.trim() === '') return null;
  const n = typeof brut === 'number' ? brut : Number(brut);
  return Number.isFinite(n) ? n : null;
}

export interface LigneVente {
  readonly type?: unknown;
  readonly statut?: unknown;
  readonly status?: unknown;
  readonly montant?: unknown;
  readonly amount?: unknown;
}

export function estVenteRetenue(t: LigneVente): boolean {
  const statut = String(t.statut ?? t.status ?? '').toLowerCase();
  return String(t.type ?? '').toLowerCase() === 'vente' && statut !== 'annulee';
}

/** Somme des ventes retenues ; `null` dès qu'un de leurs montants est illisible. */
export function volumeDesVentes(lignes: readonly LigneVente[]): number | null {
  let total = 0;
  for (const t of lignes.filter(estVenteRetenue)) {
    const m = montantLisible(t.montant ?? t.amount);
    if (m === null) return null;
    total += m;
  }
  return total;
}

export interface ResumeVentes {
  readonly nombre_ventes: number;
  readonly volume_ventes: number | null;
  readonly montants_illisibles: number;
}

/** Le `resume` de GET /transactions/all, ou `null` s'il manque ou est malformé. */
export function lireResumeVentes(brut: unknown): ResumeVentes | null {
  if (typeof brut !== 'object' || brut === null) return null;
  const r = brut as Record<string, unknown>;
  const nombre = r.nombre_ventes;
  const illisibles = r.montants_illisibles;
  if (!Number.isInteger(nombre) || !Number.isInteger(illisibles)) return null;
  const volume = r.volume_ventes === null ? null : montantLisible(r.volume_ventes);
  if (r.volume_ventes !== null && volume === null) return null;
  return { nombre_ventes: nombre as number, volume_ventes: volume, montants_illisibles: illisibles as number };
}

/** Ce que la tuile « Volume » affiche, depuis le résumé du serveur. */
export function kpiVolumeVentes(resume: ResumeVentes | null): AffichageKpi {
  if (resume === null) return { type: 'indisponible', raison: 'résumé des ventes absent de la réponse' };
  if (resume.volume_ventes === null) {
    return { type: 'indisponible', raison: `${resume.montants_illisibles} montant(s) de vente illisible(s)` };
  }
  return { type: 'nombre', valeur: resume.volume_ventes };
}

/** La même tuile, depuis l'état de la lecture (attente / échec / lue). */
export function kpiVolumeDepuisLecture(etat: EtatLecture<ResumeVentes | null>): AffichageKpi {
  if (etat.type === 'attente') return { type: 'chargement' };
  if (etat.type === 'indisponible') return { type: 'indisponible', raison: etat.raison };
  return kpiVolumeVentes(etat.valeur);
}

/** Un montant écrit : « 1 500 FCFA », ou « illisible » — jamais « 0 FCFA » (ACC-03). */
export function texteMontant(brut: unknown): string {
  const m = montantLisible(brut);
  return m === null ? 'illisible' : `${m.toLocaleString('fr-FR')} FCFA`;
}
