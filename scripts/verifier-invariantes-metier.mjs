#!/usr/bin/env node
/**
 * GARDE-FOU CONSTITUTION §7/§8 — Invariantes MÉTIER (au-delà de l'argent).
 *
 * Les règles métier deviennent aussi protégées que les règles comptables.
 * Exit 1 au moindre manquement.
 *
 *   1. Un crédit ne peut jamais être remboursé plus que son montant (acompte ≤ total).
 *   2. Une vente ne peut pas faire passer le stock sous zéro (si le stock est suivi).
 *   3. Une session ouverte ne peut pas avoir deux fonds initiaux (une seule par jour).
 *   4. Une fermeture ne peut pas exister sans ouverture.
 *
 * Connexion : DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME (ou DATABASE_URL).
 */
import { createRequire } from 'node:module';
const require = createRequire(new URL('../backend/package.json', import.meta.url));
const { Client } = require('pg');

const client = process.env.DATABASE_URL
  ? new Client({ connectionString: process.env.DATABASE_URL })
  : new Client({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 5433),
      user: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || undefined,
      database: process.env.DB_NAME || 'julaba',
    });

const violations = [];
const ok = (label) => console.log(`   ✓ ${label}`);

try {
  await client.connect();

  // 1. Crédit remboursé ≤ montant
  const surRembourse = await client.query(
    `SELECT id, client_nom, montant_total, acompte FROM credits
      WHERE coalesce(acompte,0) > coalesce(montant_total,0) + 0.001`,
  );
  if (surRembourse.rows.length) {
    for (const r of surRembourse.rows) violations.push(`1. Crédit sur-remboursé : ${r.client_nom} acompte ${r.acompte} > total ${r.montant_total}`);
  } else ok('Aucun crédit remboursé au-delà de son montant');

  // 2. Stock jamais négatif (si suivi)
  const stockNeg = await client.query(`SELECT id, nom, stock FROM produits WHERE stock < 0`);
  if (stockNeg.rows.length) {
    for (const r of stockNeg.rows) violations.push(`2. Stock négatif : ${r.nom} = ${r.stock}`);
  } else ok('Aucun stock négatif');

  // 3. Une seule session par (marchand, jour)
  const dupSession = await client.query(
    `SELECT marchand_id, date, count(*) AS n FROM caisse_sessions GROUP BY marchand_id, date HAVING count(*) > 1`,
  );
  if (dupSession.rows.length) {
    for (const r of dupSession.rows) violations.push(`3. Deux fonds initiaux : marchand ${r.marchand_id} / ${r.date?.toISOString?.().slice(0,10) || r.date} (${r.n} sessions)`);
  } else ok('Une seule session (un seul fond initial) par marchand et par jour');

  // 4. Pas de fermeture sans ouverture
  const fermetureSansOuverture = await client.query(
    `SELECT marchand_id, date FROM caisse_sessions
      WHERE heure_fermeture IS NOT NULL AND heure_ouverture IS NULL`,
  );
  if (fermetureSansOuverture.rows.length) {
    for (const r of fermetureSansOuverture.rows) violations.push(`4. Fermeture sans ouverture : ${r.marchand_id} / ${r.date}`);
  } else ok('Aucune fermeture sans ouverture');

  if (violations.length) {
    console.error('\n❌ INVARIANTE MÉTIER VIOLÉE — Constitution §7/§8.\n');
    for (const v of violations) console.error('   • ' + v);
    console.error('');
    process.exit(1);
  }

  console.log('\n✅ Invariantes métier vertes.');
} catch (e) {
  console.error('Erreur exécution invariantes métier : ' + (e?.message || e));
  process.exit(2);
} finally {
  await client.end().catch(() => {});
}
