/**
 * CANAL MÉMOIRE ONE-SHOT — le code de connexion qui vient d'ouvrir la session
 * (AUTH-02, audit UI auth 05/10/2026).
 *
 * LE DÉFAUT QU'ON FERME. L'écran de connexion passait le code à l'écran
 * « changement de mot de passe » par `navigate('/change-password', { state: {
 * codeActuel: pwd } })`. React Router persiste `state` dans
 * `window.history.state` : le code secret y SURVIT au rechargement, lisible
 * par quiconque ouvre la console sur le téléphone laissé au comptoir.
 * L'intention produit reste bonne — lui redemander « ton mot de passe actuel »
 * cinq secondes après qu'elle l'a tapé n'ajoute aucune sécurité (la session
 * est déjà ouverte) et bloque net quelqu'un qui ne lit pas. C'est le CANAL
 * qui était en cause, pas l'intention.
 *
 * LE CANAL MEMOIRE. Une variable de module JavaScript : elle vit le temps de
 * la navigation SPA (l'écran suivant la lit au montage), meurt au
 * rechargement — exactement le périmètre du geste « elle vient de taper son
 * code » — et ne touche JAMAIS localStorage, sessionStorage, l'URL ni
 * history.state. Consommation ONE-SHOT : la lecture efface. Une seconde
 * navigation vers /change-password ne retrouve pas un vieux code.
 *
 * FRAÎCHEUR. Par excès de soin, un dépôt non lu s'efface lui-même après 60 s :
 * un code déposé mais jamais consommé n'attend pas indéfiniment en RAM.
 *
 * CE MODULE EST PUR. Ni React, ni DOM, ni stockage — la garde
 * `scripts/test-canal-code.mjs` l'empêche d'en acquérir.
 */

/** Durée de vie d'un dépôt non consommé. */
const DUREE_VIE_MS = 60_000;

let code: string | null = null;
let deposeA = 0;

/**
 * Dépose le code qui vient d'ouvrir la session, à appeler JUSTE AVANT la
 * navigation vers /change-password. Ne remplace pas un dépôt plus récent.
 */
export function deposerCodeActuel(valeur: string): void {
  if (!valeur) return;
  code = valeur;
  deposeA = Date.now();
}

/**
 * Lit le code déposé par l'écran de connexion (une seule fois) — `''` si
 * rien n'a été déposé, si le dépôt a expiré, ou s'il a déjà été consommé.
 */
export function lireCodeActuel(): string {
  if (!code) return '';
  if (Date.now() - deposeA > DUREE_VIE_MS) {
    code = null;
    return '';
  }
  const lu = code;
  code = null; // ONE-SHOT : lu une fois, il n'existe plus.
  return lu;
}

/** Efface tout dépôt en cours (déconnexion, navigation inattendue…). */
export function effacerCodeActuel(): void {
  code = null;
}
