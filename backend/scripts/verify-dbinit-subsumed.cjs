/**
 * ADR-0002 Étape 2 — preuve « DbInit ⊆ migrations ».
 *
 * Construit une base NEUVE depuis la chaîne de migrations (baseline + lot), puis
 * exécute DbInitService.runInit() par-dessus et vérifie qu'il ne change RIEN au
 * schéma (0 objet ajouté/retiré). Autrement dit : la baseline subsume déjà tout
 * le DDL idempotent de DbInit — DbInit est un filet de sécurité redondant pour
 * les bases neuves. Toute future modification de schéma doit passer par une
 * MIGRATION (sinon ce contrôle échoue).
 *
 * Prérequis : `npm run build` (dist présent) + un Postgres joignable + les
 * variables DB_* (DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD) et DB_NAME pointant
 * une base JETABLE dédiée. Étape 4 branchera ce script dans la CI.
 *
 * Sortie : code 0 si DbInit ne change rien ; code 1 sinon (avec le détail).
 */
require('reflect-metadata');
const path = require('path');
const { DataSource } = require('typeorm');
const { DbInitService } = require(path.join(__dirname, '../dist/database/db-init.service'));

const SNAPSHOT = `
  SELECT 'col:'||table_name||'.'||column_name||':'||data_type||':'||is_nullable AS s
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name<>'migrations'
  UNION ALL
  SELECT 'con:'||conname||':'||contype::text||':'||conrelid::regclass::text
    FROM pg_constraint
   WHERE connamespace='public'::regnamespace AND conname NOT LIKE 'PK_%'
  UNION ALL
  SELECT 'idx:'||indexname||':'||tablename FROM pg_indexes WHERE schemaname='public'
  UNION ALL
  SELECT 'view:'||table_name FROM information_schema.views WHERE table_schema='public'
  ORDER BY 1`;

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || 'julaba_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    migrations: [path.join(__dirname, '../dist/database/migrations/*.js')],
    synchronize: false,
    logging: false,
  });
  await ds.initialize();
  const applied = await ds.runMigrations();
  console.log('Migrations appliquées :', applied.map((m) => m.name).join(', ') || '(aucune)');

  const before = (await ds.query(SNAPSHOT)).map((r) => r.s);
  await new DbInitService(ds).runInit();
  const after = (await ds.query(SNAPSHOT)).map((r) => r.s);
  await ds.destroy();

  const added = after.filter((x) => !before.includes(x));
  const removed = before.filter((x) => !after.includes(x));
  console.log(`Objets de schéma : ${before.length} | DbInit a ajouté ${added.length}, retiré ${removed.length}`);
  if (added.length || removed.length) {
    added.forEach((x) => console.log('  +' + x));
    removed.forEach((x) => console.log('  -' + x));
    console.error('❌ DbInit modifie le schéma construit par les migrations : à folder dans une migration.');
    process.exit(1);
  }
  console.log('✅ DbInit ⊆ migrations : DbInit ne change rien au schéma construit par les migrations.');
}

main().catch((e) => {
  console.error('ERREUR', e && e.message ? e.message : e);
  process.exit(1);
});
