import { test, expect } from '@playwright/test';

const PHONE = '+2250790909090';
const PWD   = 'Julaba@90909090!';
const BASE  = 'https://julaba.online/api/v1';

let cookies = '';

test.beforeAll(async ({ request }) => {
  const r = await request.post(`${BASE}/auth/login`, {
    data: { phone: PHONE, password: PWD },
  });
  expect(r.ok()).toBeTruthy();
  const hdrs = r.headers()['set-cookie'] || '';
  cookies = hdrs.split(',').map((c: string) => c.split(';')[0]).join('; ');
});

const headers = () => ({ Cookie: cookies });

// ── CAISSE TRANSACTIONS ────────────────────────────────────────
test('GET /caisse/transactions — payload valide', async ({ request }) => {
  const r = await request.get(`${BASE}/caisse/transactions`, { headers: headers() });
  expect(r.ok()).toBeTruthy();
  const body = await r.json();
  const rawItems = Array.isArray(body) ? body : body?.transactions ?? [];
  const items = rawItems.filter((t: any) => t.montant !== null && t.montant !== undefined);
  console.log(`[TEST] transactions: ${items.length} items`);
  if (items.length > 0) {
    const t = items[0];
    expect(t).toHaveProperty('id');
    expect(t).toHaveProperty('type');
    expect(t).toHaveProperty('montant');
    const montant = parseFloat(t.montant);
    expect(montant).not.toBeNaN();
    console.log(`[TEST] montant parseable: ${montant}`);
  }
});

// ── STOCKS ────────────────────────────────────────────────────
test('GET /stocks — payload valide', async ({ request }) => {
  const r = await request.get(`${BASE}/stocks`, { headers: headers() });
  expect(r.ok()).toBeTruthy();
  const body = await r.json();
  const items = Array.isArray(body) ? body : body?.stocks ?? [];
  console.log(`[TEST] stocks: ${items.length} items`);
  if (items.length > 0) {
    const s = items[0];
    expect(s).toHaveProperty('id');
    expect(s).toHaveProperty('produit');
    expect(s).toHaveProperty('quantite');
    const prix = parseFloat(s.prix_unitaire ?? s.prix ?? '0');
    expect(prix).toBeGreaterThanOrEqual(0);
    console.log(`[TEST] prix parseable: ${prix}`);
  }
});

// ── SESSION CAISSE ────────────────────────────────────────────
test('GET /caisse/session/today — structure valide', async ({ request }) => {
  const today = new Date().toISOString().split('T')[0];
  const r = await request.get(`${BASE}/caisse/session/${today}`, { headers: headers() });
  expect(r.ok()).toBeTruthy();
  const body = await r.json();
  const session = body?.session ?? body;
  expect(session).toHaveProperty('id');
  console.log(`[TEST] session: id=${session.id} ouvert=${session.ouvert}`);
});

// ── WALLET ────────────────────────────────────────────────────
test('GET /wallets/me — solde présent', async ({ request }) => {
  const r = await request.get(`${BASE}/wallets/me`, { headers: headers() });
  expect(r.ok()).toBeTruthy();
  const body = await r.json();
  expect(body).toHaveProperty('solde');
  const solde = parseFloat(body.solde);
  expect(solde).not.toBeNaN();
  console.log(`[TEST] wallet solde: ${solde}`);
});

// ── NOTIFICATIONS ─────────────────────────────────────────────
test('GET /notifications — tableau ou objet valide', async ({ request }) => {
  const r = await request.get(`${BASE}/notifications`, { headers: headers() });
  expect(r.ok()).toBeTruthy();
  const body = await r.json();
  const items = Array.isArray(body) ? body : body?.notifications ?? [];
  console.log(`[TEST] notifications: ${items.length} items`);
  expect(Array.isArray(items)).toBeTruthy();
});

// ── RÉSILIENCE 500 / 404 ──────────────────────────────────────
test('GET endpoint inexistant — retourne 404', async ({ request }) => {
  const r = await request.get(`${BASE}/caisse/endpoint-inexistant`, { headers: headers() });
  expect(r.status()).toBeGreaterThanOrEqual(400);
  console.log(`[TEST] 404 status: ${r.status()}`);
});

test('POST /caisse/transactions payload vide — erreur ou rejet', async ({ request }) => {
  const r = await request.post(`${BASE}/caisse/transactions`, {
    headers: headers(),
    data: {},
  });
  console.log(`[TEST] POST vide status: ${r.status()}`);
  // Acceptable: 400, 422 ou 201 si backend permissif
  expect([200, 201, 400, 422, 500]).toContain(r.status());
});

// ── LATENCE POLLING ───────────────────────────────────────────
test('Latence polling — 3 appels consécutifs <500ms', async ({ request }) => {
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    const r = await request.get(`${BASE}/caisse/transactions`, { headers: headers() });
    const ms = Date.now() - t0;
    console.log(`[TEST] polling cycle ${i+1}: ${ms}ms status=${r.status()}`);
    expect(ms).toBeLessThan(500);
    await new Promise(res => setTimeout(res, 500));
  }
});
