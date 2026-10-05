import { MigrationInterface, QueryRunner } from 'typeorm';
import { DDL_AGENT } from '../../agent/agent-tables';

/**
 * AGENT-A1/A2 — compte de service, code de délégation par SMS, délégation.
 *
 * Un agent serveur n'est pas un utilisateur : aucune ligne de `users` ne lui
 * correspond, et il n'a ni téléphone, ni mot de passe, ni PIN. C'est la
 * condition pour que l'invariant du lot tienne — « le code SMS ne doit jamais
 * être suffisant à lui seul pour changer durablement le propriétaire, le
 * numéro de téléphone ou les moyens de récupération du compte ».
 *
 * LE DDL N'EST PAS RECOPIÉ ICI : il vient de `src/agent/agent-tables.ts`, la
 * même constante que `DbInitService` applique. Deux copies d'un schéma
 * finissent toujours par diverger ; une seule chaîne ne le peut pas
 * (ADR-0002).
 */
export class AgentDelegation1782500000000 implements MigrationInterface {
  name = 'AgentDelegation1782500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const ddl of DDL_AGENT) await queryRunner.query(ddl);
  }

  /**
   * On supprime dans l'ordre inverse. `agent_delegation` part avant
   * `agent_service` : une délégation sans agent n'a aucun sens, et on ne
   * laisse pas derrière soi une table qui ne désigne plus rien.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ix_agent_delegation_marchand;`);
    await queryRunner.query(`DROP TABLE IF EXISTS agent_delegation;`);
    await queryRunner.query(`DROP TABLE IF EXISTS agent_code_delegation;`);
    await queryRunner.query(`DROP TABLE IF EXISTS agent_service;`);
  }
}
