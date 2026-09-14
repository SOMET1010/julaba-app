// Vérification de l'ÉCRAN D'ADOPTION (PILOTE-3, lot 3), pilotée dans un vrai
// navigateur : chercher une référence Odoo, la choisir, poser SON prix, et la
// retrouver au panier.
//
// Ce n'est pas encore la recette du lot 4 (qui couvrira Odoo éteint, backend
// coupé, cache local). C'est la preuve que le geste marche bout en bout, et
// surtout que le prix qui atterrit en base est celui de la marchande, jamais
// le 0 du référentiel.
//
// Prérequis : stack montée (backend :3000 + proxy :4180 + base julaba_p3
// synchronisée). Lancer depuis la racine du dépôt :
//     node frontend_src/e2e/verif-adoption-ecran.mjs
import { chromium } from 'playwright-core';
import pg from 'pg';

const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = 'http://127.0.0.1:4180';
const OUT = '/tmp/adoption';
const MARCHANDE = { phone: '+2250700000009', password: '1234' };
const REF = { code: 'CAR-001', nom: 'Carotte', prix: '750' };

const db = new pg.Client({ host: '127.0.0.1', port: 5432, user: 'julaba_user', password: 'test', database: 'julaba_p3' });
await db.connect();

const resultats = [];
const ok = (label, cond, extra = '') => {
  resultats.push({ label, cond: !!cond });
  console.log(`${cond ? '  OK  ' : '  KO  '}${label}${extra ? '  — ' + extra : ''}`);
};

const browser = await chromium.launch({ executablePath: EXEC, headless: true, args: ['--no-sandbox'] });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const r = await ctx.request.post(`${BASE}/api/v1/auth/login`, { data: MARCHANDE });
  const session = await r.json();
  await ctx.addInitScript((u) => {
    try {
      localStorage.setItem('julaba_auth_user', JSON.stringify(u));
      localStorage.setItem('julaba_completed_onboarding', 'true');
    } catch { /* ignore */ }
  }, session.user);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message.split('\n')[0]));

  const avant = await db.query(
    `SELECT count(*)::int AS n FROM produits WHERE marchand_id = $1::text AND default_code = $2`,
    [session.user.id, REF.code],
  );
  ok('la référence n\'est pas encore adoptée', avant.rows[0].n === 0);

  await page.goto(`${BASE}/marchand/caisse`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  await page.getByRole('button', { name: /Autre article/i }).first().click({ timeout: 20000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/01-autre-article.png`, fullPage: true });
  ok('la feuille « Autre article » propose de chercher un produit',
    await page.getByPlaceholder(/Chercher|tomate, igname/i).first().isVisible().catch(() => false));

  await page.getByPlaceholder(/tomate, igname/i).first().fill('carot');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/02-resultats.png`, fullPage: true });
  const proposition = page.getByRole('button', { name: new RegExp(REF.nom, 'i') }).first();
  ok('le référentiel Odoo propose la référence', await proposition.isVisible().catch(() => false));

  await proposition.click();
  await page.waitForTimeout(600);
  const html = await page.content();
  ok('l\'écran demande SON prix de vente', /Ton prix de vente/.test(html));
  ok('l\'écran propose les unités locales', /tas/.test(html) && /bassine/.test(html));
  await page.screenshot({ path: `${OUT}/03-prix.png`, fullPage: true });

  // Sans prix, le bouton reste inerte : l'article à 0 F n'est pas atteignable.
  const bouton = page.getByRole('button', { name: /Ajouter à mon catalogue/i }).first();
  ok('sans prix, « Ajouter à mon catalogue » est désactivé', await bouton.isDisabled().catch(() => false));

  await page.getByPlaceholder('0').first().fill(REF.prix);
  await page.getByRole('button', { name: 'tas', exact: true }).first().click();
  await page.waitForTimeout(300);
  await bouton.click();
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}/04-apres-adoption.png`, fullPage: true });

  const apres = await db.query(
    `SELECT nom, prix, unite, stock, default_code FROM produits WHERE marchand_id = $1::text AND default_code = $2`,
    [session.user.id, REF.code],
  );
  ok('le produit existe en base, au prix de la marchande', apres.rows.length === 1,
    JSON.stringify(apres.rows[0]));
  ok('il porte le lien vers la référence Odoo', apres.rows[0]?.default_code === REF.code);
  ok('le prix est bien le sien, pas celui du référentiel (0)', Number(apres.rows[0]?.prix) === Number(REF.prix));
  ok('l\'unité locale est enregistrée', apres.rows[0]?.unite === 'tas');

  const apresHtml = await page.content();
  ok('l\'article est au panier, prêt à être vendu', /Encaisser/.test(apresHtml) && new RegExp(REF.nom).test(apresHtml));

  // Deuxième passage : la référence ne doit plus être proposée à l'adoption.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: /Autre article/i }).first().click({ timeout: 20000 });
  await page.waitForTimeout(600);
  await page.getByPlaceholder(/tomate, igname/i).first().fill('carot');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/05-deja-adoptee.png`, fullPage: true });
  ok('une référence déjà adoptée est signalée, pas reproposée',
    /Déjà dans ta caisse/.test(await page.content()));
} finally {
  await browser.close().catch(() => {});
}

const echecs = resultats.filter((r) => !r.cond);
console.log(`\n${resultats.length - echecs.length}/${resultats.length} vérifications passent`);
await db.end();
process.exit(echecs.length ? 1 : 0);
