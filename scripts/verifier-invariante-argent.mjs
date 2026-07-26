#!/usr/bin/env node
/**
 * GARDE-FOU CONSTITUTION §7 & ADR-001 — Invariante d'argent.
 *
 * L'argent est un journal append-only ; toute vue en est DÉRIVÉE. On vérifie que
 * cette dérivation tient toujours :
 *
 *   INVARIANTE :  caisse = fond_initial + Σ(mouvements signés du journal)
 *
 * Contrôles (exit 1 au moindre manquement) :
 *   A. Une seule session par (marchand, jour) — le fond initial est créé UNE fois.
 *   B. Aucun mouvement d'argent d'un type NON classé (+/−) : sinon de l'argent
 *      entre dans le journal sans être compté par aucune vue (ADR-001).
 *   C. La caisse dérivée par somme-par-type == la caisse dérivée par somme signée
 *      unique (pas de divergence entre deux chemins de calcul).
 *
 * Connexion : DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME (ou DATABASE_URL).
 * Usage : node scripts/verifier-invariante-argent.mjs
 */
import { createRequire } from 'node:module';
const require = createRequire(new URL('../backend/package.json', import.meta.url));
const { Client } = require('pg');

// Types de mouvements et leur signe. Un type absent d'ici = argent non compté.
const SIGNES = { vente: +1, encaissement_credit: +1, depense: -1 };

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

try {
  await client.connect();

  // A. Doublons de session (le fond initial doit être créé une seule fois)
  const dups = await client.query(
    `SELECT marchand_id, date, count(*) AS n
       FROM caisse_sessions GROUP BY marchand_id, date HAVING count(*) > 1`,
  );
  for (const r of dups.rows) violations.push(`A. Session en double : marchand ${r.marchand_id} / ${r.date.toISOString?.().slice(0,10) || r.date} (${r.n} sessions)`);

  // B. Mouvements d'argent d'un type non classé
  const known = Object.keys(SIGNES);
  const unknown = await client.query(
    `SELECT type, count(*) AS n, coalesce(sum(montant),0) AS total
       FROM caisse_transactions
      WHERE type <> ALL($1::text[]) AND coalesce(montant,0) <> 0
      GROUP BY type`,
    [known],
  );
  for (const r of unknown.rows) violations.push(`B. Type d'argent NON classé « ${r.type} » : ${r.n} mvt(s), ${r.total} F non comptés par aucune vue`);

  // C. Caisse dérivée — deux chemins doivent coïncider
  const rows = await client.query(
    `SELECT s.marchand_id, s.date, coalesce(s.fond_initial,0) AS fond,
        coalesce(sum(t.montant) FILTER (WHERE t.type='vente'),0)               AS ventes,
        coalesce(sum(t.montant) FILTER (WHERE t.type='encaissement_credit'),0) AS enc,
        coalesce(sum(t.montant) FILTER (WHERE t.type='depense'),0)             AS dep,
        coalesce(sum(CASE t.type WHEN 'vente' THEN t.montant
                                 WHEN 'encaissement_credit' THEN t.montant
                                 WHEN 'depense' THEN -t.montant ELSE 0 END),0) AS signed_sum
       FROM caisse_sessions s
       LEFT JOIN caisse_transactions t
         ON t.marchand_id = s.marchand_id AND t.created_at::date = s.date
      GROUP BY s.marchand_id, s.date, s.fond_initial
      ORDER BY s.date`,
  );

  let sessions = 0;
  for (const r of rows.rows) {
    sessions++;
    const fond = Number(r.fond), ventes = Number(r.ventes), enc = Number(r.enc), dep = Number(r.dep), signed = Number(r.signed_sum);
    const caisseParType = fond + ventes + enc - dep;
    const caisseSignee = fond + signed;
    if (fond < 0) violations.push(`C. Fond initial négatif : ${r.marchand_id} / ${r.date} = ${fond}`);
    if (caisseParType !== caisseSignee) {
      violations.push(`C. Divergence de dérivation : ${r.marchand_id} / ${r.date} → par-type=${caisseParType} ≠ signée=${caisseSignee}`);
    }
  }

  if (violations.length) {
    console.error('\n❌ INVARIANTE D\'ARGENT VIOLÉE — Constitution §7 / ADR-001.\n');
    for (const v of violations) console.error('   • ' + v);
    console.error('');
    process.exit(1);
  }

  console.log(`✅ Invariante d'argent verte : ${sessions} session(s) vérifiée(s), 3 types classés, aucun doublon, aucune divergence.`);
  console.log(`   caisse = fond_initial + Σ(ventes + encaissements_crédit − dépenses) — tient partout.`);
} catch (e) {
  console.error('Erreur exécution invariante : ' + (e?.message || e));
  process.exit(2);
} finally {
  await client.end().catch(() => {});
}
