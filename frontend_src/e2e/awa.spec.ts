import { test, expect, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Client } = require('/workspace/julaba-app/backend/node_modules/pg');
const bcrypt = require('/workspace/julaba-app/backend/node_modules/bcryptjs');

// ── Scénario métier UI : « La journée d'Awa » ───────────────────────────────
// Exerce dans Chromium les deux comportements les plus fragiles du parcours :
//   (1) restauration de la session après rechargement HORS-LIGNE ;
//   (2) rejeu de la file hors-ligne à la reconnexion (+ 2e rejeu = pas de doublon).
// Assertions : UI (session visible, 8 000 à la fermeture) ET données (1 session,
// 1 vente, fond inchangé, file vide, invariante caisse = fond + Σ).

const PHONE = '+2250726262626';
const PHONE_LOCAL = '0726262626';
const CODE = '0000';
const FOND = 5000;
const PRIX_VENTE = 3000;
const CAISSE_FINALE = FOND + PRIX_VENTE; // 8000

function db() {
  return new Client({ host: '127.0.0.1', port: 5433, user: 'postgres', password: process.env.DB_PASSWORD, database: 'julaba' });
}
async function q(sql: string, p: any[] = []) { const c = db(); await c.connect(); const r = await c.query(sql, p); await c.end(); return r.rows; }

let mid = '';

// Saisie via le pavé numérique de l'app (pas d'<input> classique).
async function tap(page: Page, digits: string) {
  for (const d of digits) { await page.getByRole('button', { name: d, exact: true }).first().click(); await page.waitForTimeout(120); }
}
async function connexion(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Commencer/i }).first().click().catch(() => {});
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Passer/i }).first().click().catch(() => {});
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Je sais lire et écrire/i }).first().click().catch(() => {});
  await page.waitForTimeout(1800);
  await tap(page, PHONE_LOCAL);          // téléphone
  await page.waitForTimeout(2500);
  await tap(page, CODE);                 // code à 4 chiffres
  await page.waitForURL('**/marchand', { timeout: 20_000 });
}

async function fileHorsLigne(page: Page): Promise<number> {
  return page.evaluate(() => new Promise<number>((resolve) => {
    const req = indexedDB.open('julaba_offline', 1);
    req.onsuccess = () => { const dbi = req.result; try { const g = dbi.transaction('caisse_outbox', 'readonly').objectStore('caisse_outbox').getAll(); g.onsuccess = () => resolve(g.result.length); g.onerror = () => resolve(-1); } catch { resolve(0); } };
    req.onerror = () => resolve(0);
  }));
}

test.beforeAll(async () => {
  const rows = await q(`SELECT id FROM users WHERE phone=$1`, [PHONE]);
  mid = rows[0]?.id;
  expect(mid, 'marchande Awa introuvable').toBeTruthy();
  // État propre + déverrouillé + mot de passe connu + pas de changement forcé.
  const hash = bcrypt.hashSync(CODE, 10);
  await q(`UPDATE users SET password_hash=$2, must_change_password=false, failed_pin_attempts=0, locked_until=NULL WHERE id=$1`, [mid, hash]);
  await q(`DELETE FROM caisse_transactions WHERE marchand_id=$1 AND created_at::date=CURRENT_DATE`, [mid]);
  await q(`DELETE FROM caisse_sessions WHERE marchand_id=$1 AND date=CURRENT_DATE`, [mid]);
  // Produit déterministe à 3000 pour un total de panier exact.
  await q(`DELETE FROM produits WHERE marchand_id=$1 AND nom='Vente Test'`, [mid]);
  await q(`INSERT INTO produits (marchand_id, nom, prix, prix_achat, stock, unite, categorie, actif) VALUES ($1,'Vente Test',$2,0,100,'pièce','autres',true)`, [mid, PRIX_VENTE]);
});

test('La journée d\'Awa — ouverture, hors-ligne, rechargement, vente, sync, fermeture', async ({ page, context }) => {
  test.setTimeout(120_000);
  // Forcer la vue avancée (boutons ouverture/fermeture) + couper l'onboarding.
  await page.addInitScript(() => {
    localStorage.setItem('julaba_marchand_mode', 'advanced');
    localStorage.setItem('julaba_score_onboarding_marchand', 'true');
  });

  // ── 1. Connexion (intro + pavé numérique, auto-soumis) ──
  await connexion(page);
  console.log('✅ 1. Connectée, sur /marchand');

  // ── 2. Ouvrir la journée à 5 000 (EN LIGNE) ──
  await page.getByRole('button', { name: /Ouvrir ma journée/i }).click();
  await page.locator('#fondInitial').fill(String(FOND));
  await page.getByRole('button', { name: 'Ouvrir la journée' }).click();
  await expect(page.getByText(/Journée ouverte/i)).toBeVisible({ timeout: 15_000 });
  await expect.poll(async () => (await q(`SELECT count(*)::int n FROM caisse_sessions WHERE marchand_id=$1 AND date=CURRENT_DATE`, [mid]))[0].n, { timeout: 10_000 }).toBe(1);
  console.log('✅ 2. Journée ouverte à 5 000 (serveur : 1 session)');

  // ── 3. Ouvrir le POS EN LIGNE (catalogue chargé), attendre le contrôle du SW ──
  await page.goto('/marchand/caisse');
  const ajouter = page.locator('[data-testid="pos-ajouter-Vente Test"]');
  await expect(ajouter).toBeVisible({ timeout: 15_000 });
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 20_000 });

  // ── 4. COUPURE RÉSEAU → on encaisse la vente HORS-LIGNE → file durable ──
  await context.setOffline(true);
  await ajouter.click();
  await page.getByRole('button', { name: /Encaisser/i }).click();
  await page.getByRole('button', { name: /Valider la vente/i }).click();
  await expect.poll(() => fileHorsLigne(page), { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
  expect((await q(`SELECT count(*)::int n FROM caisse_transactions WHERE marchand_id=$1 AND type='vente' AND created_at::date=CURRENT_DATE`, [mid]))[0].n, 'vente en file, pas encore serveur').toBe(0);
  console.log('✅ 4. Vente encaissée HORS-LIGNE → en file (serveur : 0 vente)');

  // ── 5. RECHARGEMENT HORS-LIGNE (fermeture/réouverture) : session ET file survivent ──
  await page.goto('/marchand', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Journée ouverte/i)).toBeVisible({ timeout: 30_000 });
  expect(await fileHorsLigne(page), 'la file hors-ligne survit au rechargement').toBeGreaterThanOrEqual(1);
  console.log('✅ 5. Après rechargement HORS-LIGNE : journée restaurée + vente toujours en file');

  // ── 6. RETOUR RÉSEAU → sync (rejeu) + SECOND rejeu → aucun doublon ──
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect.poll(() => fileHorsLigne(page), { timeout: 25_000 }).toBe(0);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForTimeout(1500);
  const apres = (await q(`SELECT (SELECT count(*) FROM caisse_sessions WHERE marchand_id=$1 AND date=CURRENT_DATE) sess, (SELECT count(*) FROM caisse_transactions WHERE marchand_id=$1 AND type='vente' AND created_at::date=CURRENT_DATE) vte, (SELECT max(fond_initial) FROM caisse_sessions WHERE marchand_id=$1 AND date=CURRENT_DATE) fond, (SELECT coalesce(sum(montant),0) FROM caisse_transactions WHERE marchand_id=$1 AND type='vente' AND created_at::date=CURRENT_DATE) total`, [mid]))[0];
  expect(Number(apres.sess), '1 seule session').toBe(1);
  expect(Number(apres.vte), '1 seule vente (pas de doublon)').toBe(1);
  expect(Number(apres.fond), 'fond initial inchangé').toBe(FOND);
  expect(Number(apres.total), 'total ventes = 3000').toBe(PRIX_VENTE);
  console.log('✅ 6. Réseau revenu : file vidée, double rejeu SANS doublon (1 session, 1 vente, fond 5000)');

  // ── 7. La caisse AFFICHE 8 000, puis FERMETURE enregistre 8 000 ──
  await page.goto('/marchand');
  // Le client reflète la vente synchronisée : la caisse affichée passe à 8 000.
  // La valeur peut être formatée « 8,000 » / « 8 000 » / « 8000 » selon la locale.
  await expect(page.getByTestId('caisse-value').first()).toContainText(/8\D*000/, { timeout: 20_000 });
  await page.getByRole('button', { name: /Journée ouverte/i }).click();
  await page.getByRole('button', { name: /Fermer la caisse/i }).first().click();
  const comptage = page.getByPlaceholder('Montant en FCFA');
  await expect(comptage).toBeVisible({ timeout: 10_000 });
  await comptage.fill(String(CAISSE_FINALE));
  await page.getByRole('button', { name: /Fermer la caisse/i }).last().click();
  await expect.poll(async () => (await q(`SELECT ouvert FROM caisse_sessions WHERE marchand_id=$1 AND date=CURRENT_DATE`, [mid]))[0]?.ouvert, { timeout: 15_000 }).toBe(false);
  const sFinal = (await q(`SELECT fond_final FROM caisse_sessions WHERE marchand_id=$1 AND date=CURRENT_DATE`, [mid]))[0];
  expect(Number(sFinal.fond_final), 'comptage enregistré = 8000').toBe(CAISSE_FINALE);
  console.log('✅ 7. Caisse affiche 8 000 et fermeture enregistre 8 000');

  // ── 8. Rechargement final : la journée reste FERMÉE ──
  await page.reload();
  await expect(page.getByText(/Ouvrir ma journée/i)).toHaveCount(0, { timeout: 10_000 });
  console.log('✅ 8. Après rechargement : journée toujours fermée');

  // ── 9. Invariante financière verte ──
  const inv = (await q(`SELECT coalesce(fond_initial,0)
      + coalesce((SELECT sum(montant) FROM caisse_transactions WHERE marchand_id=$1 AND type='vente' AND created_at::date=CURRENT_DATE),0)
      - coalesce((SELECT sum(montant) FROM caisse_transactions WHERE marchand_id=$1 AND type='depense' AND created_at::date=CURRENT_DATE),0) AS caisse
      FROM caisse_sessions WHERE marchand_id=$1 AND date=CURRENT_DATE`, [mid]))[0];
  expect(Number(inv.caisse), 'invariante caisse = fond + Σ = 8000').toBe(CAISSE_FINALE);
  console.log('✅ 9. Invariante verte : caisse dérivée = 8000');
});

test.afterAll(async () => {
  await q(`DELETE FROM produits WHERE marchand_id=$1 AND nom='Vente Test'`, [mid]).catch(() => {});
});
