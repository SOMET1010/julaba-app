import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * IDEM-03 — UNE CLÉ D'IDEMPOTENCE SE JUGE TOUJOURS PAR MARCHANDE.
 *
 * LE DÉFAUT QUE CE BANC EMPÊCHE DE REVENIR. Deux tables protégeaient leurs
 * clés d'idempotence GLOBALEMENT, alors que le code qui les lit filtre par
 * marchande. Les deux ne parlaient pas de la même chose, et le résultat
 * portait sur l'argent :
 *
 *   · `caisse_transactions` (IDEM-01) — deux marchandes, même clé : la
 *     seconde écriture viole l'index, le rattrapage relit avec SON user_id,
 *     ne trouve rien, et l'erreur remonte. Sa vente est perdue.
 *   · `stock_operation_idempotency` (IDEM-02) — pire : rien n'est inséré, le
 *     stock n'est pas mis à jour, et la route répond `success: true`. La
 *     marchande croit son stock corrigé ; l'écart sort à l'inventaire.
 *
 * Deux autres tables faisaient déjà bien : `fidelite_evenements`
 * `(marchand_id, idempotency_key)` et `wallet_transactions`
 * `(idempotency_key, user_id, type)`. Ce banc fige la règle que ces deux-là
 * suivaient déjà, pour que les deux autres n'y retournent pas.
 *
 * CE QU'IL NE REGARDE PAS, ET POURQUOI. L'historique : `BaselineSchema` et
 * `_archive` portent l'ancienne forme, et on ne réécrit pas une migration
 * déjà jouée. Les `down()` non plus : ils RÉTABLISSENT délibérément la forme
 * ancienne, c'est leur travail.
 */
const RACINE = join(__dirname, '..', '..', 'src');

/**
 * ON LIT LE CODE, PAS CE QU'IL RACONTE. Les commentaires de ce lot CITENT la
 * forme fautive pour l'expliquer (« `ON CONFLICT (idempotency_key)` portait
 * sur la clé SEULE ») : sans ce filtre, le banc accuserait la documentation
 * du correctif d'être le défaut. Il a commencé par le faire — d'où ce nettoyage,
 * repris de `venteVocaleSansPrix.test.mts`, où le même piège avait été payé.
 */
const sansCommentaires = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const lire = (p: string) => sansCommentaires(readFileSync(join(RACINE, p), 'utf8'));

/** Le corps de `up()` seul — un `down()` a le droit de restaurer l'ancien. */
function corpsUp(source: string): string {
  const i = source.indexOf('async up(');
  if (i === -1) return '';
  const j = source.indexOf('async down(');
  return source.slice(i, j === -1 ? undefined : j);
}

describe('IDEM-03 — toute clé d’idempotence est jugée par marchande', () => {
  const dbInit = lire('database/db-init.service.ts');
  const stocks = lire('stocks-rest/stocks-rest.controller.ts');

  it('DbInit ne crée aucun index unique sur `idempotency_key` SEULE', () => {
    // La forme interdite : (idempotency_key) sans compagnon. On capture tous
    // les index uniques posés par DbInit et on vérifie leurs colonnes.
    const index = [...dbInit.matchAll(/CREATE UNIQUE INDEX[^(]*\(([^)]*)\)/gi)]
      .map((m) => m[1].replace(/\s+/g, ' ').trim());
    const surIdempotence = index.filter((cols) => /idempotency_key/i.test(cols));

    expect(surIdempotence.length).toBeGreaterThan(0); // le banc doit avoir matière
    for (const cols of surIdempotence) {
      expect(cols).toMatch(/user_id|marchand_id/i);
    }
  });

  it('l’ancien index global de la caisse est explicitement SUPPRIMÉ', () => {
    // Créer le nouveau ne suffit pas : tant que l'ancien existe, il refuse
    // toujours deux marchandes portant la même clé.
    expect(dbInit).toMatch(/DROP INDEX IF EXISTS ux_caisse_tx_idempotency_key/);
    expect(dbInit).toMatch(/ux_caisse_tx_user_idempotency_key[\s\S]{0,120}\(user_id, idempotency_key\)/);
  });

  it('l’ancienne clé primaire globale du stock est explicitement SUPPRIMÉE', () => {
    expect(dbInit).toMatch(/ux_stock_op_idem_marchand[\s\S]{0,120}\(marchand_id, idempotency_key\)/);
    expect(dbInit).toMatch(/DROP CONSTRAINT IF EXISTS stock_operation_idempotency_pkey/);
  });

  it('CRÉER AVANT DE SUPPRIMER — la protection est remplacée, jamais absente', () => {
    // L'ordre est la moitié du correctif : l'inverser ouvrirait une fenêtre,
    // même d'une seconde, où deux requêtes concurrentes passeraient toutes
    // les deux.
    expect(dbInit.indexOf('ux_caisse_tx_user_idempotency_key'))
      .toBeLessThan(dbInit.indexOf('DROP INDEX IF EXISTS ux_caisse_tx_idempotency_key'));
    expect(dbInit.indexOf('ux_stock_op_idem_marchand'))
      .toBeLessThan(dbInit.indexOf('DROP CONSTRAINT IF EXISTS stock_operation_idempotency_pkey'));
  });

  it('aucun `ON CONFLICT` du code actif ne juge sur la clé seule', () => {
    const conflits = [...stocks.matchAll(/ON CONFLICT\s*\(([^)]*)\)/gi)].map((m) => m[1]);
    const surIdempotence = conflits.filter((c) => /idempotency_key/i.test(c));
    expect(surIdempotence.length).toBeGreaterThan(0);
    for (const c of surIdempotence) expect(c).toMatch(/user_id|marchand_id/i);
  });

  it('les migrations de ce lot font, dans leur `up`, ce que DbInit fait', () => {
    // ADR-0002 : « DbInit ⊆ migrations ». Si les deux divergent, une base
    // reconstruite depuis les migrations n'aurait pas la même protection.
    const caisse = corpsUp(lire('database/migrations/1782300000000-IdempotenceCaisseParMarchande.ts'));
    expect(caisse).toMatch(/\(user_id, idempotency_key\)/);
    expect(caisse).toMatch(/DROP INDEX IF EXISTS ux_caisse_tx_idempotency_key/);

    const stock = corpsUp(lire('database/migrations/1782400000000-IdempotenceStockParMarchande.ts'));
    expect(stock).toMatch(/\(marchand_id, idempotency_key\)/);
    expect(stock).toMatch(/DROP CONSTRAINT IF EXISTS stock_operation_idempotency_pkey/);
  });

  it('les deux tables qui faisaient déjà bien n’ont pas été touchées', () => {
    const fidelite = lire('database/migrations/1780800000000-FideliteEvenements.ts');
    expect(fidelite).toMatch(/\(marchand_id, idempotency_key\)/);
    const wallet = lire('database/migrations/1781000000001-WalletTransactionTransfertIdempotence.ts');
    expect(wallet).toMatch(/\(idempotency_key, user_id, type\)/);
  });
});
