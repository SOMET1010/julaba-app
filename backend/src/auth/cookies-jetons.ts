// ──────────────────────────────────────────────────────────────────────────
// cookies-jetons.ts — LA REMISE DES JETONS, une seule écriture pour le nouveau.
//
// La connexion par empreinte (auth.controller, /webauthn/authenticate/verify)
// pose les jetons DEUX fois : en cookie httpOnly (le web) ET dans le corps de
// la réponse (l'APK — les cookies cross-domaine y sont bloqués ; sans le corps,
// l'empreinte « réussit » puis la requête suivante est 401). Le ré-enrôlement
// de récupération finit pareillement par une session ouverte : il doit rendre
// les jetons des deux façons, avec LA MÊME politique de cookie.
//
// Ce fichier porte la politique UNE FOIS pour le code qui naît après lui.
// Les méthodes privées d'AuthController restent en place — on ne touche pas
// aux routes existantes (AUTH-RECOVERY-01) ; la vérité partagée commence ici
// et les prochains chemins l'utilisent.
// ──────────────────────────────────────────────────────────────────────────

import type { Response } from 'express';

/** La politique des cookies de jeton (miroir exact de AuthController). */
export function optionsBaseCookieJeton() {
  const isProd = process.env.NODE_ENV === 'production';
  const sameSite =
    (process.env.COOKIE_SAMESITE as 'lax' | 'none' | 'strict') ||
    (isProd ? 'none' : 'lax');
  const secure = isProd || sameSite === 'none';
  return { httpOnly: true, secure, sameSite, path: '/' };
}

/**
 * Pose les jetons d'un compte ACTEUR (access + refresh) en cookies ET —
 * c'est le corps de la réponse qui les portera sur l'APK — laisse à
 * l'appelant le soin de les mettre dans son corps.
 */
export function poserCookiesJetonsActeur(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  const base = optionsBaseCookieJeton();
  res.cookie('access_token', accessToken, { ...base, maxAge: 24 * 60 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
}
