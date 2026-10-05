// AUTH-07 (audit UI auth 05/10/2026) — outils anti-énumération côté serveur.
//
// LE CONSTAT. L'audit UI auth a laissé deux dettes serveur, écrites en clair
// dans l'écran de connexion (LoginPassword.tsx, bloc « BACKLOG ESCALATION P0
// BACKEND ») :
//   1. /auth/check-phone répond « existe / n'existe pas » — c'est le parcours
//      produit (le numéro inconnu a son écran /non-enregistre), mais la DURÉE
//      de la réponse ne doit rien apprendre à qui sonde la route ;
//   2. les numéros de recette ANSUT (TEST_PHONES) sont actifs en production
//      (décision métier) : leurs accès doivent se voir JOURNALISÉS côté
//      serveur, numéro masqué — on doit pouvoir les compter.
//
// CE FICHIER PORTE LES DEUX OUTILS, pour que ni l'un ni l'autre ne soit
// réimplémenté au coup par coup dans un service.

// ── 1. Numéros de recette ANSUT ────────────────────────────────────────────
// MIROIR de la liste frontend (LoginPassword.tsx). MAINTENIR LES DEUX LISTES
// À JOUR si ANSUT/DGE ajoute des comptes test. Format : 10 chiffres locaux,
// sans le préfixe pays (+225). Ces numéros n'appartiennent pas aux opérateurs
// ivoiriens standards (01/05/07/09/21/25/27) — c'est pourquoi le frontend les
// excepte de sa regex de préfixe.
const TELEPHONES_TEST = new Set<string>([
  '0840404040', // Anvo KOBENAN (test ANSUT)
  '0850505050', // Zadi MIAN (test ANSUT)
  '0860606060', // Adele EHUI (test ANSUT)
  '0820202020', // Yves KOUKOUGNON (test ANSUT)
  '2100000000', // Compte institutionnel ANSUT
  '2200000000', // Compte institutionnel DGE
]);

/** `+2250840404040`, `0840404040`, `+225 08 40 40 40 40` → vrai si recette ANSUT. */
export function estTelephoneTest(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const chiffres = String(phone).replace(/\D/g, '');
  // On compare sur les 10 chiffres LOCAUX, préfixe pays présent ou non.
  const local = chiffres.length >= 10 ? chiffres.slice(-10) : chiffres;
  return TELEPHONES_TEST.has(local);
}

// ── 2. Échéance de réponse uniforme ────────────────────────────────────────
// La route répond TOUJOURS à une échéance choisie AVANT de connaître le
// résultat : un plancher fixe + une gigue tirée au sort. La durée mesurée
// depuis l'extérieur ne dépend plus du contenu de la réponse — ni du hit DB,
// ni d'un chemin d'erreur précoce (un appel malformé attend aussi).
//
// La gigue est tirée INDÉPENDAMMENT du résultat : ses deux distributions sont
// identiques côté « existe » et côté « inconnu », donc moyenner des sondes
// n'apprend rien. Valeurs : un plancher bien au-dessus du pire findOne local
// (mesures dev : < 20 ms), une gigue qui rend les durées non singées.
const PLANCHER_MS = 300;
const GIGUE_MS = 80;

/**
 * Retient le DÉBUT du traitement (`const debut = Date.now()`), fait le
 * travail, puis appelle ceci juste avant de retourner la réponse.
 */
export async function repondreAEcheanceUniforme(debut: number): Promise<void> {
  const echeance = debut + PLANCHER_MS + Math.floor(Math.random() * GIGUE_MS);
  const reste = echeance - Date.now();
  if (reste > 0) await new Promise((resoudre) => setTimeout(resoudre, reste));
}
