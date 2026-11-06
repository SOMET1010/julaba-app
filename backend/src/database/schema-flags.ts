/**
 * Décision des flags de schéma au démarrage (main.ts / prepareDatabase).
 *
 * Fonction PURE (testable sans base) : à partir de l'état de la base (vierge ou
 * non, historique de migrations amorcé ou non) et de l'environnement, elle
 * décide `DB_SYNCHRONIZE` et `DB_MIGRATIONS_RUN`.
 *
 * Historique : avant la convergence #10, le boot FORÇAIT `DB_MIGRATIONS_RUN=false`
 * en toutes circonstances (l'historique de migrations était incomplet et échouait
 * sur base neuve). Depuis #10, la chaîne de migrations est AUTORITAIRE (baseline
 * fidèle + migrations reproductibles) : sur une base existante, il faut RESPECTER
 * le réglage d'env `DB_MIGRATIONS_RUN` (dashboard) au lieu de l'écraser — sinon
 * les migrations ne s'appliquent jamais en prod (bug révélé par #19).
 *
 * Garde du 06/11/2026 (sans contradiction avec #19) : respecter le drapeau
 * suppose que l'HISTORIQUE est amorcé — la table `public.migrations` existe
 * (geste du RUNBOOK `docs/etape4/RUNBOOK-bascule-migrations.md` § Phase 3,
 * étape 2). Sans elle, TypeORM croit toute la chaîne « en attente » et rejoue
 * la baseline sur un schéma existant : `CREATE EXTENSION "uuid-ossp"` (refusée
 * par Azure) puis « already exists » — c'est l'incident du 18/09/2026, mort au
 * démarrage. Sur une base alignée en SQL direct (Azure, 06/11) la table
 * `migrations` n'existe pas : un drapeau resté à `true` y casserait le boot.
 * Le drapeau est donc IGNORÉ (avec avertissement côté main.ts) tant que
 * l'amorçage n'a pas été fait.
 */
export type DbBootFlags = { synchronize: 'true' | 'false'; migrationsRun: 'true' | 'false' };

export function computeBootDbFlags(
  vierge: boolean,
  env: NodeJS.ProcessEnv = process.env,
  historiqueMigrationsAmorce = true,
): DbBootFlags {
  if (vierge) {
    // Base NEUVE : on construit le schéma depuis les entités (synchronize). Pas de
    // migrations (elles supposent la baseline déjà appliquée).
    return { synchronize: 'true', migrationsRun: 'false' };
  }
  // Base EXISTANTE (prod) : JAMAIS de reconstruction (sinon « relation … already
  // exists »). On respecte `DB_MIGRATIONS_RUN` d'env — SEULEMENT si l'historique
  // est amorcé (table `migrations` présente) : sans lui, la chaîne démarre par la
  // baseline et le boot meurt (incident 18/09/2026). C'est l'amorçage du RUNBOOK
  // qui ouvre le droit au drapeau, pas le drapeau qui crée l'amorçage.
  const migrationsDemandees = env.DB_MIGRATIONS_RUN === 'true';
  return {
    synchronize: 'false',
    migrationsRun: migrationsDemandees && historiqueMigrationsAmorce ? 'true' : 'false',
  };
}
