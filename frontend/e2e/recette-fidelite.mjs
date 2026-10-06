// Recette runtime — programme de FIDÉLITÉ marchand, pilotée dans un vrai
// navigateur contre la vraie stack (écart CDC 8.1.2).
//
// Scénario (une seule passe) :
//   barème paramétré + activé dans l'UI (Réglages → Enregistrer le barème)
//   → persisté en base (vérifié par relecture API ET par la DB)
//   → 1er achat qualifiant (300 FCFA) → +6 points affichés à l'écran
//   → 2e achat (400 FCFA) → 14 points, seuil (10) franchi → « Récompense
//     disponible » + bouton « Utiliser la récompense » apparaissent
//   → récompense déclenchée dans l'UI → points déduits (14 → 4), remise
//     annoncée → historique affiché : 2 gains + 1 récompense, tracés.
//
// Vérifie ce que les tests d'intégration ne montrent pas : le COMPORTEMENT
// ÉCRAN réel (pas seulement l'API). Le login passe par l'API (cookies) pour
// éviter le pavé vocal, puis on navigue dans l'écran fidélité. La DB est
// arbitrée en fin de script (run-recette-fidelite.sh) — source de vérité.
//
// Prérequis : stack lancée par e2e/run-recette-fidelite.sh (backend + proxy
// sur des ports dédiés, base seed). Chromium via playwright-core (devDependency).
import { chromium } from 'playwright-core';

const EXEC = process.env.CHROMIUM_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = process.env.RECETTE_BASE || 'http://localhost:4197';
const OUT = process.env.RECETTE_OUT || '/tmp/recette';
const MARCHAND = { phone: '+2250700000009', password: '1234' };   // seed : Awa, marchand (avecDonnees)
const TEL_CLIENT = '+2250799887766';

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

const browser = await chromium.launch({ executablePath: EXEC, headless: true, args: ['--no-sandbox'] });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('julaba_completed_onboarding', 'true'); } catch {} });
  const marchand = await login(ctx, MARCHAND);
  check('login marchand', !!marchand?.user, `${marchand?.user?.firstName || ''} ${marchand?.user?.role || ''}`);
  await ctx.addInitScript((u) => { try { localStorage.setItem('julaba_auth_user', JSON.stringify(u)); } catch {} }, marchand.user);

  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  await page.goto(`${BASE}/marchand/fidelite`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  check('accès écran fidélité (sans redirection login/onboarding)', /\/marchand\/fidelite/.test(page.url()), page.url());
  await page.screenshot({ path: `${OUT}/01-fidelite-initial.png`, fullPage: true });

  // ── Réglages : paramétrer + activer le barème ────────────────────────────
  try {
    await page.getByLabel('Réglages').click({ timeout: 8000 });
    await page.waitForTimeout(400);
    // Programme désactivé par défaut → on l'active. Ciblage par RÔLE bouton :
    // le même libellé apparaît aussi (hors modale) dans le sous-titre d'écran.
    await page.getByRole('button', { name: /Programme (désactivé|activé)/i }).click({ timeout: 8000 });
    await page.waitForTimeout(200);

    const setNumberField = async (labelRe, value) => {
      const label = page.getByText(labelRe, { exact: false });
      const input = label.locator('xpath=following-sibling::input[1]');
      await input.fill(String(value));
    };
    await setNumberField(/Points par 100 FCFA/i, 2);
    await setNumberField(/Récompense atteinte à/i, 10);
    await setNumberField(/Valeur de la récompense/i, 500);
    await page.screenshot({ path: `${OUT}/02-reglages-bareme.png`, fullPage: true });

    await page.getByRole('button', { name: /Enregistrer le barème/i }).click({ timeout: 8000 });
    await page.waitForTimeout(700);
    check('UI : toast « Barème enregistré »', /Barème enregistré/i.test(await page.content()));
  } catch (e) {
    check('réglages du barème (UI)', false, 'interaction UI échouée : ' + e.message.split('\n')[0]);
  }

  // Persistance RÉELLE : relecture API indépendante de l'état React.
  const cfg = await (await ctx.request.get(`${BASE}/api/v1/fidelite/config`)).json();
  check('barème réellement PERSISTÉ (relecture API)', cfg?.config?.actif === true
    && Number(cfg?.config?.points_par_cent) === 2
    && Number(cfg?.config?.seuil_points) === 10
    && Number(cfg?.config?.recompense_fcfa) === 500,
    JSON.stringify(cfg?.config));

  // ── Fiche client : recherche (nouveau client) ────────────────────────────
  await page.goto(`${BASE}/marchand/fidelite`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  try {
    await page.getByPlaceholder(/07 00 00 00 00/).fill(TEL_CLIENT);
    await page.getByRole('button', { name: /Voir/i }).click({ timeout: 8000 });
    await page.waitForTimeout(500);
    check('UI : nouveau client détecté (aucune fiche existante)', /Nouveau client/i.test(await page.content()));
  } catch (e) {
    check('UI : recherche client', false, 'interaction UI échouée : ' + e.message.split('\n')[0]);
  }

  // ── 1er achat qualifiant (300 FCFA → +6 points au barème 2 pts/100F) ────
  try {
    await page.getByPlaceholder(/Montant de l'achat/i).fill('300');
    await page.getByRole('button', { name: /Points/i }).click({ timeout: 8000 });
    await page.waitForTimeout(700);
    const body = await page.content();
    check('UI : +6 points affichés après le 1er achat', /\+6 point/i.test(body));
  } catch (e) {
    check('UI : 1er achat (gain de points)', false, 'interaction UI échouée : ' + e.message.split('\n')[0]);
  }
  await page.screenshot({ path: `${OUT}/03-premier-achat.png`, fullPage: true });

  // ── 2e achat (400 FCFA → total 14 points, seuil 10 franchi) ──────────────
  try {
    await page.getByPlaceholder(/Montant de l'achat/i).fill('400');
    await page.getByRole('button', { name: /Points/i }).click({ timeout: 8000 });
    await page.waitForTimeout(700);
    const body = await page.content();
    check('UI : « Récompense disponible » affiché (seuil franchi : 14 ≥ 10)', /Récompense disponible/i.test(body));
    check('UI : bouton « Utiliser la récompense » visible', /Utiliser la récompense/i.test(body));
  } catch (e) {
    check('UI : 2e achat (seuil franchi)', false, 'interaction UI échouée : ' + e.message.split('\n')[0]);
  }
  await page.screenshot({ path: `${OUT}/04-seuil-franchi.png`, fullPage: true });

  // ── Récompense accordée dans l'UI ────────────────────────────────────────
  try {
    await page.getByRole('button', { name: /Utiliser la récompense/i }).click({ timeout: 8000 });
    await page.waitForTimeout(700);
    const body = await page.content();
    check('UI : toast de remise (500 FCFA)', /500.*FCFA de remise/i.test(body));
    check('UI : bouton récompense disparu après octroi (14 → 4 points)', !/Utiliser la récompense/i.test(body));
  } catch (e) {
    check('UI : octroi de la récompense', false, 'interaction UI échouée : ' + e.message.split('\n')[0]);
  }
  await page.screenshot({ path: `${OUT}/05-recompense-accordee.png`, fullPage: true });

  // ── Historique : la preuve consultable du journal append-only ───────────
  try {
    await page.getByRole('button', { name: /historique/i }).click({ timeout: 8000 });
    await page.waitForTimeout(600);
    const body = await page.content();
    check('UI : historique affiche 2 achats + 1 récompense', /Achat 300/.test(body) && /Achat 400/.test(body) && /Récompense 500/.test(body));
  } catch (e) {
    check('UI : ouverture historique', false, 'interaction UI échouée : ' + e.message.split('\n')[0]);
  }
  await page.screenshot({ path: `${OUT}/06-historique.png`, fullPage: true });

  console.log('\nTEL_CLIENT=' + TEL_CLIENT);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n=== RÉSULTAT NAVIGATEUR : ${results.length - failed.length}/${results.length} verts ===`);
process.exit(failed.length > 0 ? 1 : 0);
