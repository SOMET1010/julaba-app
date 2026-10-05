/**
 * LE STATUT D'UNE ÉCRITURE DE CAISSE — déclaré ICI, et ici seulement (OFF-01).
 *
 * POURQUOI UN MODULE À PART, et pas le contexte de caisse où il était né.
 * Le reçu (`utils/recu.utils.ts`) doit connaître ce statut pour dire
 * honnêtement à la cliente que la vente n'est pas encore partie. Faire
 * dépendre un util pur d'un module de contexte React y ferait entrer React,
 * les clients d'API et la file hors ligne — pour un type. Le type déménage
 * donc dans un module SANS dépendance ; le contexte de caisse le ré-exporte,
 * si bien qu'il n'existe toujours qu'UNE déclaration, sous UN nom.
 *
 * DEUX VALEURS, PAS TROIS. Ce qui compte pour la marchande n'est pas pourquoi
 * son écriture attend (téléphone sans réseau, ou envoi tombé alors que le
 * navigateur se croyait connecté), c'est QU'ELLE attend.
 *
 * CE QUI N'EST PAS UN STATUT : une erreur métier 4xx. Elle est levée — une
 * vente refusée n'est ni confirmée ni en attente.
 *
 * À NE PAS CONFONDRE avec le `statut` d'une transaction de caisse
 * (`validee` / `annulee` / `gelee` / `litige`), qui dit tout autre chose : le
 * sort COMPTABLE de la vente, pas son acheminement vers le serveur. Les deux
 * ne partagent ni nom de champ ni valeurs.
 */

/** Ce qu'une écriture de caisse est devenue, vue du téléphone. */
export type StatutEnregistrement = 'confirmee' | 'en_attente';

/** Le résultat d'une écriture de caisse depuis le téléphone. */
export interface ResultatEnregistrement {
  statut: StatutEnregistrement;
}

/** Les deux valeurs, à l'exécution — pour les garde-fous qui doivent les
 *  énumérer sans les recopier. */
export const STATUTS_ENREGISTREMENT: readonly StatutEnregistrement[] = ['confirmee', 'en_attente'];
