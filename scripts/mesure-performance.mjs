#!/usr/bin/env node
/**
 * INDICATEUR DE PERFORMANCE — coût des dérivations du journal d'argent à l'échelle.
 *
 * Une fois tout dérivé du journal, il faut vérifier que ça reste fluide avec des
 * milliers de mouvements. On mesure, pour N transactions d'un jour :
 *   • temps de la DÉRIVATION de caisse (SQL, côté serveur) ;
 *   • temps + taille du CHARGEMENT ACCUEIL (GET /caisse/transactions — ce que
 *     l'appli télécharge avant de dériver côté client).
 *
 * Les lignes de test sont marquées PERF_SEED et SUPPRIMÉES à la fin (aucune
 * pollution des données ni des invariantes).
 *
 * Env : N (défaut 5000), API_URL, DB_*, PHONE/PASS (marchande de démo).
 */
import { createRequire } from 'node:module';
const require = createRequire(new URL('../backend/package.json', import.meta.url));
const { Client } = require('pg');

const N = Number(process.env.N || 5000);
const API = process.env.API_URL || 'http://127.0.0.1:3000/api/v1';
const PHONE = process.env.AWA_PHONE || '+2250726262626';
const PASS = process.env.AWA_PASS || '0000';

const db = new Client({
  host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 5433),
  user: process.env.DB_USERNAME || 'postgres', password: process.env.DB_PASSWORD || undefined,
  database: process.env.DB_NAME || 'julaba',
});

const now = () => Number(process.hrtime.bigint() / 1000000n);
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

try {
  await db.connect();
  const login = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: PHONE, password: PASS }) })).json();
  const token = login.accessToken, mid = login.user?.id;
  if (!token || !mid) throw new Error('login échoué');

  console.log(`\n📊 Mesure de performance — ${N} mouvements sur la journée.\n`);

  // Nettoyage préalable + seed en masse (rapide) de N ventes marquées.
  await db.query(`DELETE FROM caisse_transactions WHERE marchand_id=$1 AND description='PERF_SEED'`, [mid]);
  const t0 = now();
  await db.query(
    `INSERT INTO caisse_transactions (type, montant, description, user_id, marchand_id, created_at)
     SELECT 'vente', 100 + (g % 50), 'PERF_SEED', $1, $1, now()
       FROM generate_series(1, $2) g`,
    [mid, N],
  );
  console.log(`   Semé ${N} mouvements en ${now() - t0} ms.`);

  const total = (await db.query(`SELECT count(*)::int AS n FROM caisse_transactions WHERE marchand_id=$1 AND created_at::date=CURRENT_DATE`, [mid])).rows[0].n;

  // 1) Dérivation de caisse (SQL) — médiane sur 5 exécutions
  const derivSql = `SELECT coalesce(sum(CASE type WHEN 'vente' THEN montant WHEN 'encaissement_credit' THEN montant WHEN 'depense' THEN -montant ELSE 0 END),0) AS caisse
                      FROM caisse_transactions WHERE marchand_id=$1 AND created_at::date=CURRENT_DATE`;
  const dTimes = [];
  for (let i = 0; i < 5; i++) { const t = now(); await db.query(derivSql, [mid]); dTimes.push(now() - t); }

  // 2) Chargement accueil (HTTP) — médiane sur 5 exécutions
  const hTimes = []; let bytes = 0;
  for (let i = 0; i < 5; i++) {
    const t = now();
    const res = await fetch(`${API}/caisse/transactions`, { headers: { Authorization: `Bearer ${token}` } });
    const buf = await res.arrayBuffer(); bytes = buf.byteLength;
    hTimes.push(now() - t);
  }

  console.log(`\n   ── Résultats (${total} mouvements ce jour) ──`);
  console.log(`   • Dérivation caisse (SQL serveur) : ${median(dTimes)} ms (médiane)`);
  console.log(`   • Chargement accueil GET /caisse/transactions : ${median(hTimes)} ms (médiane), ${(bytes / 1024).toFixed(0)} Ko`);
  console.log(`   • Coût par mouvement (chargement) : ${(median(hTimes) / total).toFixed(3)} ms/mvt`);

  // Nettoyage — aucune pollution
  const del = await db.query(`DELETE FROM caisse_transactions WHERE marchand_id=$1 AND description='PERF_SEED'`, [mid]);
  console.log(`\n   Nettoyage : ${del.rowCount} lignes PERF_SEED supprimées.\n`);
} catch (e) {
  console.error('Erreur mesure performance : ' + (e?.message || e));
  process.exit(2);
} finally {
  await db.end().catch(() => {});
}
