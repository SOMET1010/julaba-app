// ──────────────────────────────────────────────────────────────────────────
// RECETTE PILOTE-2 — vente especes reelle, coupure reseau, reprise.
//
// La question metier, telle qu'elle a ete posee : une marchande peut-elle
// vendre en especes de bout en bout SANS DOUBLON, meme avec coupure reseau ?
//
// Ce que les tests existants prouvent DEJA, et qu'on ne rejoue pas ici :
//   - i2-idempotence-vente.spec.ts : meme cle rejouee => une seule vente ;
//   - i1-i3-atomicite-stock.spec.ts : vente et stock atomiques ;
//   - offlineCaisse.test.mts (T1-T13) : la file hors-ligne, contre un
//     `poster` FACTICE et un store EN MEMOIRE.
//
// Ce que personne n'avait teste, et qui est la raison d'etre de ce script :
// LA JONCTION. Les deux moities sont prouvees separement, jamais ensemble.
// La cle posee par CaisseContext voyage-t-elle reellement jusqu'a
// `caisse_transactions.idempotency_key` apres une VRAIE coupure, dans un VRAI
// navigateur, avec un VRAI IndexedDB ?
//
// Et surtout l'invariant 5, absent de toute la suite : LE SERVEUR ENCAISSE,
// LA REPONSE SE PERD. La cliente est partie avec sa tomate, la vente est en
// base, mais la marchande a vu une erreur. L'operation reste en file et sera
// rejouee. Seule la deduplication backend empeche alors de compter deux fois.
// C'est le scenario de doublon en argent reel, et il n'etait couvert nulle
// part.
//
// ARBITRE : PostgreSQL. Jamais une lecture d'API, jamais l'ecran — la base
// dit ce qui s'est reellement passe (meme discipline que run-recette.sh).
//
// Sortie : GO PILOTE-2, ou NO-GO + le PREMIER invariant casse, avec l'etat
// SQL au moment de la casse. Arret immediat a la premiere casse : un test qui
// continue apres un invariant financier casse ne fait qu'ajouter du bruit.
// ──────────────────────────────────────────────────────────────────────────
import { chromium } from 'playwright-core';
import pg from 'pg';

const EXEC = process.env.CHROMIUM_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = process.env.RECETTE_BASE || 'http://localhost:4180';
const OUT = process.env.RECETTE_OUT || '/tmp/recette-pilote2';
const PRODUIT = 'Tomate-P2';
const PRIX = 200;
const STOCK_INITIAL = 100;

// Comptes du seed de demonstration. A vend ; B ne sert qu'a prouver le
// cloisonnement du terminal partage (invariant 6).
const A = { phone: '+2250700000009', password: '1234' };
const B = { phone: '+2250700000010', password: '1234' };

const db = new pg.Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME || 'julaba_user',
  password: process.env.DB_PASSWORD || 'test',
  database: process.env.DB_NAME || 'julaba_pilote2',
});

class RuptureInvariant extends Error {}

let invariantCourant = '';
const verts = [];

function etape(n, titre) {
  invariantCourant = `${n}. ${titre}`;
  console.log(`\n== Invariant ${n} — ${titre}`);
}
function ok(label, extra = '') {
  console.log(`  OK ${label}${extra ? '  — ' + extra : ''}`);
}
async function exige(cond, label, detail = '') {
  if (cond) { ok(label, detail); return; }
  console.error(`\nNO-GO — invariant casse : ${invariantCourant}`);
  console.error(`  ${label}${detail ? '  — ' + detail : ''}`);
  console.error('\n  Etat SQL au moment de la casse :');
  console.error('  ' + JSON.stringify(await etatSql(), null, 2).split('\n').join('\n  '));
  throw new RuptureInvariant(`${invariantCourant} :: ${label}`);
}

// ── Lectures SQL : la source de verite ───────────────────────────────────
async function idUtilisateur(phone) {
  const r = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
  return r.rows[0]?.id ?? null;
}
// Ventes DU PRODUIT DE TEST uniquement. Le seed de demonstration donne deja
// un historique a la marchande Awa (`avecDonnees: true` dans
// seed-demo.service.ts) : compter toutes ses ventes melangerait le decor et
// ce que ce test provoque. Les comptages ci-dessous sont donc absolus et ne
// dependent d'aucun etat herite.
async function ventes(userId) {
  const r = await db.query(
    `SELECT id, idempotency_key, montant, created_at FROM caisse_transactions
      WHERE user_id = $1 AND type = 'vente' AND lower(produit) = lower($2)
      ORDER BY created_at ASC`, [userId, PRODUIT]);
  return r.rows;
}
async function stockProduit(userId) {
  const r = await db.query(
    `SELECT COALESCE(stock, 0)::numeric AS stock FROM produits
      WHERE marchand_id = $1::text AND lower(nom) = lower($2)`, [userId, PRODUIT]);
  return r.rows[0] ? Number(r.rows[0].stock) : null;
}
async function mouvements(userId) {
  const r = await db.query(
    `SELECT count(*)::int AS n, COALESCE(sum(quantite_retranchee), 0)::numeric AS total
       FROM stock_mouvements WHERE marchand_id = $1::text AND lower(produit_nom) = lower($2)`,
    [userId, PRODUIT]);
  return { n: r.rows[0].n, total: Number(r.rows[0].total) };
}
async function clesEnDouble(userId) {
  const r = await db.query(
    `SELECT idempotency_key, count(*)::int AS n FROM caisse_transactions
      WHERE user_id = $1 AND idempotency_key IS NOT NULL
      GROUP BY idempotency_key HAVING count(*) > 1`, [userId]);
  return r.rows;   // sur TOUTES les ventes du compte : un doublon de cle est
                   // une anomalie ou qu'il soit, decor du seed compris.
}
let UID_A = null;
async function etatSql() {
  if (!UID_A) return { note: 'utilisateur non encore resolu' };
  return {
    ventes: (await ventes(UID_A)).map((v) => ({ cle: v.idempotency_key, montant: v.montant })),
    stock: await stockProduit(UID_A),
    mouvements: await mouvements(UID_A),
    cles_en_double: await clesEnDouble(UID_A),
  };
}

// ── File hors-ligne, lue directement dans IndexedDB ──────────────────────
async function outbox(page) {
  return page.evaluate(async () => {
    const base = await new Promise((res, rej) => {
      const r = indexedDB.open('julaba_offline', 2);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('caisse_outbox')) d.createObjectStore('caisse_outbox', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('caisse_dead')) d.createObjectStore('caisse_dead', { keyPath: 'id' });
      };
    });
    const lire = (store) => new Promise((res) => {
      if (!base.objectStoreNames.contains(store)) return res([]);
      const q = base.transaction(store, 'readonly').objectStore(store).getAll();
      q.onsuccess = () => res(q.result);
      q.onerror = () => res([]);
    });
    const actives = await lire('caisse_outbox');
    const mortes = await lire('caisse_dead');
    base.close();
    const resume = (o) => ({ id: o.id, userId: o.userId, endpoint: o.endpoint, attempts: o.attempts ?? 0 });
    return { actives: actives.map(resume), mortes: mortes.map(resume) };
  });
}

async function attendre(predicat, ms = 25000, pas = 500) {
  const fin = Date.now() + ms;
  for (;;) {
    try { if (await predicat()) return true; } catch { /* page en cours de rechargement */ }
    if (Date.now() > fin) return false;
    await new Promise((r) => setTimeout(r, pas));
  }
}

// ── Parcours marchande : panier -> encaisser -> payer en especes ─────────
async function venteParEcran(page, etiquette) {
  await page.goto(`${BASE}/marchand/caisse`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(1500);
  const recherche = page.getByPlaceholder(/Dites ou tapez un produit/i);
  await recherche.waitFor({ state: 'visible', timeout: 20000 });
  await recherche.fill(PRODUIT);                       // isole le produit de test
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /\+ Ajouter/ }).first().click({ timeout: 15000 });
  await page.waitForTimeout(500);
  await page.getByText(/Encaisser/).first().click({ timeout: 15000 });
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /Payer en esp/i }).first().click({ timeout: 15000 });
  // L'ecran « Vente reussie » s'affiche AUSSI hors-ligne (l'operation est en
  // file, la vendeuse n'est jamais bloquee) : on ne s'en sert donc jamais
  // comme preuve, seulement comme synchronisation d'ecran.
  await page.getByText('Vente réussie').waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  await page.getByRole('button', { name: /Nouvelle vente/i }).first().click({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${etiquette}.png`, fullPage: true }).catch(() => {});
}

// Bascule de session. Le cache `julaba_auth_user` est pose par un SCRIPT
// D'INITIALISATION, donc AVANT que l'application demarre — et non apres
// chargement.
//
// Ce detail n'est pas cosmetique, il a fausse un passage de ce test. En
// posant les cookies du nouveau compte puis en chargeant la page, on ouvrait
// une fenetre ou l'application demarrait avec l'ANCIEN utilisateur en cache
// et les NOUVEAUX cookies : la synchronisation partait alors sous l'ancienne
// identite cote client, mais avec les identifiants du nouveau compte cote
// reseau — et la vente atterrissait sur le mauvais compte. C'etait un
// artefact du harnais : le vrai ecran de connexion pose le cookie et le cache
// ensemble. On supprime donc la fenetre au lieu de vivre avec.
async function connecter(ctx, page, qui) {
  const r = await ctx.request.post(`${BASE}/api/v1/auth/login`, { data: { phone: qui.phone, password: qui.password } });
  if (!r.ok()) throw new Error(`login ${qui.phone} -> ${r.status()} ${await r.text()}`);
  const data = await r.json();
  await ctx.addInitScript((u) => {
    try {
      localStorage.setItem('julaba_auth_user', JSON.stringify(u));
      localStorage.setItem('julaba_completed_onboarding', 'true');
    } catch { /* stockage indisponible */ }
  }, data.user);
  await page.goto(`${BASE}/marchand/caisse`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(2000);
  return data;
}

// ══════════════════════════════════════════════════════════════════════════
await db.connect();
const browser = await chromium.launch({ executablePath: EXEC, headless: true, args: ['--no-sandbox'] });
let rupture = null;
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('julaba_completed_onboarding', 'true');
      localStorage.setItem('julaba_onboarding_done', 'true');
    } catch { /* stockage indisponible */ }
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message.split('\n')[0]));

  const sessionA = await connecter(ctx, page, A);
  UID_A = sessionA.user.id;
  const UID_B = await idUtilisateur(B.phone);

  // Produit de test, cree par l'API (mise en place, pas objet du test).
  const cp = await ctx.request.post(`${BASE}/api/v1/caisse/produits`, {
    data: { nom: PRODUIT, stock: STOCK_INITIAL, prix: PRIX },
  });
  if (!cp.ok()) throw new Error(`creation produit -> ${cp.status()} ${await cp.text()}`);
  console.log(`Mise en place : ${PRODUIT} — stock ${STOCK_INITIAL}, prix ${PRIX} F, marchande ${sessionA.user.firstName}`);

  // ── 1 ─────────────────────────────────────────────────────────────────
  etape(1, 'vente en ligne : une transaction, un decrement, un mouvement');
  await venteParEcran(page, '01-vente-en-ligne');
  await attendre(async () => (await ventes(UID_A)).length === 1);
  let v = await ventes(UID_A);
  await exige(v.length === 1, 'exactement 1 vente en base', `${v.length} trouvee(s)`);
  await exige((await stockProduit(UID_A)) === STOCK_INITIAL - 1, `stock ${STOCK_INITIAL} -> ${STOCK_INITIAL - 1}`);
  let m = await mouvements(UID_A);
  await exige(m.n === 1 && m.total === 1, '1 mouvement de stock, 1 unite retranchee', JSON.stringify(m));
  await exige(!!v[0].idempotency_key, "la vente porte une cle d'idempotence", v[0].idempotency_key);
  verts.push('1. vente en ligne');

  // ── 2 ─────────────────────────────────────────────────────────────────
  etape(2, 'coupure au moment de payer : rien en base, rien de perdu');
  await ctx.setOffline(true);
  await venteParEcran(page, '02-hors-ligne');
  let file = await outbox(page);
  await exige((await ventes(UID_A)).length === 1, 'aucune vente supplementaire en base');
  await exige((await stockProduit(UID_A)) === STOCK_INITIAL - 1, 'stock inchange');
  await exige(file.actives.length === 1, '1 operation dans la file durable', JSON.stringify(file.actives));
  await exige(file.actives[0].userId === UID_A, "l'operation porte le proprietaire A");
  await exige(file.actives[0].endpoint === '/caisse/vente', 'endpoint /caisse/vente');
  verts.push('2. coupure : mise en file, rien perdu');

  // ── 3 ─────────────────────────────────────────────────────────────────
  etape(3, 'retour du reseau : rejeu automatique, une seule vente');
  const cleHorsLigne = file.actives[0].id;
  await ctx.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await attendre(async () => (await outbox(page)).actives.length === 0);
  file = await outbox(page);
  v = await ventes(UID_A);
  await exige(file.actives.length === 0, 'file videe', JSON.stringify(file));
  await exige(v.length === 2, '2 ventes au total', `${v.length}`);
  await exige(v.some((x) => x.idempotency_key === cleHorsLigne),
    'la cle posee hors-ligne est bien celle enregistree en base', cleHorsLigne);
  await exige((await stockProduit(UID_A)) === STOCK_INITIAL - 2, `stock ${STOCK_INITIAL - 2}`);
  m = await mouvements(UID_A);
  await exige(m.n === 2 && m.total === 2, '2 mouvements, 2 unites', JSON.stringify(m));
  verts.push('3. retour reseau : rejeu, une seule vente');

  // ── 4 ─────────────────────────────────────────────────────────────────
  etape(4, 'rejeu volontaire de la MEME cle, deux fois de plus');
  for (let i = 0; i < 2; i++) {
    const r = await ctx.request.post(`${BASE}/api/v1/caisse/vente`, {
      data: {
        montant: String(PRIX), produits: [{ nom: PRODUIT, quantite: 1 }],
        mode_paiement: 'especes', idempotency_key: cleHorsLigne,
      },
    });
    // Un rejeu qui echoue est un INVARIANT casse, pas une erreur de harnais :
    // c'est exactement ce que fait la file hors-ligne quand le reseau revient.
    // Une marchande qui rejoue sa vente et recoit un 500 a un vrai probleme,
    // meme si aucun doublon n'est cree.
    await exige(r.ok(), `le rejeu ${i + 1} est accepte sans erreur`,
      `HTTP ${r.status()} ${(await r.text()).slice(0, 120)}`);
  }
  await exige((await ventes(UID_A)).length === 2, 'toujours 2 ventes apres deux rejeux');
  await exige((await stockProduit(UID_A)) === STOCK_INITIAL - 2, 'stock inchange par les rejeux');
  m = await mouvements(UID_A);
  await exige(m.n === 2 && m.total === 2, 'toujours 2 mouvements', JSON.stringify(m));
  verts.push('4. double rejeu : une seule vente, un seul mouvement');

  // ── 5 ─────────────────────────────────────────────────────────────────
  etape(5, 'le serveur encaisse, la reponse se perd — puis redemarrage');
  // La requete ATTEINT le serveur (route.fetch), mais la page ne verra jamais
  // la reponse (route.abort). Cote marchande : une erreur. Cote base : la
  // vente est passee. C'est LA situation qui fabrique les doublons.
  await page.route('**/api/v1/caisse/vente', async (route) => {
    try { await route.fetch(); } catch { /* la vente est partie, c'est ce qui compte */ }
    await route.abort('failed');
  });
  await venteParEcran(page, '05-reponse-perdue');
  await attendre(async () => (await ventes(UID_A)).length === 3);
  v = await ventes(UID_A);
  await exige(v.length === 3, 'le serveur a bien encaisse la vente', `${v.length} ventes`);
  await exige((await stockProduit(UID_A)) === STOCK_INITIAL - 3, `stock ${STOCK_INITIAL - 3}`);
  file = await outbox(page);
  await exige(file.actives.length === 1,
    "la marchande a vu un echec : l'operation est en file, prete a etre rejouee", JSON.stringify(file.actives));
  const cleFantome = file.actives[0].id;
  await exige(v.some((x) => x.idempotency_key === cleFantome),
    'la cle en file est DEJA celle enregistree en base — le rejeu sera un doublon si rien ne le bloque', cleFantome);

  await page.unroute('**/api/v1/caisse/vente');
  await page.reload({ waitUntil: 'domcontentloaded' });   // redemarrage : IndexedDB survit
  await page.waitForTimeout(2500);
  file = await outbox(page);
  await exige(file.actives.length <= 1, "l'operation a survecu au redemarrage sans se dupliquer", JSON.stringify(file.actives));
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await attendre(async () => (await outbox(page)).actives.length === 0);
  file = await outbox(page);
  v = await ventes(UID_A);
  await exige(file.actives.length === 0, 'file videe apres rejeu');
  await exige(file.mortes.length === 0, 'aucune lettre morte', JSON.stringify(file.mortes));
  await exige(v.length === 3, "TOUJOURS 3 ventes — le rejeu n'a pas double-compte", `${v.length}`);
  await exige((await stockProduit(UID_A)) === STOCK_INITIAL - 3, 'stock inchange par le rejeu');
  m = await mouvements(UID_A);
  await exige(m.n === 3 && m.total === 3, '3 mouvements, 3 unites', JSON.stringify(m));
  verts.push('5. reponse perdue + redemarrage : aucun doublon');

  // ── 6 ─────────────────────────────────────────────────────────────────
  etape(6, "terminal partage : l'operation de A n'est jamais rejouee sous B");
  // On met l'operation de A en file en faisant ECHOUER la requete, plutot
  // qu'en coupant le reseau. Raison : retablir le reseau pendant que A est
  // encore la session montee declencherait son propre rejeu — legitime, mais
  // ce n'est pas ce qu'on teste ici. Le chemin de mise en file est le meme
  // (doitEnfiler, CaisseContext), et la coupure reseau proprement dite est
  // deja prouvee par les invariants 2 et 3.
  await page.route('**/api/v1/caisse/vente', (route) => route.abort('failed'));
  await venteParEcran(page, '06-echec-reseau-A');
  await page.unroute('**/api/v1/caisse/vente');
  file = await outbox(page);
  await exige(file.actives.length === 1 && file.actives[0].userId === UID_A,
    'A laisse une operation en file', JSON.stringify(file.actives));
  const cleDeA = file.actives[0].id;
  const ventesAvantB = (await ventes(UID_A)).length;

  // B prend le terminal : `connecter` recharge la page, donc l'effet de
  // synchronisation de CaisseContext se remonte avec l'identite de B. Si le
  // cloisonnement ne tenait pas, le rejeu partirait ici, avec les
  // identifiants de B.
  await connecter(ctx, page, B);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForTimeout(8000);                  // large : on LAISSE le rejeu se produire s'il doit
  file = await outbox(page);
  await exige((await ventes(UID_A)).length === ventesAvantB,
    'aucune vente de A creee pendant la session de B');
  await exige(file.actives.length === 1 && file.actives[0].id === cleDeA,
    "l'operation de A est toujours en file, intacte", JSON.stringify(file.actives));
  await exige(file.actives[0].userId === UID_A, 'proprietaire toujours A, jamais reattribue a B');
  await exige(file.actives[0].attempts === 0, 'aucune tentative comptee sous B', `attempts=${file.actives[0].attempts}`);
  const ventesDeB = UID_B ? (await ventes(UID_B)).length : 0;
  await exige(ventesDeB === 0, 'aucune vente creee sous le compte de B', `${ventesDeB}`);

  await connecter(ctx, page, A);                    // A revient
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await attendre(async () => (await outbox(page)).actives.length === 0);
  v = await ventes(UID_A);
  await exige(v.length === ventesAvantB + 1, "l'operation de A est rejouee quand A revient", `${v.length} ventes`);
  await exige(v.some((x) => x.idempotency_key === cleDeA), "avec sa cle d'origine", cleDeA);
  verts.push('6. terminal partage : cloisonnement tenu');

  // ── 7 ─────────────────────────────────────────────────────────────────
  etape(7, 'coherence finale : caisse, historique et stock racontent la meme histoire');
  const finales = await ventes(UID_A);
  const stockFinal = await stockProduit(UID_A);
  const mvt = await mouvements(UID_A);
  const doubles = await clesEnDouble(UID_A);
  await exige(finales.length === 4, '4 ventes au total (en ligne, hors-ligne, reponse perdue, terminal partage)', `${finales.length}`);
  await exige(doubles.length === 0, "aucune cle d'idempotence en double", JSON.stringify(doubles));
  await exige(stockFinal === STOCK_INITIAL - 4, `stock final ${STOCK_INITIAL - 4}`, `${stockFinal}`);
  await exige(mvt.n === 4 && mvt.total === 4, '4 mouvements de stock, 4 unites', JSON.stringify(mvt));
  await exige(STOCK_INITIAL - stockFinal === mvt.total,
    'le stock manquant est exactement egal au ledger des mouvements',
    `${STOCK_INITIAL - stockFinal} vs ${mvt.total}`);
  await exige(mvt.n === finales.length, 'un mouvement par vente, ni plus ni moins');
  const file7 = await outbox(page);
  await exige(file7.actives.length === 0 && file7.mortes.length === 0,
    'file hors-ligne vide, aucune lettre morte', JSON.stringify(file7));
  verts.push('7. coherence finale');
} catch (e) {
  rupture = e;
  if (!(e instanceof RuptureInvariant)) {
    console.error(`\nERREUR DE HARNAIS — ${e.message}`);
    console.error("  Ce n'est pas un invariant casse : le test lui-meme n'a pas pu se derouler.");
    console.error(e.stack?.split('\n').slice(1, 4).join('\n') || '');
  }
} finally {
  await browser.close().catch(() => {});
}

console.log('\n' + '-'.repeat(70));
if (!rupture) {
  console.log('GO PILOTE-2 — les sept invariants tiennent.\n');
  verts.forEach((x) => console.log('  ' + x));
  console.log(`
Une marchande peut vendre en especes de bout en bout sans doublon, y compris
quand le reseau coupe au moment de payer, quand le serveur encaisse sans que
la reponse revienne, et quand le terminal est partage. Preuve arbitree par
PostgreSQL, pas par l'ecran.`);
} else {
  console.log(`NO-GO PILOTE-2${rupture instanceof RuptureInvariant ? '' : ' (harnais)'}`);
  console.log(`  ${rupture.message}`);
  if (verts.length) {
    console.log('\n  Invariants tenus avant la casse :');
    verts.forEach((x) => console.log('    ' + x));
  }
}
console.log('-'.repeat(70));
await db.end().catch(() => {});
process.exit(rupture ? 1 : 0);
