// ──────────────────────────────────────────────────────────────────────────
// RECETTE PILOTE-3 — catalogue Odoo branché dans le flux JULABA.
//
// La question : une marchande peut-elle retrouver un produit du référentiel
// Odoo, en faire SON article à SON prix, et le vendre — sans jamais dépendre
// d'Odoo au moment où elle vend ?
//
// CE SCRIPT TOURNE AVEC ODOO INJOIGNABLE. Ce n'est pas une facilité de test,
// c'est le cœur de la démonstration : le backend est démarré avec
// `ODOO_CLIENT_MODE=real` pointant vers un port mort. Tout ce qui passe
// ci-dessous passe donc SANS Odoo. Et la vente réussie en fin de recette
// prouve mieux qu'aucune assertion qu'aucune écriture ne part vers Odoo :
// il n'y a personne au bout du fil.
//
//     Odoo 19 ──(synchro admin)──> catalogue_maitre ──> cache téléphone
//                  [coupé ici]          [sert]            [sert]
//
// ARBITRE : PostgreSQL. Jamais l'écran, jamais une lecture d'API.
//
// La phase « Odoo joignable » (synchronisation, idempotence, comptage des
// références) est assurée AVANT par run-recette-pilote3.sh, qui démarre le
// backend une première fois avec un Odoo accessible.
//
// Sortie : GO PILOTE-3, ou NO-GO + le premier invariant cassé.
// ──────────────────────────────────────────────────────────────────────────
import { chromium } from 'playwright-core';
import pg from 'pg';

const EXEC = process.env.CHROMIUM_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = process.env.RECETTE_BASE || 'http://127.0.0.1:4180';
const OUT = process.env.RECETTE_OUT || '/tmp/recette-pilote3';
/** Nombre de références attendues dans le miroir. 198 contre le vrai Odoo du
 *  POC, 8 avec le client simulé — d'où le paramètre plutôt qu'un nombre figé
 *  qui mentirait dans l'un des deux cas. */
const REFERENCES_ATTENDUES = Number(process.env.REFERENCES_ATTENDUES || 8);

const MARCHANDE = { phone: '+2250700000009', password: '1234' };
const ADMIN = { phone: '+2250700000016', password: '123456' };
/** Référence à adopter : elle doit exister dans le référentiel et ne pas déjà
 *  appartenir à la marchande. */
const REF = { code: process.env.REF_CODE || 'CAR-001', nom: process.env.REF_NOM || 'Carotte' };
const PRIX = 750;

const db = new pg.Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME || 'julaba_user',
  password: process.env.DB_PASSWORD || 'test',
  database: process.env.DB_NAME || 'julaba_pilote3',
});

class RuptureInvariant extends Error {}
let invariantCourant = '';
const verts = [];
let UID = null;

function etape(n, titre) {
  invariantCourant = `${n}. ${titre}`;
  console.log(`\n== Invariant ${n} — ${titre}`);
}
async function exige(cond, label, detail = '') {
  if (cond) {
    console.log(`  OK ${label}${detail ? '  — ' + detail : ''}`);
    return;
  }
  console.error(`\nNO-GO — invariant cassé : ${invariantCourant}`);
  console.error(`  ${label}${detail ? '  — ' + detail : ''}`);
  console.error('\n  État SQL au moment de la casse :');
  console.error('  ' + JSON.stringify(await etatSql(), null, 2).split('\n').join('\n  '));
  throw new RuptureInvariant(`${invariantCourant} :: ${label}`);
}

// ── Lectures SQL : la source de vérité ───────────────────────────────────
const miroir = async () => (await db.query(
  `SELECT count(*) FILTER (WHERE actif)::int AS actives, count(*)::int AS total FROM catalogue_maitre`)).rows[0];
const produitAdopte = async () => (await db.query(
  `SELECT nom, prix, unite, default_code FROM produits WHERE marchand_id = $1::text AND default_code = $2`,
  [UID, REF.code])).rows;
const ventes = async () => (await db.query(
  `SELECT id, montant, produit, idempotency_key FROM caisse_transactions
    WHERE user_id = $1 AND type = 'vente' AND lower(produit) = lower($2)`, [UID, REF.nom])).rows;
const produitsSansPrix = async () => (await db.query(
  `SELECT nom FROM produits WHERE marchand_id = $1::text AND COALESCE(prix, 0) <= 0`, [UID])).rows;

async function etatSql() {
  if (!UID) return { note: 'marchande non résolue' };
  return {
    miroir: await miroir(),
    produit_adopte: await produitAdopte(),
    ventes: await ventes(),
    produits_a_prix_nul: await produitsSansPrix(),
  };
}

async function attendre(predicat, ms = 20000, pas = 500) {
  const fin = Date.now() + ms;
  for (;;) {
    try { if (await predicat()) return true; } catch { /* page en rechargement */ }
    if (Date.now() > fin) return false;
    await new Promise((r) => setTimeout(r, pas));
  }
}

async function ouvrirAutreArticle(page) {
  await page.goto(`${BASE}/marchand/caisse`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: /Autre article/i }).first().click({ timeout: 20000 });
  await page.waitForTimeout(800);
}

// ══════════════════════════════════════════════════════════════════════════
await db.connect();
const browser = await chromium.launch({ executablePath: EXEC, headless: true, args: ['--no-sandbox'] });
let rupture = null;
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const rep = await ctx.request.post(`${BASE}/api/v1/auth/login`, { data: MARCHANDE });
  if (!rep.ok()) throw new Error(`login marchande -> ${rep.status()}`);
  const session = await rep.json();
  UID = session.user.id;
  await ctx.addInitScript((u) => {
    try {
      localStorage.setItem('julaba_auth_user', JSON.stringify(u));
      localStorage.setItem('julaba_completed_onboarding', 'true');
    } catch { /* ignore */ }
  }, session.user);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message.split('\n')[0]));
  console.log(`Odoo est INJOIGNABLE pour toute cette recette. Marchande : ${session.user.firstName}.`);

  // ── 1 ─────────────────────────────────────────────────────────────────
  etape(1, 'Odoo éteint : le référentiel reste servi par le miroir Postgres');
  const m = await miroir();
  await exige(m.actives === REFERENCES_ATTENDUES,
    `${REFERENCES_ATTENDUES} références actives dans le miroir`, JSON.stringify(m));
  const api = await ctx.request.get(`${BASE}/api/v1/catalogue-maitre?limit=200`);
  const liste = (await api.json()).references || [];
  await exige(api.ok() && liste.length === REFERENCES_ATTENDUES,
    'l\'API sert le référentiel alors qu\'Odoo ne répond pas', `HTTP ${api.status()}, ${liste.length} références`);
  verts.push('1. Odoo éteint : référentiel toujours disponible');

  // ── 2 ─────────────────────────────────────────────────────────────────
  etape(2, 'la synchronisation, elle, échoue franchement — sans abîmer le miroir');
  // CONTEXTE SÉPARÉ pour l'administrateur. Se connecter en admin depuis le
  // contexte de la marchande remplacerait ses cookies : la suite de la
  // recette se déroulerait alors sous la mauvaise identité, et l'article
  // adopté atterrirait sur le compte de l'admin. C'est exactement ce qui
  // s'est produit à la première exécution — l'adoption réussissait, mais pour
  // quelqu'un d'autre.
  const ctxAdmin = await browser.newContext();
  const admin = await ctxAdmin.request.post(`${BASE}/api/v1/auth/login`, { data: ADMIN });
  const jetonAdmin = (await admin.json()).accessToken;
  const synchro = await ctxAdmin.request.post(`${BASE}/api/v1/catalogue-maitre/synchroniser`, {
    headers: { Authorization: `Bearer ${jetonAdmin}` },
  });
  await ctxAdmin.close();
  await exige(!synchro.ok(), 'la synchronisation échoue quand Odoo est injoignable', `HTTP ${synchro.status()}`);
  const apres = await miroir();
  await exige(apres.actives === m.actives && apres.total === m.total,
    'le miroir est INTACT après cet échec — une synchro ratée ne vide pas le référentiel',
    JSON.stringify(apres));
  verts.push('2. synchro impossible, miroir intact');

  // ── 3 ─────────────────────────────────────────────────────────────────
  etape(3, 'une référence non adoptée ne peut pas entrer dans un panier');
  await ouvrirAutreArticle(page);
  await page.getByPlaceholder(/tomate, igname/i).first().fill(REF.nom.slice(0, 5));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/03-recherche.png`, fullPage: true }).catch(() => {});
  const proposition = page.getByRole('button', { name: new RegExp(REF.nom, 'i') }).first();
  await exige(await proposition.isVisible().catch(() => false),
    `le référentiel propose « ${REF.nom} »`);
  await proposition.click();
  await page.waitForTimeout(600);
  const bouton = page.getByRole('button', { name: /Ajouter à mon catalogue/i }).first();
  await exige(await bouton.isDisabled().catch(() => false),
    'sans prix, « Ajouter à mon catalogue » est inerte — l\'article à 0 F est inatteignable');
  await exige((await produitAdopte()).length === 0, 'aucun produit créé tant qu\'aucun prix n\'est posé');
  const panierAvant = await page.content();
  await exige(!/Encaisser/.test(panierAvant), 'le panier est resté vide');
  verts.push('3. référence non adoptée : jamais vendable');

  // ── 4 ─────────────────────────────────────────────────────────────────
  etape(4, 'adoption : la marchande pose SON prix, l\'article naît');
  await page.getByPlaceholder('0').first().fill(String(PRIX));
  await page.getByRole('button', { name: 'tas', exact: true }).first().click();
  await page.waitForTimeout(300);
  await bouton.click();
  await attendre(async () => (await produitAdopte()).length === 1);
  const [produit] = await produitAdopte();
  await page.screenshot({ path: `${OUT}/04-adopte.png`, fullPage: true }).catch(() => {});
  await exige(!!produit, 'le produit existe dans le catalogue de la marchande', JSON.stringify(produit));
  const ailleurs = await db.query(
    `SELECT u.first_name, u.phone FROM produits p JOIN users u ON u.id::text = p.marchand_id
      WHERE p.default_code = $1 AND p.marchand_id <> $2::text`, [REF.code, UID]);
  await exige(ailleurs.rows.length === 0,
    'et il appartient bien à ELLE, pas à un autre compte', JSON.stringify(ailleurs.rows));
  await exige(Number(produit.prix) === PRIX, `son prix est ${PRIX} F, pas le 0 du référentiel`, `${produit.prix}`);
  await exige(produit.default_code === REF.code, 'il porte le lien vers la référence Odoo', produit.default_code);
  await exige(produit.unite === 'tas', 'son unité locale est enregistrée', produit.unite);
  await exige((await produitsSansPrix()).length === 0,
    'AUCUN produit à prix nul dans tout son catalogue', JSON.stringify(await produitsSansPrix()));
  verts.push('4. adoption : article créé au prix de la marchande');

  // ── 5 ─────────────────────────────────────────────────────────────────
  etape(5, 'elle le vend — Odoo toujours injoignable');
  // C'est la preuve la plus forte que rien ne part vers Odoo : il n'y a
  // personne au bout du fil, et la vente passe quand même.
  await exige(/Encaisser/.test(await page.content()),
    'l\'article adopté est déjà au panier, prêt à être vendu');
  await page.getByText(/Encaisser/).first().click({ timeout: 15000 });
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /Payer en esp/i }).first().click({ timeout: 15000 });
  await attendre(async () => (await ventes()).length === 1);
  const v = await ventes();
  await page.screenshot({ path: `${OUT}/05-vendu.png`, fullPage: true }).catch(() => {});
  await exige(v.length === 1, 'la vente est enregistrée', JSON.stringify(v[0]));
  await exige(Number(v[0].montant) === PRIX, `au prix de la marchande (${PRIX} F)`, v[0].montant);
  await exige(!!v[0].idempotency_key, 'avec sa clé d\'idempotence');
  verts.push('5. vente réussie sans Odoo — aucune écriture ne part vers lui');

  // ── 6 ─────────────────────────────────────────────────────────────────
  etape(6, 'backend injoignable : le téléphone sert son cache');
  await page.getByRole('button', { name: /Nouvelle vente/i }).first().click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
  // On coupe le référentiel AU NIVEAU DU RÉSEAU, comme le ferait un serveur
  // éteint. Le reste de l'application continue de fonctionner.
  await page.route('**/api/v1/catalogue-maitre**', (route) => route.abort('failed'));
  await ouvrirAutreArticle(page);
  await page.getByPlaceholder(/tomate, igname/i).first().fill('a');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/06-cache.png`, fullPage: true }).catch(() => {});
  const horsLigne = await page.content();
  await exige(/Liste enregistrée sur ce téléphone/.test(horsLigne),
    'l\'écran DIT que la liste vient du cache, au lieu de la faire passer pour fraîche');
  const resultats = await page.getByRole('button', { name: /Catalogue JULABA|Déjà dans ta caisse/ }).count();
  await exige(resultats > 0, 'la recherche fonctionne quand même, depuis le cache local', `${resultats} résultat(s)`);
  await page.unroute('**/api/v1/catalogue-maitre**');
  verts.push('6. backend coupé : recherche servie par le cache du téléphone');

  // ── 7 ─────────────────────────────────────────────────────────────────
  etape(7, 'cohérence finale');
  const fin = { miroir: await miroir(), produit: (await produitAdopte())[0], ventes: await ventes() };
  await exige(fin.miroir.actives === REFERENCES_ATTENDUES, 'le miroir n\'a pas bougé de toute la recette');
  await exige((await produitsSansPrix()).length === 0, 'toujours aucun article à prix nul');
  await exige(fin.ventes.length === 1, 'une seule vente, pas de doublon', `${fin.ventes.length}`);
  const liens = await db.query(
    `SELECT count(*)::int AS n FROM produits p
      WHERE p.marchand_id = $1::text AND p.default_code IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM catalogue_maitre c WHERE c.default_code = p.default_code)`,
    [UID]);
  await exige(liens.rows[0].n === 0,
    'aucun article adopté ne pointe vers une référence inexistante', JSON.stringify(liens.rows[0]));
  verts.push('7. cohérence finale');
} catch (e) {
  rupture = e;
  if (!(e instanceof RuptureInvariant)) {
    console.error(`\nERREUR DE HARNAIS — ${e.message}`);
    console.error("  Ce n'est pas un invariant cassé : le test lui-même n'a pas pu se dérouler.");
    console.error(e.stack?.split('\n').slice(1, 4).join('\n') || '');
  }
} finally {
  await browser.close().catch(() => {});
}

console.log('\n' + '-'.repeat(70));
if (!rupture) {
  console.log('GO PILOTE-3 — les sept invariants tiennent.\n');
  verts.forEach((x) => console.log('  ' + x));
  console.log(`
Odoo définit ce qu'est le produit. JULABA définit comment cette marchande le
vend. Tout ce qui précède s'est déroulé avec Odoo INJOIGNABLE : le référentiel
reste consultable, l'adoption fonctionne, la vente passe. Aucune vente ne
dépend d'Odoo en temps réel, et aucun prix du référentiel n'atteint la caisse.`);
} else {
  console.log(`NO-GO PILOTE-3${rupture instanceof RuptureInvariant ? '' : ' (harnais)'}`);
  console.log(`  ${rupture.message}`);
  if (verts.length) {
    console.log('\n  Invariants tenus avant la casse :');
    verts.forEach((x) => console.log('    ' + x));
  }
}
console.log('-'.repeat(70));
await db.end().catch(() => {});
process.exit(rupture ? 1 : 0);
