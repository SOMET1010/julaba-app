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
// AUTORITÉ (AUTH-07-sous-dette, 05/10/2026) : la liste qui fait FOI est la
// variable d'environnement AUTH_TELEPHONES_TEST du backend — 10 chiffres
// locaux (sans le préfixe +225), séparés par virgule, espace ou point-virgule.
// C'est elle qu'on tient à jour quand ANSUT/DGE ajoute des comptes test : la
// journalisation suit l'environnement sans toucher au code, et la liste peut
// différer entre dev, recette et prod.
// Le Set ci-dessous n'est que le REPLI de développement (aucun .env chargé) :
// sans lui, démarrer à vide ferait taire la journalisation au lieu de l'échouer.
// MIROIR frontend : LoginPassword.tsx (MAINTENIR À DEUX MAINS — la garde
// test:enum-check-phone refuse toute divergence, et refuse aussi un .env de
// dev divergent du miroir).
const TELEPHONES_TEST_CODE = new Set<string>([
  '0840404040', // Anvo KOBENAN (test ANSUT)
  '0850505050', // Zadi MIAN (test ANSUT)
  '0860606060', // Adele EHUI (test ANSUT)
  '0820202020', // Yves KOUKOUGNON (test ANSUT)
  '2100000000', // Compte institutionnel ANSUT
  '2200000000', // Compte institutionnel DGE
]);

/**
 * Charge la liste autoritaire de l'environnement.
 * `AUTH_TELEPHONES_TEST` présente ET valide (au moins un numéro à 10 chiffres
 * après nettoyage) → elle fait foi (`source: 'env'`). Sinon → repli code.
 */
export function chargerTelephonesTest(): { liste: Set<string>; source: 'env' | 'code' } {
  const brute = (process.env.AUTH_TELEPHONES_TEST || '').trim();
  if (brute) {
    const items = brute
      .split(/[;,\s]+/)
      .map((morceau) => morceau.replace(/\D/g, ''))
      .filter((morceau) => morceau.length === 10);
    if (items.length > 0) return { liste: new Set(items), source: 'env' };
  }
  return { liste: new Set(TELEPHONES_TEST_CODE), source: 'code' };
}

const CHARGE: { liste: Set<string>; source: 'env' | 'code' } = { liste: new Set(TELEPHONES_TEST_CODE), source: 'code' };
let charge = false;

// LECTURE PARESSEUSE, VOLONTAIRE : la première interrogation peut venir du
// module d'auth AVANT que ConfigModule n'ait chargé le .env (dotenv tourne à
// l'initialisation d'AppModule). On lit donc l'ENV au PREMIER USAGE — un appel
// réel, ou le journal de démarrage — jamais à l'import du fichier.
function chargeeSiBesoin(): { liste: Set<string>; source: 'env' | 'code' } {
  if (!charge) {
    charge = true;
    const c = chargerTelephonesTest();
    CHARGE.liste = c.liste;
    CHARGE.source = c.source;
  }
  return CHARGE;
}

/** D'où vient la liste active : 'env' (autoritaire) ou 'code' (repli dev). */
export function sourceListeTelephonesTest(): 'env' | 'code' {
  return chargeeSiBesoin().source;
}

/** Taille de la liste active — pour le journal de démarrage, sans citer les numéros. */
export function tailleListeTelephonesTest(): number {
  return chargeeSiBesoin().liste.size;
}

/** `+2250840404040`, `0840404040`, `+225 08 40 40 40 40` → vrai si recette ANSUT. */
export function estTelephoneTest(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const chiffres = String(phone).replace(/\D/g, '');
  // On compare sur les 10 chiffres LOCAUX, préfixe pays présent ou non.
  const local = chiffres.length >= 10 ? chiffres.slice(-10) : chiffres;
  return chargeeSiBesoin().liste.has(local);
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
// Tirage via node:crypto (randomInt), PAS Math.random — deux raisons :
//   1. la règle SEC-07 (garde pin-jamais-rendu) interdit tout générateur non
//      cryptographique dans les modules sensibles, sans exception à arbitrer ;
//   2. le PRNG de V8 partage un état entre toutes les requêtes du processus —
//      un attaquant qui sonde la route pourrait théoriquement corréler ses
//      propres durées avec celles des autres. Un CSPRNG coupe court à toute
//      cette classe de soucis, pour le même coût.
import { randomInt } from 'node:crypto';

const PLANCHER_MS = 300;
const GIGUE_MS = 80;

/**
 * Retient le DÉBUT du traitement (`const debut = Date.now()`), fait le
 * travail, puis appelle ceci juste avant de retourner la réponse.
 */
export async function repondreAEcheanceUniforme(debut: number): Promise<void> {
  // randomInt(max) → entier uniforme dans [0, max), comme le tirage précédent.
  const echeance = debut + PLANCHER_MS + randomInt(GIGUE_MS);
  const reste = echeance - Date.now();
  if (reste > 0) await new Promise((resoudre) => setTimeout(resoudre, reste));
}
