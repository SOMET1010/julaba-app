/**
 * Décision des flags de schéma au démarrage (main.ts / prepareDatabase).
 *
 * Fonction PURE (testable sans base) : à partir de l'état de la base (vierge ou
 * non) et de l'environnement, elle décide `DB_SYNCHRONIZE` et `DB_MIGRATIONS_RUN`.
 *
 * Historique : avant la convergence #10, le boot FORÇAIT `DB_MIGRATIONS_RUN=false`
 * en toutes circonstances (l'historique de migrations était incomplet et échouait
 * sur base neuve). Depuis #10, la chaîne de migrations est AUTORITAIRE (baseline
 * fidèle + migrations reproductibles) : sur une base existante, il faut RESPECTER
 * le réglage d'env `DB_MIGRATIONS_RUN` (dashboard) au lieu de l'écraser — sinon
 * les migrations ne s'appliquent jamais en prod (bug révélé par #19).
 */
export type DbBootFlags = { synchronize: 'true' | 'false'; migrationsRun: 'true' | 'false' };

export function computeBootDbFlags(
  vierge: boolean,
  env: NodeJS.ProcessEnv = process.env,
): DbBootFlags {
  if (vierge) {
    // Base NEUVE : on construit le schéma depuis les entités (synchronize). Pas de
    // migrations (elles supposent la baseline déjà appliquée).
    return { synchronize: 'true', migrationsRun: 'false' };
  }
  // Base EXISTANTE (prod) : JAMAIS de reconstruction (sinon « relation … already
  // exists »). On respecte `DB_MIGRATIONS_RUN` d'env : c'est lui qui pilote
  // l'application automatique des migrations au boot (activé en prod depuis #10).
  return {
    synchronize: 'false',
    migrationsRun: env.DB_MIGRATIONS_RUN === 'true' ? 'true' : 'false',
  };
}
