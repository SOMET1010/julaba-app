// AUTH-06 / ADR-002 (audit UI auth 05/10/2026) — le jeton ne se pose qu'en APK.
//
// LA DÉCISION (ADR-002, .ai/ADR/). Sur WEB, les cookies httpOnly posés par le
// backend (`access_token` 24 h, `refresh_token` 7 j) portent TOUTE la session :
// la stratégie JWT lit le cookie AVANT l'en-tête (`cookieOrBearer`), et le
// renouvellement passe par `refresh_token` que le JavaScript ne peut pas lire.
// Écrire les jetons dans localStorage côté web ne sert donc qu'à offrir le
// contenu de la session à n'importe quel XSS — surtout le refresh, 7 jours
// rejouables. Sur WEB cette fonction ne fait donc RIEN.
//
// Sur APK natif (Capacitor), la webview charge depuis un origine local : les
// cookies cross-domaine vers l'API sont bloqués. Les jetons doivent y vivre en
// localStorage et partir en `Authorization: Bearer` (l'intercepteur fetch de
// main.tsx et api-client les lit) — c'est la voie duelle assumée de l'ADR-002,
// et la rotation serveur y fournit le successeur dans le corps.
//
// CETTE FONCTION EST LE SEUL ENDROIT DU FRONTEND où ces deux clés s'écrivent :
// le garde `test:coffre-web` balaye les sources et refuse tout `setItem` hors
// de ce fichier. Les LECTURES restent réparties (api-client, main.tsx, purge
// clearAuthClientState) : elles servent à l'APK et tolèrent les jetons hérités
// des sessions web antérieures — lues sans réécriture, elles meurent à leur
// prochaine rotation.

const CLE_ACCES = 'julaba_access_token';
const CLE_RAFRAICHISSEMENT = 'julaba_refresh_token';

/** Vrai dans l'APK (Capacitor natif). En navigateur, Capacitor est absent → faux. */
export function estMobileNatif(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return typeof cap?.isNativePlatform === 'function' && cap.isNativePlatform() === true;
}

/**
 * Pose les jetons de session, MAIS SEULEMENT dans l'APK.
 * Sur web : no-op silencieux — les cookies httpOnly du backend portent la
 * session (ADR-002). Tolère l'absence de refresh (login par code, par ex.).
 */
export function stockerJetonsSiMobile(
  accessToken?: string | null,
  refreshToken?: string | null,
): void {
  if (!estMobileNatif()) return;
  try {
    if (accessToken) localStorage.setItem(CLE_ACCES, accessToken);
    if (refreshToken) localStorage.setItem(CLE_RAFRAICHISSEMENT, refreshToken);
  } catch { /* stockage indisponible (navigation privée) : l'APK n'y entre pas */ }
}
