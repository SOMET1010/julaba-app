// globalSetup — recrée une base ENTIÈREMENT JETABLE avant la suite : DROP + CREATE.
// Garantit une base vierge et isolée à chaque exécution.

import { TEST_DB, assertBaseDeTest } from './test-db';

export default async function globalSetup(): Promise<void> {
  process.env.NODE_ENV = 'test';
  assertBaseDeTest();

  // pg sans @types → require (typé any). On se connecte à la base de maintenance
  // "postgres" pour pouvoir DROP/CREATE la base de test.
  const { Client } = require('pg');
  const admin = new Client({
    host: TEST_DB.host,
    port: TEST_DB.port,
    user: TEST_DB.user,
    password: TEST_DB.password,
    database: 'postgres',
  });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${TEST_DB.name}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${TEST_DB.name}"`);
  await admin.end();
  // eslint-disable-next-line no-console
  console.log(`[invariants] base jetable recréée : ${TEST_DB.name} @ ${TEST_DB.host}:${TEST_DB.port}`);
}
