/**
 * JULABA sandbox — garantie PostgreSQL avant le démarrage du stack.
 *
 * Appelé par le script `dev` racine (bun mini-services/postgres-service/up.ts)
 * AVANT `concurrently` : s'assure qu'un PostgreSQL répond sur :5432 avec la
 * base `julaba_dev`, puis TERMIN (le serveur PG tourne en daemon via pg_ctl,
 * il n'a pas besoin de ce process).
 *
 * CONTRAT FAIL-SOFT : en cas d'impossibilité (binaires absents, bun absent,
 * port occupé par autre chose), on AVERTIT et on sort 0 — le `dev` du dépôt
 * doit rester utilisable partout ; le backend NestJS a déjà ses propres
 * retries TypeORM et son écran d'erreur.
 *
 * Idempotent : cluster déjà initialisé → pas d'initdb ; serveur déjà lancé →
 * pas de pg_ctl start ; base déjà créée → pas de CREATE DATABASE.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const PORT = 5432;
const SERVICE_DIR = path.resolve(import.meta.dir);
const DATA_DIR = path.join(SERVICE_DIR, 'pgdata');
const BIN = path.join(
  SERVICE_DIR,
  'node_modules/@embedded-postgres/linux-x64/native/bin',
);
const LOG_FILE = path.join(DATA_DIR, 'server.log');

function run(cmd: string, args: string[]): { code: number; out: string } {
  const r = spawnSync(cmd, args, { encoding: 'utf-8' });
  return { code: r.status ?? 1, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

async function main(): Promise<void> {
  // 0) Pré-requis : binaires natifs présents (npm install fait dans le service)
  if (!existsSync(path.join(BIN, 'pg_ctl'))) {
    console.warn(
      '[pg] binaires PostgreSQL absents (' +
        BIN +
        ') — démarrage du service ignoré. ' +
        'Le backend tentera localhost:5432 ; pour installer le PG embarqué : ' +
        'cd mini-services/postgres-service && npm install',
    );
    return;
  }
  mkdirSync(DATA_DIR, { recursive: true });

  // 1) Cluster initialisé ?
  if (!existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
    console.log('[pg] initdb (nouveau cluster, locale C, auth trust)...');
    const init = run(path.join(BIN, 'initdb'), [
      `--pgdata=${DATA_DIR}`,
      '--username=julaba',
      '--auth=trust',
      '--encoding=UTF8',
      '--locale=C',
    ]);
    if (init.code !== 0) {
      console.warn('[pg] initdb a échoué, service ignoré :\n' + init.out);
      return;
    }
  }

  // 2) Serveur démarré ? (daemon — survit à ce script)
  const status = run(path.join(BIN, 'pg_ctl'), ['-D', DATA_DIR, 'status']);
  if (status.code !== 0) {
    console.log(`[pg] démarrage du serveur sur le port ${PORT}...`);
    const start = run(path.join(BIN, 'pg_ctl'), [
      '-D',
      DATA_DIR,
      '-l',
      LOG_FILE,
      '-o',
      `-p ${PORT} -k /tmp -c listen_addresses="127.0.0.1"`,
      'start',
    ]);
    if (start.code !== 0) {
      console.warn('[pg] pg_ctl start a échoué, service ignoré :\n' + start.out);
      return;
    }
  }

  // 3) Base julaba_dev prête ? (avec patience : le serveur vient peut-être
  //    tout juste de démarrer)
  let client: Client | null = null;
  for (let tentative = 1; tentative <= 15; tentative++) {
    try {
      client = new Client({
        host: '127.0.0.1',
        port: PORT,
        user: 'julaba',
        database: 'postgres',
        connectionTimeoutMillis: 3000,
      });
      await client.connect();
      break;
    } catch {
      client = null;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  if (!client) {
    console.warn(
      `[pg] injoignable sur 127.0.0.1:${PORT} après 15 s — service ignoré. ` +
        'Le backend NestJS réessaiera de son côté (retries TypeORM).',
    );
    return;
  }
  try {
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = 'julaba_dev'`,
    );
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE julaba_dev OWNER julaba`);
      console.log('[pg] base julaba_dev créée');
    }
  } finally {
    await client.end().catch(() => {});
  }

  console.log(`[pg] prêt : postgresql://julaba@127.0.0.1:${PORT}/julaba_dev`);
}

main().catch((e) => {
  console.warn('[pg] erreur inattendue (dev poursuivi) :', e);
  process.exit(0);
});
