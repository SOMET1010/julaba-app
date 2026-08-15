// Configuration `trust proxy` (Express) — pilotée par l'env, DÉSACTIVÉE par défaut.
//
// Voir docs/AUDIT_THROTTLING.md § trust proxy. Sans ce réglage, `req.ip` = pair TCP
// immédiat = routeur Render (partagé) → le rate-limiter par IP est partagé entre
// utilisateurs. L'activer fait pointer `req.ip` sur le vrai client (via
// X-Forwarded-For), à condition d'avoir le BON nombre de sauts : trop permissif
// (`true`) = un client peut usurper `X-Forwarded-For` et contourner la limite.
//
// Effet de bord vérifié : NUL côté cookies. `secure` dépend de NODE_ENV (pas de
// req.secure/req.protocol) et aucun code ne lit req.protocol/secure/hostname. Le
// seul effet de `trust proxy` ici est sur `req.ip` (tracker throttler + log IP).
//
// Défaut (TRUST_PROXY absent) = comportement actuel inchangé. On n'active qu'après
// avoir mesuré la chaîne réelle via GET /health/net en prod.

export type TrustProxyValue = boolean | number | string | string[];

/**
 * Traduit la variable d'env `TRUST_PROXY` en valeur Express `trust proxy`.
 * - absente / vide            → undefined (on n'appelle PAS app.set : inchangé)
 * - 'true' / 'false'          → booléen ('true' = tout faire confiance, USURPABLE)
 * - entier ('1', '2', …)      → nombre de sauts de proxy de confiance (recommandé)
 * - liste 'a,b'               → tableau d'IP/CIDR de confiance
 * - autre ('loopback', CIDR)  → chaîne transmise telle quelle
 */
export function parseTrustProxy(raw: string | undefined): TrustProxyValue | undefined {
  if (raw == null) return undefined;
  const v = raw.trim();
  if (v === '') return undefined;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^\d+$/.test(v)) return Number(v);
  if (v.includes(',')) return v.split(',').map((s) => s.trim()).filter(Boolean);
  return v;
}
