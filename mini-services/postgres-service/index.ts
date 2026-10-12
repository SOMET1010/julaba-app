/**
 * JULABA sandbox — service PostgreSQL embarqué.
 *
 * Le backend NestJS (TypeORM) exige un PostgreSQL sur :5432. Le sandbox n'en
 * fournit pas : ce mini-service initialise et démarre les binaires natifs
 * PostgreSQL 17 (fournis par `@embedded-postgres/linux-x64`) directement,
 * SANS le wrapper `embedded-postgres` qui impose la locale `en_US.UTF-8`
 * (absente du sandbox → initdb échoue).
 *
 * Port fixe : 5432 (attendu par backend/.env : user `julaba`, base `julaba_dev`).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const PORT = 5432;
const DATA_DIR = path.resolve(import.meta.dir, 'pgdata');
const BIN = path.resolve(
  import.meta.dir,
  'node_modules/@embedded-postgres/linux-x64/native/bin',
);
const LOG_FILE = path.join(DATA_DIR, 'server.log');

function run(cmd: string, args: string[]): { code: number; out: string } {
  const r = spawnSync(cmd, args, { encoding: 'utf-8' });
  return { code: r.status ?? 1, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  // 1) Initialisation du cluster (une seule fois)
  if (!existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
    console.log('[pg] initdb (nouveau cluster)...');
    const init = run(path.join(BIN, 'initdb'), [
      `--pgdata=${DATA_DIR}`,
      '--username=julaba',
      '--auth=trust',
      '--encoding=UTF8',
      '--locale=C',
    ]);
    if (init.code !== 0) {
      console.error('[pg] initdb a échoué :\n' + init.out);
      process.exit(1);
    }
    console.log('[pg] cluster initialisé');
  }

  // 2) Démarrage du serveur (daemon via pg_ctl)
  const status = run(path.join(BIN, 'pg_ctl'), [
    `-D`,
    DATA_DIR,
    'status',
  ]);
  if (status.code !== 0) {
    console.log(`[pg] démarrage du serveur sur le port ${PORT}...`);
    const start = run(path.join(BIN, 'pg_ctl'), [
      `-D`,
      DATA_DIR,
      `-l`,
      LOG_FILE,
      `-o`,
      `-p ${PORT} -k /tmp -c listen_addresses="127.0.0.1"`,
      'start',
    ]);
    if (start.code !== 0) {
      console.error('[pg] pg_ctl start a échoué :\n' + start.out);
      process.exit(1);
    }
    console.log('[pg] serveur démarré');
  } else {
    console.log('[pg] serveur déjà en cours d\'exécution');
  }

  // 3) Création de la base julaba_dev (idempotent)
  const client = new Client({
    host: '127.0.0.1',
    port: PORT,
    user: 'julaba',
    database: 'postgres',
  });
  for (let tentative = 1; tentative <= 10; tentative++) {
    try {
      await client.connect();
      break;
    } catch (e) {
      if (tentative === 10) {
        console.error('[pg] impossible de se connecter :', e);
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  const res = await client.query(
    `SELECT 1 FROM pg_database WHERE datname = 'julaba_dev'`,
  );
  if (res.rowCount === 0) {
    await client.query(`CREATE DATABASE julaba_dev OWNER julaba`);
    console.log('[pg] base julaba_dev créée');
  } else {
    console.log('[pg] base julaba_dev déjà présente');
  }
  await client.end();

  console.log(`[pg] prêt : postgresql://julaba@127.0.0.1:${PORT}/julaba_dev`);

  // Maintenir le service en vie pour la supervision du sandbox
  const keepAlive = setInterval(() => {}, 1 << 30);
  const shutdown = () => {
    clearInterval(keepAlive);
    run(path.join(BIN, 'pg_ctl'), [`-D`, DATA_DIR, 'stop', '-m', 'fast']);
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void main();
