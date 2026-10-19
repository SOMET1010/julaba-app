import { ConflictException } from '@nestjs/common';

// C-12 (19/10/2026) — Machine à états du statut d'un dossier d'identification.
//
// Valeurs de statut RÉELLES de la table `identifications` (entité
// identification.entity.ts : `statut varchar DEFAULT 'en_attente'`, et
// BaselineSchema : `statut character varying DEFAULT 'en_attente' NOT NULL` —
// AUCUNE contrainte SQL : c'est le serveur qui fait foi), telles qu'écrites ou
// lues par le code vivant :
//   brouillon   — POST /identifications/draft, GET /identifications/drafts/:id, DELETE draft
//   en_attente  — POST /identifications, POST /identifications/create-with-acteur, défaut de colonne
//   approuve    — PATCH par le BO (BOEnrolement.updateDossierStatut)
//   valide      — alias historique d'approbation, encore lu par la branche SMS
//                 (identifications.controller) : reconnu, mais plus produit
//   rejete      — PATCH par le BO, motif obligatoire (garde existante conservée)
//   complement  — PATCH par le BO « Demander complément »
//
// Variantes LEGACY ('validee', 'rejetee', 'en_cours' — écrites uniquement par
// l'ancienne route fantôme PATCH /dossiers/:id et lues par quelques agrégats
// admin) ne sont PAS dans la mappe : une ligne portant un de ces statuts est
// inconnue de la machine (409) jusqu'à régularisation — fail-closed assumé.
//
// Mappe de transitions (statut_actuel → statuts_cibles autorisés) :
//   brouillon  → ['en_attente']                                  (soumission du dossier)
//   en_attente → ['approuve', 'valide', 'rejete', 'complement']  (décision BO)
//   complement → ['en_attente']                                  (resoumission après complément :
//                                                                 exécutée par le SERVEUR pour le
//                                                                 propriétaire, ou par le BO)
//   rejete     → ['en_attente']                                  (réintroduction BO)
//   approuve   → []                                              (décision finale : pas de retour via PATCH)
//   valide     → []                                              (alias historique d'état final, idem)
//
// Qui mute : UNIQUEMENT un compte BO portant la permission serveur
// `enrolement.validate` (auth/bo-autorisation.ts — super_admin toujours ;
// admin_general / admin_national / gestionnaire_zone par défaut ;
// operateur_terrain et identificateur JAMAIS). Le propriétaire d'un dossier ne
// pose JAMAIS le statut lui-même : sa resoumission d'un dossier 'complement'
// est traduite par le serveur (complement → en_attente) et journalisée.

export const STATUTS_IDENTIFICATION = [
  'brouillon',
  'en_attente',
  'approuve',
  'valide',
  'rejete',
  'complement',
] as const;

export type StatutIdentification = (typeof STATUTS_IDENTIFICATION)[number];

export const TRANSITIONS_STATUT_AUTORISEES: Record<StatutIdentification, readonly string[]> = {
  brouillon: ['en_attente'],
  en_attente: ['approuve', 'valide', 'rejete', 'complement'],
  complement: ['en_attente'],
  rejete: ['en_attente'],
  approuve: [],
  valide: [],
};

/**
 * Vérifie une transition de statut (C-12) et lève une ConflictException (409)
 * si le statut actuel est inconnu de la machine ou si la cible n'est pas
 * autorisée. Réécrire la MÊME valeur est un no-op autorisé (idempotence des
 * clients) — l'appelant peut vérifier l'égalité avant d'appeler.
 */
export function exigerTransitionStatut(ancien: string, nouveau: string): void {
  if (ancien === nouveau) return;
  const cibles = (TRANSITIONS_STATUT_AUTORISEES as Record<string, readonly string[] | undefined>)[ancien];
  if (!cibles) {
    throw new ConflictException(
      `Statut de dossier inconnu (« ${ancien} ») : aucune transition autorisée depuis cet état. Le dossier doit être régularisé en base avant toute mutation de statut.`,
    );
  }
  if (!cibles.includes(nouveau)) {
    throw new ConflictException(
      `Transition de statut interdite : « ${ancien} » → « ${nouveau} ». Transitions autorisées depuis « ${ancien} » : ${
        cibles.length ? cibles.map((s) => `« ${s} »`).join(', ') : 'aucune (décision finale, irréversible via cette route)'
      }.`,
    );
  }
}
