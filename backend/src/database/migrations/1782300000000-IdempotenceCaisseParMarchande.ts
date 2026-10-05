import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * IDEM-01 — l'unicité des clés d'idempotence de la caisse était GLOBALE,
 * alors que la lecture qui l'accompagne est par marchande.
 *
 * `ux_caisse_tx_idempotency_key` portait sur `idempotency_key` seule. La
 * lecture préalable de `caisse-rest.controller.ts` cherche, elle, sur
 * `(idempotency_key, user_id)`. Les deux ne parlaient pas de la même chose.
 *
 * Si deux marchandes présentent la même clé, la seconde écriture viole
 * l'index ; le rattrapage `23505` relit avec SON `user_id`, ne trouve rien, et
 * l'erreur remonte : sa vente est perdue sans explication. Le cas restait
 * théorique tant que la clé venait du téléphone de la marchande. Il cesse de
 * l'être dès qu'un agent serveur la dérive d'un identifiant de message.
 *
 * On aligne sur ce que le dépôt fait déjà : `fidelite_evenements` porte
 * `(marchand_id, idempotency_key)`, `wallet_transactions` porte
 * `(idempotency_key, user_id, type)`.
 *
 * SANS RISQUE SUR L'EXISTANT : l'unicité de la clé seule est strictement plus
 * forte que celle du couple. Toute ligne qui satisfaisait l'ancienne satisfait
 * la nouvelle ; la création ne peut pas échouer, il n'y a rien à nettoyer.
 *
 * Le nouvel index est créé AVANT que l'ancien ne tombe : la protection est
 * remplacée, jamais absente.
 *
 * Miroir du DDL de `DbInitService` (ADR-0002).
 */
export class IdempotenceCaisseParMarchande1782300000000 implements MigrationInterface {
  name = 'IdempotenceCaisseParMarchande1782300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_caisse_tx_user_idempotency_key
      ON caisse_transactions (user_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL;
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_caisse_tx_idempotency_key;`);
  }

  /**
   * Le retour en arrière restaure l'index global — et il PEUT ÉCHOUER, parce
   * que la contrainte qu'il rétablit est plus forte : si deux marchandes ont
   * entre-temps utilisé la même clé, ces lignes existent légitimement et
   * l'ancien index les refuserait. C'est voulu : on préfère un `down` qui
   * s'arrête net à un `down` qui détruirait des ventes pour se rendre possible.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_caisse_tx_idempotency_key
      ON caisse_transactions (idempotency_key)
      WHERE idempotency_key IS NOT NULL;
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_caisse_tx_user_idempotency_key;`);
  }
}
