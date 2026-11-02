/**
 * Rang 3 — LOT-MULTI-COMPTES (P1-AUTH-04) — LA VUE DU SÉLECTEUR DE COMPTES.
 *
 * LE DÉFAUT QU'ON FERME (audit voice-first 29/10, P1-AUTH-04) : « Téléphone
 * partagé : pas de "changer de compte" → chaque bascule = re-saisie du
 * numéro ». La liste « Tata se souvient de moi » (comptesMemorises) portait
 * déjà les comptes, mais l'écran n'en montrait qu'UN — le dernier. La
 * personne suivante tapait ses 10 chiffres à chaque fois : exactement la
 * tâche que la spec interdit de rendre à qui elle a déjà été oubliée une fois.
 *
 * LA CIBLE (docs/SPEC-AUTH-CIBLE.md §4.1) : « un sélecteur de compte local
 * DOIT permettre de basculer SANS re-saisir de numéro, chaque compte protégé
 * par sa PROPRE vérification (biométrie) ».
 *
 * Ce module est PUR (aucun React, aucun DOM) : il décide QUOI montrer et
 * OÙ chaque choix mène. L'écran (LoginPassword) reste l'ASSEMBLAGE ; la
 * décision reste testable au tsx comme comptesMemorises.
 *
 * CE QU'IL REFUSE DE SAVOIR : un numéro est un identifiant, jamais un secret —
 * mais ce module ne lit AUCUN jeton, AUCUN code. La liste qu'il reçoit vient
 * de comptesMemorises, qui n'a jamais porté de secret (garde test:comptes).
 */

import type { CompteMemorise } from './comptesMemorises.js';
import { MAX_COMPTES } from './comptesMemorises.js';
import { appellation } from '../utils/appellation.js';

/** Trois états possibles à l'ouverture de l'écran de connexion. */
export type ModeSelection = 'aucun' | 'unique' | 'selection';

export interface VueSelection {
  mode: ModeSelection;
  /** Les comptes à afficher, PLUS RÉCENT D'ABORD (ordre du stockage). */
  comptes: CompteMemorise[];
}

/**
 * La décision d'ouverture : que voit la personne quand elle allume Jùlaba ?
 *
 *  — 0 compte connu  : le parcours classique (saisie du numéro).
 *  — 1 compte connu  : comme hier — Tata l'accueille ELLE, sans liste
 *    (une liste pour une seule personne serait un écran de plus, pas une
 *    réponse de plus : elle se verrait proposer « son » compte ET un
 *    « autre compte », deux gestes pour un choix qui n'en est pas un).
 *  — 2 comptes et +  : LE SÉLECTEUR — les cartes, elle se reconnaît
 *    (photo + prénom + position), elle touche SON visage.
 */
export function vueSelection(comptes: readonly CompteMemorise[]): VueSelection {
  // Défensif : la borne du stockage (MAX_COMPTES à l'écriture) est réaffirmée
  // à la lecture — une enveloppe falsifiée ne peut pas faire déborder l'écran.
  const liste = comptes.slice(0, MAX_COMPTES);
  if (liste.length === 0) return { mode: 'aucun', comptes: [] };
  if (liste.length === 1) return { mode: 'unique', comptes: [liste[0]] };
  return { mode: 'selection', comptes: liste };
}

/**
 * Le nom AFFICHÉ sur la carte : ce qu'elle a demandé (appellation), sinon son
 * prénom. Même règle que la salutation — on ne déduit jamais un titre.
 */
export function nomAffiche(compte: CompteMemorise): string {
  return appellation(compte.appellation, compte.prenom);
}

/**
 * OÙ le toucher d'une carte mène (spec §4.1.1 : « chaque compte protégé par
 * sa PROPRE vérification ») :
 *  — compte reconnu une fois ici (biometrie) → la cérémonie biométrique,
 *    VERROUILLÉE sur SON compte — l'authentificateur ne peut répondre qu'avec
 *    SES credentials (allowCredentials scellés par numéro) : sur un téléphone
 *    partagé, le doigt d'une autre personne ne peut pas ouvrir SA carte ;
 *  — pas encore reconnue ici → son pavé de code, le numéro DÉJÀ posé par la
 *    carte : elle ne re-tape JAMAIS ses 10 chiffres.
 */
export function cibleApresChoix(compte: CompteMemorise): 'reconnaissance' | 'password' {
  return compte.biometrie ? 'reconnaissance' : 'password';
}
