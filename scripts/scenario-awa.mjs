#!/usr/bin/env node
/**
 * SCÉNARIO MÉTIER — « La journée d'Awa »  (test rejouable, niveau données/API)
 *
 * Awa ouvre sa journée à 5 000 → perd le réseau → ferme l'appli → la rouvre →
 * fait une vente → retrouve le réseau → synchronisation → fermeture de caisse.
 *
 * Ce script reproduit fidèlement le CHEMIN DES DONNÉES (idempotence, rejeu de la
 * file, dérivation de la caisse). Les étapes purement NAVIGATEUR (persistance
 * localStorage après fermeture forcée, file IndexedDB) sont notées « par
 * construction » — un vrai test navigateur (Playwright) est le prochain palier
 * pour les « valider par scénario métier » dans l'UI.
 *
 * Env : API_URL (défaut http://127.0.0.1:3000/api/v1), DB_* pour les assertions,
 *       AWA_PHONE / AWA_PASS (défaut : marchande de démo).
 */
import { createRequire } from 'node:module';
const require = createRequire(new URL('../backend/package.json', import.meta.url));
const { Client } = require('pg');

const API = process.env.API_URL || 'http://127.0.0.1:3000/api/v1';
const PHONE = process.env.AWA_PHONE || '+2250726262626';
const PASS = process.env.AWA_PASS || '0000';

const db = new Client({
  host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 5433),
  user: process.env.DB_USERNAME || 'postgres', password: process.env.DB_PASSWORD || undefined,
  database: process.env.DB_NAME || 'julaba',
});

let failures = 0;
const check = (label, cond) => { console.log(`   ${cond ? '✅' : '❌'} ${label}`); if (!cond) failures++; };
const q1 = async (sql, p = []) => (await db.query(sql, p)).rows[0];

async function post(token, path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) };
}

try {
  await db.connect();
  const login = await post('', '/auth/login', { phone: PHONE, password: PASS });
  const token = login.json.accessToken;
  const mid = login.json.user?.id;
  if (!token || !mid) throw new Error('login échoué');
  const today = new Date().toISOString().split('T')[0];

  console.log('\n🌅 Journée d\'Awa — début. On nettoie sa journée (état initial).');
  await db.query(`DELETE FROM caisse_transactions WHERE marchand_id=$1 AND created_at::date=CURRENT_DATE`, [mid]);
  await db.query(`DELETE FROM caisse_sessions WHERE marchand_id=$1 AND date=$2`, [mid, today]);

  // Clés d'idempotence stables (celles que le frontend génère et rejoue).
  const cleOuverture = `session-ouvrir-${mid}-${today}`;
  const cleVente = `awa-vente-${today}-1`;

  console.log('\n① Awa ouvre sa journée à 5 000 — SANS RÉSEAU.');
  console.log('   (hors-ligne : l\'ouverture part dans la file durable ; rien n\'est encore côté serveur)');
  // File hors-ligne simulée : on N'appelle PAS le backend.
  const fileHorsLigne = [
    { path: '/caisse/session/ouvrir', body: { fond_initial: 5000, notes: 'ouverture Awa', idempotency_key: cleOuverture } },
  ];
  let sessionServeur = await q1(`SELECT count(*)::int AS n FROM caisse_sessions WHERE marchand_id=$1 AND date=$2`, [mid, today]);
  check('Côté serveur : aucune session encore (normal, hors-ligne)', sessionServeur.n === 0);
  console.log('   → Awa, elle, voit sa journée ouverte à 5 000 (session locale — par construction).');

  console.log('\n② Awa FERME l\'application puis la ROUVRE (toujours sans réseau).');
  console.log('   → l\'appli restaure la session locale (5 000) — par construction (localStorage).');
  const sessionApresReouverture = await post(token, '/caisse/session/' + today, {}).catch(() => null);
  // GET en fait : on vérifie que le serveur ne connaît toujours pas la session.
  const getRes = await fetch(`${API}/caisse/session/${today}`, { headers: { Authorization: `Bearer ${token}` } });
  const getJson = await getRes.json();
  check('Après réouverture, le serveur ne crée rien de fantôme (session serveur toujours nulle)', !getJson.session);

  console.log('\n③ Awa fait une vente de 3 000 (espèces) — TOUJOURS hors-ligne → en file.');
  fileHorsLigne.push({ path: '/caisse/vente', body: {
    montant: 3000, mode_paiement: 'especes',
    produits: [{ nom: 'Tomate', quantite: 3, prix: 1000, prix_achat: 600 }],
    details: [{ nom: 'Tomate', quantite: 3, prix: 1000, total: 3000, prix_achat: 600 }],
    idempotency_key: cleVente,
  } });
  const venteServeur = await q1(`SELECT count(*)::int AS n FROM caisse_transactions WHERE marchand_id=$1 AND type='vente' AND created_at::date=CURRENT_DATE`, [mid]);
  check('Côté serveur : aucune vente encore (elle est en file)', venteServeur.n === 0);

  console.log('\n④ Le RÉSEAU revient → SYNCHRONISATION : rejeu de la file dans l\'ordre.');
  for (const op of fileHorsLigne) {
    const r = await post(token, op.path, op.body);
    check(`   rejeu ${op.path} → ${r.status}`, r.ok);
  }

  console.log('\n⑤ Le réseau retombe pendant la sync → on REJOUE ENCORE (double rejeu).');
  console.log('   (idempotence : ne doit créer NI 2e session NI 2e vente)');
  for (const op of fileHorsLigne) await post(token, op.path, op.body);

  const sess = await q1(`SELECT count(*)::int AS n, max(fond_initial) AS fond FROM caisse_sessions WHERE marchand_id=$1 AND date=$2`, [mid, today]);
  const vte = await q1(`SELECT count(*)::int AS n, coalesce(sum(montant),0)::int AS total FROM caisse_transactions WHERE marchand_id=$1 AND type='vente' AND created_at::date=CURRENT_DATE`, [mid]);
  check('Après double rejeu : 1 seule session', sess.n === 1);
  check('Après double rejeu : fond initial = 5 000', Number(sess.fond) === 5000);
  check('Après double rejeu : 1 seule vente (pas de double-comptage)', vte.n === 1);
  check('Après double rejeu : total ventes = 3 000', vte.total === 3000);

  console.log('\n⑥ Awa ferme sa caisse. Caisse attendue = 5 000 + 3 000 = 8 000.');
  const caisseAttendue = 5000 + 3000;
  const ferm = await post(token, '/caisse/session/fermer', { comptage_reel: caisseAttendue, notes: 'fin de journée Awa' });
  check('   fermeture acceptée', ferm.ok);
  const sFinal = await q1(`SELECT ouvert, fond_final FROM caisse_sessions WHERE marchand_id=$1 AND date=$2`, [mid, today]);
  check('Journée fermée (ouvert=false)', sFinal.ouvert === false);
  check('Comptage réel enregistré = 8 000', Number(sFinal.fond_final) === 8000);

  console.log('\n🔒 Vérification des invariantes après la journée d\'Awa :');
  const inv = await q1(
    `SELECT coalesce(fond_initial,0)
        + coalesce((SELECT sum(montant) FROM caisse_transactions WHERE marchand_id=$1 AND type='vente' AND created_at::date=CURRENT_DATE),0)
        + coalesce((SELECT sum(montant) FROM caisse_transactions WHERE marchand_id=$1 AND type='encaissement_credit' AND created_at::date=CURRENT_DATE),0)
        - coalesce((SELECT sum(montant) FROM caisse_transactions WHERE marchand_id=$1 AND type='depense' AND created_at::date=CURRENT_DATE),0)
       AS caisse_derivee
       FROM caisse_sessions WHERE marchand_id=$1 AND date=$2`, [mid, today]);
  check('Invariante : caisse dérivée = 8 000 (fond + Σ mouvements)', Number(inv.caisse_derivee) === 8000);

  console.log(`\n${failures === 0 ? '✅ SCÉNARIO AWA : VALIDÉ' : `❌ SCÉNARIO AWA : ${failures} assertion(s) en échec`}\n`);
  process.exit(failures === 0 ? 0 : 1);
} catch (e) {
  console.error('Erreur scénario Awa : ' + (e?.message || e));
  process.exit(2);
} finally {
  await db.end().catch(() => {});
}
