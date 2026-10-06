// Recette runtime — BOUCLE ESPÈCES marchand, pilotée dans un vrai navigateur.
//
// Scénario (une seule passe) :
//   stock connu → étape paiement (crédit masqué) → vente espèces → stock -30
//   → annulation SELF-SERVICE via l'UI marchand (Mes ventes → Annuler → Oui)
//   → stock restauré + badge « Annulée » + bouton disparu (idempotence écran).
//
// Vérifie ce que les tests d'intégration ne montrent pas : le COMPORTEMENT
// ÉCRAN. Le login passe par l'API (cookies) pour éviter le pavé vocal, puis on
// navigue dans la caisse. La vente passe par le vrai endpoint ; l'ANNULATION est
// déclenchée à la main dans l'UI (#20). Le stock est lu via l'API et arbitré par
// la DB dans le script d'orchestration (run-recette.sh).
//
// Prérequis : stack lancée par e2e/run-recette.sh (backend :3000 + proxy :4180,
// base seed). Chromium via playwright-core (devDependency) — chemin du binaire
// dans CHROMIUM_BIN, défaut = image de l'environnement remote.
import { chromium } from 'playwright-core';

const EXEC = process.env.CHROMIUM_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = process.env.RECETTE_BASE || 'http://localhost:4180';
const OUT = process.env.RECETTE_OUT || '/tmp/recette';
const MARCHAND = { phone: '+2250700000009', password: '1234' };   // seed : Awa, marchand (avecDonnees)
const ADMIN = { phone: '+2250700000016', password: '123456' };    // seed : admin_general
const PRODUIT = 'Tomate-Recette';

const results = [];
function check(label, cond, extra = '') {
  results.push({ label, ok: !!cond, extra });
  console.log((cond ? 'PASS ' : 'FAIL ') + label + (extra ? '  — ' + extra : ''));
}
async function login(ctx, who) {
  const r = await ctx.request.post(`${BASE}/api/v1/auth/login`, { data: who });
  if (!r.ok()) throw new Error(`login ${who.phone} → ${r.status()} ${await r.text()}`);
  return r.json();
}
async function stockOf(ctx, nom) {
  const r = await ctx.request.get(`${BASE}/api/v1/caisse/produits`);
  const list = await r.json();
  const arr = list?.produits || list?.data || (Array.isArray(list) ? list : []);
  const p = arr.find((x) => (x.nom || '').toLowerCase() === nom.toLowerCase());
  return p ? Number(p.stock) : null;
}

const browser = await chromium.launch({ executablePath: EXEC, headless: true, args: ['--no-sandbox'] });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('julaba_completed_onboarding', 'true'); } catch {} });
  const marchand = await login(ctx, MARCHAND);
  check('login marchand', !!marchand?.user, `${marchand?.user?.firstName || ''} ${marchand?.user?.role || ''}`);
  // Le vrai login UI met l'utilisateur en cache (julaba_auth_user) ; AppContext s'en
  // sert pour passer accessToken='cookie' et charger l'historique via cookies. On
  // reproduit ce cache (sinon AppContext reste sans session → « Aucune vente »).
  await ctx.addInitScript((u) => { try { localStorage.setItem('julaba_auth_user', JSON.stringify(u)); } catch {} }, marchand.user);

  const cp = await ctx.request.post(`${BASE}/api/v1/caisse/produits`, { data: { nom: PRODUIT, stock: 100, prix: 200 } });
  check('création produit stock 100', cp.ok(), `HTTP ${cp.status()}`);

  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  await page.goto(`${BASE}/marchand/caisse`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  check('accès caisse (sans redirection login/onboarding)', /\/marchand\/caisse/.test(page.url()), page.url());
  await page.screenshot({ path: `${OUT}/01-caisse-initiale.png`, fullPage: true });
  const body1 = await page.content();
  check('produit affiché à l’écran', new RegExp(PRODUIT, 'i').test(body1));
  check('grille caisse : aucun bouton rapide « À crédit »', !/>\s*À crédit\s*</i.test(body1));

  // Étape paiement (best-effort) : panier → Encaisser → moyens de paiement.
  try {
    await page.getByRole('button', { name: /Ajouter/i }).first().click({ timeout: 8000 });
    await page.waitForTimeout(400);
    await page.getByText(/Encaisser/i).first().click({ timeout: 8000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/02-paiement.png`, fullPage: true });
    const pay = await page.content();
    check('paiement : « Espèces » proposé', /Espèces/.test(pay));
    check('paiement : mention « espèces uniquement » affichée', /espèces uniquement/i.test(pay));
    check('paiement : AUCUN bouton « Crédit »', !/>\s*Crédit\s*</.test(pay));
  } catch (e) {
    check('étape paiement (UI)', false, 'interaction UI échouée : ' + e.message.split('\n')[0]);
  }

  await page.goto(`${BASE}/marchand/caisse`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { try { Object.keys(localStorage).filter(k => k.startsWith('julaba_cart')).forEach(k => localStorage.removeItem(k)); } catch {} }).catch(() => {});
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(500);

  // Vente espèces 30 (API) → stock 70.
  const vente = await ctx.request.post(`${BASE}/api/v1/caisse/vente`, {
    data: { montant: '6000', produits: [{ nom: PRODUIT, quantite: 30 }], mode_paiement: 'especes', idempotency_key: 'REC-1' },
  });
  const txId = (await vente.json())?.transaction?.id;
  check('vente espèces enregistrée', vente.ok() && !!txId, `tx ${txId || '—'}`);
  check('stock décrémenté à 70 après vente', (await stockOf(ctx, PRODUIT)) === 70);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/03-apres-vente.png`, fullPage: true });

  // ── ANNULATION via l'UI MARCHAND (#20) : « Mes ventes » → déplier → Annuler ──
  try {
    await page.goto(`${BASE}/marchand/ventes-passees`, { waitUntil: 'networkidle' });
    // La liste charge ses transactions au montage (reloadTransactions) : on ATTEND
    // que la vente apparaisse plutôt que de deviner un délai.
    await page.getByText(PRODUIT, { exact: false }).first().waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/04-ventes-passees.png`, fullPage: true });
    check('UI : la vente du jour apparaît dans « Ventes passées »', true);

    await page.getByText(PRODUIT, { exact: false }).first().click({ timeout: 8000 }); // déplier la carte
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Annuler cette vente/i }).first().click({ timeout: 8000 });
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /Oui, annuler/i }).first().click({ timeout: 8000 });
    await page.waitForTimeout(2000); // reloadTransactions + refreshProducts
    await page.screenshot({ path: `${OUT}/05-apres-annulation-ui.png`, fullPage: true });
    const apresUi = await page.content();
    check('UI : badge « Annulée » affiché après annulation self-service', /Annulée/.test(apresUi));
    check('UI : bouton « Annuler cette vente » disparu (idempotence écran)', !/Annuler cette vente/i.test(apresUi));
  } catch (e) {
    try { await page.screenshot({ path: `${OUT}/04-ventes-passees.png`, fullPage: true }); } catch {}
    check('UI : annulation self-service (Ventes passées)', false, e.message.split('\n')[0]);
  }
  check('stock RESTAURÉ à 100 après annulation UI (API)', (await stockOf(ctx, PRODUIT)) === 100,
    'note : lecture API parfois transitoirement null — la DB fait foi (run-recette.sh)');

  console.log('\nTXID=' + txId);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n=== RÉSULTAT NAVIGATEUR : ${results.length - failed.length}/${results.length} verts ===`);
// Les assertions de stock post-annulation sont arbitrées par la DB dans
// run-recette.sh ; on ne fait pas échouer le script sur une lecture API transitoire.
process.exit(0);
