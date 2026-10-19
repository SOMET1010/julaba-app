// Garde unitaire de la porte des webhooks B-Pay (C-07 / SEC-022).
//
// Toutes les fonctions testées sont PURES (aucune base, aucun réseau) —
// c'est la logique qui décide si un callback B-Pay est traité ou ignoré :
// allowlist IP, HMAC-SHA256 du corps brut (clé utf8 OU hex), voie legacy.
// La compat production (BPAY_WEBHOOK_LEGACY=true par défaut) y est FIGÉE :
// si quelqu'un durcit la porte sans le décider, ce fichier doit rouge.

import {
  captureBpayWebhookRawBody,
  clesHmac,
  estCheminWebhookBpay,
  estIpAutorisee,
  legacyActif,
  parseCsvIps,
  premierEnTete,
  signatureHmacValide,
  verifierAccesWebhookBpay,
} from '../../src/bpay/bpay-webhook.securite';
import { createHmac } from 'crypto';

const SECRET = 'test-secret-webhook-bpay';
const CORPS = Buffer.from('{"pay_token":"TOKEN-1","status":"SUCCESS"}', 'utf8');
const signatureDe = (corps: Buffer, cle: Buffer) =>
  createHmac('sha256', cle).update(corps).digest('hex');

describe('estCheminWebhookBpay', () => {
  it('reconnaît les deux routes webhook, préfixe global et query compris', () => {
    expect(estCheminWebhookBpay('/api/v1/bpay/callback')).toBe(true);
    expect(estCheminWebhookBpay('/api/v1/wallets/public/pay-callback')).toBe(true);
    expect(estCheminWebhookBpay('/bpay/callback?x=1')).toBe(true);
    expect(estCheminWebhookBpay('/api/v1/bpay/callback-autre')).toBe(false);
    expect(estCheminWebhookBpay('/api/v1/wallets/me')).toBe(false);
    expect(estCheminWebhookBpay(undefined)).toBe(false);
  });
});

describe('captureBpayWebhookRawBody (verify de body-parser)', () => {
  const capturer = (url?: string, buf: Buffer = CORPS) => {
    const req: any = { url };
    captureBpayWebhookRawBody(req, {}, buf, 'utf-8');
    return req;
  };

  it('dépose les octets bruts pour les routes webhook', () => {
    const req = capturer('/api/v1/bpay/callback');
    expect(Buffer.isBuffer(req.bpayRawBody)).toBe(true);
    expect(req.bpayRawBody.toString('utf8')).toBe(CORPS.toString('utf8'));
  });

  it('ne dépose RIEN pour les autres routes (aucune mémoire ajoutée)', () => {
    expect(capturer('/api/v1/caisse/vente').bpayRawBody).toBeUndefined();
    expect(capturer(undefined).bpayRawBody).toBeUndefined();
  });

  it('ne throw jamais (un défaut de capture ne doit pas répondre 400 à l’opérateur)', () => {
    expect(() => captureBpayWebhookRawBody(null, {}, CORPS, 'utf-8')).not.toThrow();
  });
});

describe('allowlist IP', () => {
  it('désactivée quand la liste est vide (comportement inchangé)', () => {
    expect(estIpAutorisee('1.2.3.4', [])).toBe(true);
  });

  it('refuse une IP hors liste, accepte une IP de la liste', () => {
    expect(estIpAutorisee('10.0.0.7', ['10.0.0.7', '51.75.1.2'])).toBe(true);
    expect(estIpAutorisee('10.0.0.8', ['10.0.0.7'])).toBe(false);
    expect(estIpAutorisee(undefined, ['10.0.0.7'])).toBe(false);
  });

  it('normalise l’IPv4 mappée IPv6 (::ffff:) du reverse proxy', () => {
    expect(estIpAutorisee('::ffff:10.0.0.7', ['10.0.0.7'])).toBe(true);
    expect(estIpAutorisee('10.0.0.7', ['::ffff:10.0.0.7'])).toBe(true);
  });

  it('parseCsvIps tolère espaces et vides', () => {
    expect(parseCsvIps(' 10.0.0.7 , 51.75.1.2,,')).toEqual(['10.0.0.7', '51.75.1.2']);
    expect(parseCsvIps(undefined)).toEqual([]);
    expect(parseCsvIps('')).toEqual([]);
  });
});

describe('HMAC-SHA256 du corps brut', () => {
  it('valide la signature d’une clé utf8', () => {
    const sig = signatureDe(CORPS, Buffer.from(SECRET, 'utf8'));
    expect(signatureHmacValide(SECRET, CORPS, sig)).toBe(true);
  });

  it('valide aussi un secret de 64 hex (deuxième lecture : 32 octets bruts)', () => {
    const hex = 'a'.repeat(64);
    const sigHex = signatureDe(CORPS, Buffer.from(hex, 'hex'));
    expect(signatureHmacValide(hex, CORPS, sigHex)).toBe(true);
    // et la lecture utf8 de ce même secret reste acceptée (les deux clés essayées)
    const sigUtf8 = signatureDe(CORPS, Buffer.from(hex, 'utf8'));
    expect(signatureHmacValide(hex, CORPS, sigUtf8)).toBe(true);
    expect(clesHmac(hex)).toHaveLength(2);
  });

  it('accepte le préfixe sha256= et la casse mixte', () => {
    const sig = signatureDe(CORPS, Buffer.from(SECRET, 'utf8'));
    expect(signatureHmacValide(SECRET, CORPS, `sha256=${sig.toUpperCase()}`)).toBe(true);
  });

  it('refuse un corps absent, une signature absente/maltformée, un corps modifié', () => {
    const sig = signatureDe(CORPS, Buffer.from(SECRET, 'utf8'));
    expect(signatureHmacValide(SECRET, undefined, sig)).toBe(false);
    expect(signatureHmacValide(SECRET, CORPS, undefined)).toBe(false);
    expect(signatureHmacValide(SECRET, CORPS, 'zz')).toBe(false);
    expect(signatureHmacValide(SECRET, Buffer.from('altéré', 'utf8'), sig)).toBe(false);
  });
});

describe('verifierAccesWebhookBpay — la porte, dans l’ordre', () => {
  const params = (surcharge: Partial<Parameters<typeof verifierAccesWebhookBpay>[0]> = {}) => ({
    ip: '10.0.0.7',
    ipsAutorisees: [],
    secret: SECRET,
    legacyActif: true,
    corpsBrut: CORPS,
    ...surcharge,
  });
  const sig = signatureDe(CORPS, Buffer.from(SECRET, 'utf8'));

  it('IP refusée AVANT toute vérification de signature', () => {
    const v = verifierAccesWebhookBpay(params({ ipsAutorisees: ['10.9.9.9'], signatureRecue: sig }));
    expect(v.acces).toBe(false);
    expect(v.raison).toBe('IP_REFUSEE');
  });

  it('SECRET_ABSENT quand le secret n’est pas configuré (politique = à la route)', () => {
    const v = verifierAccesWebhookBpay(params({ secret: undefined, secretRecu: SECRET }));
    expect(v.acces).toBe(false);
    expect(v.raison).toBe('SECRET_ABSENT');
  });

  it('HMAC valide → accès (pas un accès legacy)', () => {
    const v = verifierAccesWebhookBpay(params({ signatureRecue: sig }));
    expect(v.acces).toBe(true);
    expect(v.legacy).toBeFalsy();
  });

  it('HMAC invalide → refus explicite, même si la voie legacy est ouverte', () => {
    const v = verifierAccesWebhookBpay(params({ signatureRecue: 'f'.repeat(64), secretRecu: SECRET }));
    expect(v.acces).toBe(false);
    expect(v.raison).toBe('SIGNATURE_INVALIDE');
  });

  it('voie legacy : header secret correct + BPAY_WEBHOOK_LEGACY=true → accès legacy (WARN côté contrôleur)', () => {
    const v = verifierAccesWebhookBpay(params({ secretRecu: SECRET }));
    expect(v.acces).toBe(true);
    expect(v.legacy).toBe(true);
  });

  it('voie legacy refusée : header faux, ou legacy désactivé même avec le bon header', () => {
    expect(verifierAccesWebhookBpay(params({ secretRecu: 'mauvais' })).raison).toBe('SIGNATURE_MANQUANTE');
    const v = verifierAccesWebhookBpay(params({ legacyActif: false, secretRecu: SECRET }));
    expect(v.acces).toBe(false);
    expect(v.raison).toBe('SIGNATURE_MANQUANTE');
  });
});

describe('compat figée : legacyActif + premierEnTete', () => {
  it('BPAY_WEBHOOK_LEGACY vaut true par défaut (VPS julaba-dev.ansut.ci)', () => {
    expect(legacyActif(undefined)).toBe(true);
    expect(legacyActif('')).toBe(true);
    expect(legacyActif('true')).toBe(true);
    expect(legacyActif('false')).toBe(false);
    expect(legacyActif('FALSE')).toBe(false);
  });

  it('premierEnTete réduit un header répété et ignore les vides', () => {
    expect(premierEnTete(['a', 'b'])).toBe('a');
    expect(premierEnTete('seul')).toBe('seul');
    expect(premierEnTete('')).toBeUndefined();
    expect(premierEnTete(undefined)).toBeUndefined();
  });
});
