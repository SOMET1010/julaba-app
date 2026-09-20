/**
 * CAPTURE ET MESURES de la caisse en portrait 390 × 844 (VOIX-01, lot F).
 * Lancer depuis frontend_src :  node apercu-caisse/capture.mjs
 *   MAQUETTE_CAISSE=/chemin/8.webp   → produit aussi la comparaison côte à côte
 *   APERCU_LARGE=/chemin/large.png   → capture de contrôle en 1280 × 900 (lg:)
 *
 * Ce que ce script fait, dans l'ordre :
 *   1. démarre un serveur Vite de dev sur la config jetable (contextes stubés) ;
 *   2. ouvre Chromium (Playwright, exécutable déjà présent — RIEN n'est
 *      installé) sur un viewport de téléphone, TOUTE requête hors localhost
 *      étant bloquée : la capture ne dépend d'aucun réseau ;
 *   3. touche le billet de 5 000 F pour obtenir « Reçu 5 000 » comme la maquette
 *      (le panier de démonstration fait 2 900 F : la monnaie VRAIE est 2 100 F —
 *      la maquette écrit 1 000, ce qui ne tombe pas juste ; on ne triche pas) ;
 *   4. MESURE : largeur de défilement du document (≤ 390 ?), éléments
 *      interactifs qui sortent du viewport en largeur, cibles tactiles < 44 px ;
 *   5. capture : le viewport en 390 × 844 exacts (1×), la page entière (2×),
 *      et une image de COMPARAISON côte à côte maquette | rendu (sans réseau :
 *      les deux fichiers sont lus sur le disque).
 * Les mesures sont imprimées en JSON et le script sort en 1 si une règle est
 * violée — pour qu'une régression visuelle soit bruyante, pas seulement visible.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = resolve(ici, '..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const PORT = 5199;
const URL_PAGE = `http://127.0.0.1:${PORT}/apercu-caisse/`;
const VIEWPORT = { width: 390, height: 844 };
const CIBLE_MIN = 44;
const SORTIE = resolve(racine, '..', 'docs', 'parcours', 'captures');
const MAQUETTE = process.env.MAQUETTE_CAISSE || '';
const EXECUTABLE = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

mkdirSync(SORTIE, { recursive: true });

// 1. Serveur Vite (config jetable). `require.resolve` : vite est hissé à la
// racine du workspace npm, pas forcément dans frontend_src/node_modules.
const viteBin = resolve(dirname(require.resolve('vite/package.json')), 'bin/vite.js');
const serveur = spawn(process.execPath, [viteBin, '--config', 'apercu-caisse/vite.config.ts', '--logLevel', 'warn'], { cwd: racine, stdio: ['ignore', 'pipe', 'pipe'] });
serveur.stderr.on('data', d => process.stderr.write(`[vite] ${d}`));
const attendreServeur = async () => {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(URL_PAGE); if (r.ok) return; } catch { /* pas encore */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Le serveur Vite ne répond pas sur ' + URL_PAGE);
};

const bloquees = [];
const erreursPage = [];
/** Ouvre la caisse dans un contexte au facteur d'échelle donné, joue le geste
 *  de la maquette (billet de 5 000 F) et revient en haut de page. */
async function monterCaisse(navigateur, viewport, deviceScaleFactor) {
  const contexte = await navigateur.newContext({ viewport, deviceScaleFactor, isMobile: viewport.width < 1024, hasTouch: viewport.width < 1024, locale: 'fr-FR' });
  // 2. Aucune requête ne sort de la machine : ce qui manque manque pour de vrai.
  await contexte.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith(`http://127.0.0.1:${PORT}/`) || u.startsWith('data:')) return route.continue();
    bloquees.push(u);
    return route.abort();
  });
  const page = await contexte.newPage();
  page.on('pageerror', e => erreursPage.push(String(e)));
  await page.goto(URL_PAGE, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Que voulez-vous vendre ?' }).waitFor({ timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  // 3. Le geste de la maquette : un billet de 5 000 F reçu.
  await page.getByRole('button', { name: /billet de 5.000 francs/ }).first().click();
  // `.first()` : le panneau grand écran (`hidden lg:flex`) rend le même pied,
  // invisible sous 1024 px — on attend celui qui se voit.
  await page.getByText('Monnaie :').locator('visible=true').first().waitFor();
  await page.waitForTimeout(700); // fin des animations d'entrée (motion)
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  return page;
}

let code = 0;
const navigateur = await chromium.launch({ headless: true, executablePath: EXECUTABLE, args: ['--no-sandbox', '--font-render-hinting=none'] });
try {
  await attendreServeur();

  // Page téléphone à 2× : mesures + capture pleine page.
  const page = await monterCaisse(navigateur, VIEWPORT, 2);

  // 4. Mesures dans le DOM rendu.
  const mesures = await page.evaluate(({ largeur, cibleMin }) => {
    const visible = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const libelle = (el) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 60);
    const interactifs = [...document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]')]
      .filter(visible)
      // Un <input> entouré d'un <label> : c'est l'étiquette entière qui est
      // la cible (c'est ce que scripts/test-cible-tactile.mjs vérifie).
      .map(el => (el.tagName === 'INPUT' && el.closest('label')) ? el.closest('label') : el);
    const rects = interactifs.map(el => ({ el, r: el.getBoundingClientRect() }));
    const debordent = rects.filter(({ r }) => r.left < -0.5 || r.right > largeur + 0.5).map(({ el, r }) => ({ quoi: libelle(el), left: Math.round(r.left), right: Math.round(r.right) }));
    const petites = rects.filter(({ r }) => Math.min(r.width, r.height) < cibleMin - 0.5).map(({ el, r }) => ({ quoi: libelle(el), w: Math.round(r.width), h: Math.round(r.height) }));
    const h1 = document.querySelector('h1');
    return {
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      interactifs: rects.length,
      debordent,
      ciblesSous44: petites,
      h1: h1 ? { texte: h1.textContent, lignes: Math.round(h1.getBoundingClientRect().height / 34) } : null,
      total: document.querySelector('[aria-label^="Total "]')?.getAttribute('aria-label') || null,
      polices: [...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family} ${f.weight}`).filter((v, i, a) => a.indexOf(v) === i),
    };
  }, { largeur: VIEWPORT.width, cibleMin: CIBLE_MIN });

  // 5. Captures.
  const cheminPleine = resolve(SORTIE, 'caisse-portrait-lotF-pleine.png');
  await page.screenshot({ path: cheminPleine, fullPage: true });
  await page.context().close();

  // Le viewport en 390 × 844 exacts (1 px CSS = 1 px image), comme demandé.
  const page1x = await monterCaisse(navigateur, VIEWPORT, 1);
  const cheminViewport = resolve(SORTIE, 'caisse-portrait-lotF.png');
  await page1x.screenshot({ path: cheminViewport, fullPage: false });
  await page1x.context().close();

  // Contrôle grand écran (deux colonnes, panier à droite) — hors dépôt.
  if (process.env.APERCU_LARGE) {
    const pageL = await monterCaisse(navigateur, { width: 1280, height: 900 }, 1);
    await pageL.screenshot({ path: process.env.APERCU_LARGE, fullPage: false });
    await pageL.context().close();
  }

  let cheminComparaison = null;
  if (MAQUETTE && existsSync(MAQUETTE)) {
    cheminComparaison = resolve(SORTIE, 'caisse-portrait-lotF-comparaison.png');
    const html = resolve(ici, '.comparaison.html');
    writeFileSync(html, `<!doctype html><html lang="fr"><meta charset="utf-8">
<style>
  body { margin: 0; background: #F5EBDD; font: 600 16px/24px Inter, system-ui, sans-serif; color: #332533; }
  .cadre { display: flex; gap: 24px; padding: 24px; align-items: flex-start; }
  figure { margin: 0; display: flex; flex-direction: column; gap: 8px; }
  figcaption { text-align: center; }
  img { display: block; height: 1600px; width: auto; border-radius: 16px; background: #fff; }
  img.rendu { box-shadow: 0 0 0 1px #D8CDC5; }
</style>
<div class="cadre" id="cadre">
  <figure><figcaption>Maquette validée (8.webp)</figcaption><img src="file://${MAQUETTE}" alt=""></figure>
  <figure><figcaption>Rendu réel, page entière (390 px de large, données de démonstration, sans réseau)</figcaption><img class="rendu" src="file://${cheminPleine}" alt=""></figure>
</div></html>`);
    const p2 = await navigateur.newPage({ viewport: { width: 1400, height: 1700 }, deviceScaleFactor: 1 });
    await p2.goto('file://' + html);
    await p2.waitForLoadState('load');
    await p2.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
    await p2.locator('#cadre').screenshot({ path: cheminComparaison });
    await p2.close();
    unlinkSync(html);
  }

  const rapport = { ...mesures, requetesBloquees: bloquees.length, erreursPage, captures: { viewport: cheminViewport, pleine: cheminPleine, comparaison: cheminComparaison } };
  console.log(JSON.stringify(rapport, null, 2));
  if (mesures.scrollWidth > VIEWPORT.width) { console.error(`✗ débordement horizontal : scrollWidth ${mesures.scrollWidth} > ${VIEWPORT.width}`); code = 1; }
  if (mesures.debordent.length) { console.error(`✗ ${mesures.debordent.length} élément(s) interactif(s) sortent du viewport`); code = 1; }
  if (mesures.ciblesSous44.length) { console.error(`✗ ${mesures.ciblesSous44.length} cible(s) tactile(s) sous ${CIBLE_MIN} px`); code = 1; }
  if (erreursPage.length) { console.error(`✗ ${erreursPage.length} erreur(s) de page`); code = 1; }
  if (code === 0) console.log(`✓ 390 px sans débordement, ${mesures.interactifs} cibles interactives toutes ≥ ${CIBLE_MIN} px`);
} finally {
  await navigateur.close();
  serveur.kill('SIGTERM');
}
process.exit(code);
