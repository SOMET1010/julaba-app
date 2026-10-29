import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * STK-04 / A-05 — LE RÉASSORT EST UN ACHAT : le ledger porte le fournisseur
 * et le coût. (20/10/2026, arbitrage A-05 pris en délégation par Patrick.)
 *
 * Depuis septembre, `stock_mouvements` ne voit que les ventes et annulations
 * de la caisse : le « Réapprovisionner » de GestionStock écrivait le stock en
 * direct (`PATCH /stocks/:id` → UPDATE produits) sans UNE seule ligne dans le
 * ledger — ni prix d'achat, ni fournisseur, ni entrée horodatée « achat »
 * (STK-04, reconfirmé au contre-audit du 28/09 puis par l'audit workflow
 * officiel du 20/10, DET-01). Sans ces traces, la marge réelle du détaillant
 * est fausse : une entrée de stock a un coût, l'argent ne ment jamais.
 *
 * Deux colonnes NULLABLE à dessein :
 *  - `fournisseur` — déclaré au réapprovisionnement, optionnel ;
 *  - `cout_total`  — coût total FCFA de l'entrée, optionnel (la marchande
 *    peut ne pas le savoir sur le moment ; on ne l'invente pas).
 *
 * La dépense caisse « marchandise » reste le chemin de l'ARGENT (ADR-001 :
 * une seule source de vérité, la caisse n'est jamais écrite depuis le module
 * stock) ; ces colonnes portent la TRACE de l'achat dans le ledger de stock.
 */
export class AchatLedgerFournisseurCout1782300000000 implements MigrationInterface {
  name = 'AchatLedgerFournisseurCout1782300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE stock_mouvements ADD COLUMN IF NOT EXISTS fournisseur varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_mouvements ADD COLUMN IF NOT EXISTS cout_total numeric(14,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE stock_mouvements DROP COLUMN IF EXISTS cout_total`);
    await queryRunner.query(`ALTER TABLE stock_mouvements DROP COLUMN IF EXISTS fournisseur`);
  }
}
