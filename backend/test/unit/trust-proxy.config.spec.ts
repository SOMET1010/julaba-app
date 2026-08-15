import { parseTrustProxy } from '../../src/config/trust-proxy.config';

describe('parseTrustProxy — TRUST_PROXY env → valeur Express (cf. AUDIT_THROTTLING.md)', () => {
  it('absent / vide → undefined (on ne touche PAS à trust proxy : comportement inchangé)', () => {
    expect(parseTrustProxy(undefined)).toBeUndefined();
    expect(parseTrustProxy('')).toBeUndefined();
    expect(parseTrustProxy('   ')).toBeUndefined();
  });

  it('entier → nombre de sauts (réglage recommandé pour Render)', () => {
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy('2')).toBe(2);
    expect(parseTrustProxy(' 3 ')).toBe(3);
  });

  it('booléens explicites', () => {
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('false')).toBe(false);
  });

  it('liste CSV → tableau d’IP/CIDR de confiance', () => {
    expect(parseTrustProxy('127.0.0.1, 10.0.0.0/8')).toEqual(['127.0.0.1', '10.0.0.0/8']);
  });

  it('chaîne libre transmise telle quelle (loopback, CIDR unique)', () => {
    expect(parseTrustProxy('loopback')).toBe('loopback');
    expect(parseTrustProxy('10.0.0.0/8')).toBe('10.0.0.0/8');
  });

  it('RÉGRESSION : le défaut de prod (env non défini) NE change RIEN', () => {
    // Sécurité : tant que TRUST_PROXY n'est pas explicitement posé, req.ip reste
    // le comportement actuel — pas d'activation accidentelle usurpable.
    expect(parseTrustProxy(process.env.TRUST_PROXY_ABSENT_XYZ)).toBeUndefined();
  });
});
