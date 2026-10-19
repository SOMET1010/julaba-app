// Sécurité des webhooks B-Pay — chantier C-07.
//
// Sources : AUDIT-COMPTA-ACTEURS-2026-10-12 (§4 chaîne B « Callbacks sans
// signature HMAC » et §6 C-07), AUDIT-ACTEUR-MARCHAND-2026-10-19 §4 (résidu
// C-07), registre .ai/SEC_BUGS.md SEC-022.
//
// AVANT : `/bpay/callback` se protégeait d'un secret partagé en header
// (comparaison non constante en temps, sans HMAC, sans allowlist IP) et
// `/wallets/public/pay-callback` n'avait AUCUN secret. Un corps forgé ne
// donne jamais d'argent directement — le montant et le statut sont TOUJOURS
// re-vérifiés auprès de l'opérateur (check-status) — mais il désigne la
// transaction créditée : l'authentification du message ne doit pas reposer
// sur un secret qui transite seul dans un header.
//
// CE QUE CE MODULE POSE :
//   1. `captureBpayWebhookRawBody` — callback `verify` de body-parser (posée
//      dans main.ts) qui dépose sur la requête les OCTETS BRUTS du corps,
//      pour les deux routes webhook uniquement. La signature porte sur le
//      corps TEL QUE L'OPÉRATEUR L'A ENVOYÉ : re-sérialiser un corps déjà
//      parsé (JSON.stringify) ne prouverait rien — l'ordre des clés, les
//      espaces et les échappements ne seraient plus ceux signés.
//   2. `accesWebhookAutoriseBpay` — la porte unique : allowlist IP, puis
//      HMAC-SHA256 timing-safe du corps brut, puis voie legacy (header
//      secret partagé) SI activée.
//   3. Les helpers purs : IP CSV, clé hex|utf8, comparaisons à temps constant.
//
// COMPAT PRODUCTION (VPS julaba-dev.ansut.ci, PM2 — callbacks B-Pay réels) :
//   - `BPAY_WEBHOOK_SECRET` défini → HMAC OBLIGATOIRE ; l'ancien header
//     `x-bpay-secret` n'est plus accepté QUE si `BPAY_WEBHOOK_LEGACY=true`
//     (défaut CE RUN : true, pour ne pas couper le flux opérateur avant que
//     B-Pay ne signe en HMAC — chaque acceptation legacy journalise un WARN).
//   - `BPAY_WEBHOOK_SECRET` absent → chaque route applique sa politique
//     d'aujourd'hui, rien n'est durci sans configuration (cf. contrôleurs) :
//     `/bpay/callback` refuse tout (déjà fail-closed avant ce chantier) ;
//     `/wallets/public/pay-callback` traite sans vérification (état actuel —
//     le durcir d'autorité couperait la recette QR julaba.online). Dans les
//     deux cas, un WARN invite à configurer le secret.
//   - `BPAY_WEBHOOK_IPS` (CSV) → allowlist stricte : toute IP hors liste est
//     refusée AVANT toute vérification de signature.

import { createHash, createHmac, timingSafeEqual } from 'crypto';

/** Propriété de requête où body-parser (`verify`) dépose le corps brut. */
export const BPAY_RAW_BODY_KEY = 'bpayRawBody';

/**
 * Les DEUX routes webhook B-Pay, par suffixe : le préfixe global
 * (API_PREFIX, api/v1 en prod) varie selon l'environnement.
 */
export function estCheminWebhookBpay(url: string | undefined): boolean {
  if (!url) return false;
  const chemin = url.split('?')[0] ?? '';
  return chemin.endsWith('/bpay/callback') || chemin.endsWith('/wallets/public/pay-callback');
}

type CorpsBrutVerify = (req: unknown, res: unknown, buf: Buffer, encoding: string) => void;

/**
 * Callback `verify` de body-parser (express.json) — appelé avec le buffer
 * brut AVANT le parsing. Ne JAMAIS throw ici : body-parser répondrait 400
 * au webhook d'un opérateur légitime. Limite la capture aux deux routes
 * webhook : aucune mémoire ajoutée pour les autres requêtes.
 */
export const captureBpayWebhookRawBody: CorpsBrutVerify = (req, _res, buf, encoding) => {
  try {
    const r = req as Record<string, unknown> & { url?: string };
    if (!estCheminWebhookBpay(r?.url)) return;
    r[BPAY_RAW_BODY_KEY] = Buffer.isBuffer(buf)
      ? buf
      : Buffer.from(String(buf), (encoding as BufferEncoding) || 'utf8');
  } catch {
    // Capture impossible (req exotique) : la vérification HMAC restera
    // simplement indisponible et la voie legacy prendra le relais — on ne
    // coupe jamais un webhook pour un défaut de capture.
  }
};

/** Premier élément d'un en-tête potentiellement répété (Express renvoie string[]). */
export function premierEnTete(v: string | string[] | undefined): string | undefined {
  const val = Array.isArray(v) ? v[0] : v;
  return val && val.length > 0 ? val : undefined;
}

// ── Allowlist IP ────────────────────────────────────────────────────────────

/** `BPAY_WEBHOOK_IPS` : liste CSV — ex. « 10.0.0.7, 51.75.1.2 ». */
export function parseCsvIps(brut: string | undefined | null): string[] {
  if (!brut) return [];
  return brut.split(',').map((s) => s.trim()).filter(Boolean);
}

/** Normalise l'IPv4 mappée en IPv6 (`::ffff:a.b.c.d`) pour comparer à l'allowlist. */
export function normaliserIp(ip: string | undefined | null): string {
  if (!ip) return '';
  const v = ip.trim();
  return v.startsWith('::ffff:') ? v.slice('::ffff:'.length) : v;
}

/**
 * Allowlist vide = filtre désactivé (comportement inchangé). Sinon, refus si
 * `req.ip` est hors liste. `req.ip` est la valeur Express : elle ne reflète
 * le VRAI émetteur derrière un reverse proxy QUE si `TRUST_PROXY` est calibré
 * (main.ts, cf. /health/net) — sinon toutes les callbacks partagent l'IP du
 * proxy et l'allowlist refuserait les callbacks légitimes.
 */
export function estIpAutorisee(ip: string | undefined | null, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true;
  const n = normaliserIp(ip);
  if (!n) return false;
  return allowlist.some((a) => normaliserIp(a) === n);
}

// ── HMAC-SHA256 ─────────────────────────────────────────────────────────────

/**
 * Comparaison à temps constant de deux digests de MÊME longueur encodée
 * (la longueur d'un hex SHA-256 est publique — pas de fuite à y couper).
 */
function egaliteDigest(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Deux chaînes de longueur quelconque : hachées puis comparées en temps constant. */
function egaliteSecrete(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Clé(s) HMAC dérivées du secret : utf8 PAR DÉFAUT ; un secret de 64
 * hexadécimales est AUSSI essayé comme octets bruts (clé de 32 octets) —
 * les deux lectures sont documentées dans backend/.env.example.
 */
export function clesHmac(secret: string): Buffer[] {
  const s = secret.trim();
  const utf8 = Buffer.from(s, 'utf8');
  if (/^[0-9a-fA-F]{64}$/.test(s)) return [utf8, Buffer.from(s, 'hex')];
  return [utf8];
}

/** `x-bpay-signature` : hex SHA-256 du corps brut, préfixe optionnel `sha256=`. */
export function signatureHmacValide(
  secret: string,
  corpsBrut: Buffer | undefined,
  signatureRecue: string | undefined,
): boolean {
  if (!corpsBrut || !signatureRecue) return false;
  const recue = signatureRecue.trim().toLowerCase().replace(/^sha256=/, '');
  if (!/^[0-9a-f]{64}$/.test(recue)) return false;
  const attendueRecue = Buffer.from(recue, 'hex');
  for (const cle of clesHmac(secret)) {
    const attendue = createHmac('sha256', cle).update(corpsBrut).digest();
    if (egaliteDigest(attendue, attendueRecue)) return true;
  }
  return false;
}

// ── La porte unique ─────────────────────────────────────────────────────────

export type RaisonRefusWebhook =
  | 'IP_REFUSEE'
  | 'SECRET_ABSENT'
  | 'SIGNATURE_MANQUANTE'
  | 'SIGNATURE_INVALIDE';

// NB : ce dépôt compile avec `strictNullChecks: false` — dans ce réglage, un
// union discriminé par un booléen ne se rétrécit PAS de façon fiable au
// if/else (le littéral true/false est absorbé dans boolean) : verdict unique
// donc, en objet plat, `raison` optionnel. Le code appelant ne doit JAMAIS
// supposer `raison` présent quand `acces` est vrai.
export type VerdictWebhook = {
  acces: boolean;
  legacy?: boolean;
  raison?: RaisonRefusWebhook;
};

export interface ParametresWebhook {
  ip?: string | null;
  ipsAutorisees: string[];
  secret?: string | null;
  legacyActif: boolean;
  corpsBrut?: Buffer | undefined;
  signatureRecue?: string | undefined;
  secretRecu?: string | undefined;
}

/**
 * Ordonne les défenses du moins coûteux au plus précis : IP, puis HMAC, puis
 * voie legacy. `SIGNATURE_MANQUANTE` = ni en-tête de signature exploitable,
 * ni voie legacy valide (header absent OU voie désactivée OU secret faux).
 * La politique quand `SECRET_ABSENT` reste à la CHARGE DE LA ROUTE (cf.
 * entête de fichier : fail-closed sur /bpay/callback, compat sur
 * /wallets/public/pay-callback).
 */
export function verifierAccesWebhookBpay(p: ParametresWebhook): VerdictWebhook {
  if (!estIpAutorisee(p.ip, p.ipsAutorisees)) return { acces: false, raison: 'IP_REFUSEE' };
  if (!p.secret) return { acces: false, raison: 'SECRET_ABSENT' };
  if (p.signatureRecue) {
    return signatureHmacValide(p.secret, p.corpsBrut, p.signatureRecue)
      ? { acces: true }
      : { acces: false, raison: 'SIGNATURE_INVALIDE' };
  }
  if (p.legacyActif && p.secretRecu && egaliteSecrete(p.secret, p.secretRecu)) {
    return { acces: true, legacy: true };
  }
  return { acces: false, raison: 'SIGNATURE_MANQUANTE' };
}

/**
 * `BPAY_WEBHOOK_LEGACY` : défaut TRUE CE RUN (compat VPS — B-Pay envoie
 * encore l'ancien header secret ; chaque acceptation journalise un WARN).
 * Toute valeur autre que « false » (insensible à la casse) laisse la voie
 * legacy ouverte.
 */
export function legacyActif(brut: string | undefined | null): boolean {
  if (brut == null || brut.trim() === '') return true;
  return brut.trim().toLowerCase() !== 'false';
}

/**
 * Porte complète d'un webhook, prête à brancher sur un contrôleur.
 *
 * @param config      source d'env (ConfigService) — structurellement typée
 *                    pour rester testable hors Nest.
 * @param logger      warn() uniquement.
 * @param route       nom de la route pour les journaux.
 * @param politiqueSansSecret  'REFUSER' (/bpay/callback — fail-closed, comme
 *                    avant) ou 'ACCEPTER' (/wallets/public/pay-callback —
 *                    compat : la route n'avait AUCUN secret avant C-07).
 * @returns true si le callback doit être TRAITÉ.
 */
export function accesWebhookAutoriseBpay(
  config: { get: (name: string) => string | undefined },
  logger: { warn: (message: string) => unknown },
  route: string,
  req: { ip?: string; [cle: string]: unknown },
  headers: Record<string, string | string[] | undefined>,
  politiqueSansSecret: 'REFUSER' | 'ACCEPTER',
): boolean {
  const verdict = verifierAccesWebhookBpay({
    ip: req?.ip,
    ipsAutorisees: parseCsvIps(config.get('BPAY_WEBHOOK_IPS')),
    secret: config.get('BPAY_WEBHOOK_SECRET'),
    legacyActif: legacyActif(config.get('BPAY_WEBHOOK_LEGACY')),
    corpsBrut: req?.[BPAY_RAW_BODY_KEY] as Buffer | undefined,
    signatureRecue: premierEnTete(headers['x-bpay-signature']),
    secretRecu: premierEnTete(headers['x-bpay-secret'] ?? headers['x-webhook-secret']),
  });
  if (verdict.acces) {
    if (verdict.legacy) {
      logger.warn(
        `[BPAY WEBHOOK] ${route} : webhook legacy accepté — configurez BPAY_WEBHOOK_SECRET ` +
        `(HMAC du corps brut ; BPAY_WEBHOOK_LEGACY=false pour couper) — C-07/SEC-022`,
      );
    }
    return true;
  }
  if (verdict.raison === 'SECRET_ABSENT') {
    if (politiqueSansSecret === 'ACCEPTER') {
      logger.warn(
        `[BPAY WEBHOOK] ${route} : BPAY_WEBHOOK_SECRET absent — callback traité SANS vérification ` +
        `(comportement antérieur conservé) — configurez le secret, C-07/SEC-022`,
      );
      return true;
    }
    logger.warn(`[BPAY WEBHOOK] ${route} : BPAY_WEBHOOK_SECRET absent — callback ignoré (fail-closed) — SEC-022`);
    return false;
  }
  logger.warn(`[BPAY WEBHOOK] ${route} : callback refusé (${verdict.raison}) — ignoré — SEC-022`);
  return false;
}
