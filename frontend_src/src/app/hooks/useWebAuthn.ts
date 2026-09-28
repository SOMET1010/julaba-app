import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import { API_URL } from '../utils/api';
import { appelerAuth } from '../services/api/auth-api';
import { apiRequest, HttpError } from '../services/api/api-client';

/**
 * API-01b — LA SESSION QUI EXPIRE NE DOIT PAS ACCUSER LA MARCHANDE.
 *
 * Même défaut que dans `WalletPage`, par l'empreinte cette fois, et en pire.
 * Sur jeton expiré — il vit 15 minutes — `getConnectedUserPhone()` recevait un
 * 401, rendait `null`, et `verifyWebAuthnForKeiwa` rendait `false`. L'écran
 * affichait « Ton téléphone ne t'a pas reconnue ». Or l'invite d'empreinte ne
 * s'était même pas ouverte : elle n'avait pas eu l'occasion d'essayer, et on
 * lui reprochait un échec qui n'était pas le sien.
 *
 * LES DEUX CHOSES SE DISTINGUENT PROPREMENT, et ce n'est pas une supposition :
 *   • un échec WebAuthn normal est une EXCEPTION LEVÉE par
 *     `@simplewebauthn/browser` (`WebAuthnError`, avec `.name` —
 *     `NotAllowedError` quand elle annule ou laisse passer le délai,
 *     `InvalidStateError` quand le doigt est déjà enregistré, `AbortError`,
 *     `NotSupportedError`, `SecurityError`) ;
 *   • une session finie est un 401 HTTP de NOTRE serveur.
 * L'un vient du navigateur, l'autre du réseau. Ils ne se croisent jamais.
 *
 * D'où ces états, au lieu d'un booléen qui écrasait tout :
 */
export type EtatBiometrie =
  /** Le téléphone a reconnu la personne. */
  | { etat: 'ok' }
  /** Le téléphone n'a pas reconnu : c'est le VRAI cas « ce n'est pas toi ». */
  | { etat: 'non_reconnue' }
  /** Elle a annulé, ou le délai est passé. Ce n'est pas un échec. */
  | { etat: 'annulee' }
  /** Session finie : à reconnecter. Rien à voir avec son doigt. */
  | { etat: 'session_expiree' }
  /** L'appareil ne sait pas faire, ou quelque chose d'autre a cassé. */
  | { etat: 'indisponible'; message?: string };

/**
 * LES DEUX APPELS AU NAVIGATEUR, DERRIÈRE UNE COUTURE.
 *
 * `startAuthentication` et `startRegistration` parlent au matériel : ils ne
 * peuvent pas tourner dans un test. Sans cette couture, on ne pourrait
 * vérifier QUE le cas « session expirée » — c'est-à-dire tout sauf la
 * distinction qu'on vient d'établir. Les écrans, eux, ne changent pas : la
 * valeur par défaut est la vraie librairie.
 */
export const navigateurWebAuthn = {
  authentifier: startAuthentication,
  enregistrer: startRegistration,
};

/** Vrai quand l'erreur vient du navigateur/de l'appareil, pas du réseau. */
function estEchecWebAuthn(e: unknown): e is Error {
  return e instanceof Error && (
    e.name === 'WebAuthnError' ||
    ['NotAllowedError', 'InvalidStateError', 'AbortError', 'NotSupportedError', 'SecurityError']
      .includes(e.name)
  );
}

/** Une annulation ou un délai dépassé : elle n'a rien raté, elle a renoncé. */
function estAnnulation(e: unknown): boolean {
  return e instanceof Error && (e.name === 'NotAllowedError' || e.name === 'AbortError');
}

/**
 * Le numéro de la personne connectée. Passe par la couche API, qui rafraîchit
 * la session avant de conclure : un jeton simplement périmé ne doit pas
 * ressembler à une déconnexion.
 */
async function telephoneConnecte(): Promise<
  { etat: 'ok'; phone: string } | { etat: 'session_expiree' } | { etat: 'indisponible' }
> {
  const r = await appelerAuth<{ user?: { phone?: string } }>('/auth/me');
  if (r.etat === 'session_expiree') return { etat: 'session_expiree' };
  if (r.etat === 'erreur_metier') return { etat: 'indisponible' };
  const phone = r.valeur?.user?.phone;
  return phone ? { etat: 'ok', phone } : { etat: 'indisponible' };
}

export async function registerWebAuthn(): Promise<EtatBiometrie> {
  const opt = await appelerAuth<Record<string, unknown>>('/auth/webauthn/register/options',
    { method: 'POST' });
  if (opt.etat === 'session_expiree') return { etat: 'session_expiree' };
  if (opt.etat === 'erreur_metier') return { etat: 'indisponible', message: opt.message };

  let regResponse: unknown;
  try {
    regResponse = await navigateurWebAuthn.enregistrer({ optionsJSON: opt.valeur as any });
  } catch (e) {
    if (estAnnulation(e)) return { etat: 'annulee' };
    if (estEchecWebAuthn(e)) return { etat: 'non_reconnue' };
    return { etat: 'indisponible', message: e instanceof Error ? e.message : undefined };
  }

  const ver = await appelerAuth<{ verified?: boolean }>('/auth/webauthn/register/verify',
    { method: 'POST', body: JSON.stringify(regResponse) });
  if (ver.etat === 'session_expiree') return { etat: 'session_expiree' };
  if (ver.etat === 'erreur_metier') return { etat: 'indisponible', message: ver.message };
  return ver.valeur?.verified === true ? { etat: 'ok' } : { etat: 'non_reconnue' };
}

export async function authenticateWebAuthn(phone: string): Promise<{ success: boolean; user?: any; accessToken?: string; refreshToken?: string; error?: string }> {
  try {
    // INIT-019 — passe par le client centralisé. Sur !res.ok, l'ancien code
    // renvoyait `{ success: false, error: 'Erreur options' }` sans lire le
    // corps : on préserve ce comportement via catch HttpError.
    let optionsJson: any;
    try {
      optionsJson = await apiRequest<any>(API_URL, '/auth/webauthn/authenticate/options', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
    } catch {
      return { success: false, error: 'Erreur options' };
    }
    const { userId, ...options } = optionsJson;
    const authResponse = await startAuthentication({ optionsJSON: options });
    // Pour verify : on lit le corps même sur !res.ok (échec biométrique attendu).
    let verData: any;
    try {
      verData = await apiRequest<any>(API_URL, '/auth/webauthn/authenticate/verify', {
        method: 'POST',
        body: JSON.stringify({ response: authResponse, userId }),
      });
    } catch (err) {
      // INIT-019 — sur !res.ok, l'ancien code lisait quand même `verData.verified`.
      // On récupère le corps via `HttpError.body` pour préserver ce comportement.
      if (err instanceof HttpError) verData = (err.body as any) || {};
      else throw err;
    }
    // On remonte AUSSI les jetons (mobile : cookies cross-domaine bloqués) pour
    // que handleBiometric les stocke -> les requêtes suivantes restent authentifiées.
    if (verData.verified) return { success: true, user: verData.user, accessToken: verData.accessToken, refreshToken: verData.refreshToken };
    return { success: false, error: 'Ton téléphone ne t\'a pas reconnue.' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function verifyWebAuthnForKeiwa(): Promise<EtatBiometrie> {
  const tel = await telephoneConnecte();
  if (tel.etat !== 'ok') {
    return tel.etat === 'session_expiree' ? { etat: 'session_expiree' } : { etat: 'indisponible' };
  }
  const opt = await appelerAuth<Record<string, unknown>>('/auth/webauthn/authenticate/options',
    { method: 'POST', body: JSON.stringify({ phone: tel.phone }) });
  if (opt.etat === 'session_expiree') return { etat: 'session_expiree' };
  if (opt.etat === 'erreur_metier') return { etat: 'indisponible', message: opt.message };
  const { userId, ...options } = (opt.valeur || {}) as Record<string, unknown>;

  let authResponse: unknown;
  try {
    authResponse = await navigateurWebAuthn.authentifier({ optionsJSON: options as any });
  } catch (e) {
    // ICI, et seulement ici, l'échec vient du téléphone.
    if (estAnnulation(e)) return { etat: 'annulee' };
    if (estEchecWebAuthn(e)) return { etat: 'non_reconnue' };
    return { etat: 'indisponible', message: e instanceof Error ? e.message : undefined };
  }

  const ver = await appelerAuth<{ verified?: boolean }>('/auth/webauthn/authenticate/verify',
    { method: 'POST', body: JSON.stringify({ response: authResponse, userId }) });
  if (ver.etat === 'session_expiree') return { etat: 'session_expiree' };
  if (ver.etat === 'erreur_metier') return { etat: 'indisponible', message: ver.message };
  return ver.valeur?.verified === true ? { etat: 'ok' } : { etat: 'non_reconnue' };
}
