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
 *   4. MESURE. D'abord LA RÈGLE DU PREMIER ÉCRAN, quatre conditions
 *      fonctionnelles à défilement zéro, panier non vide (Patrick ; elle
 *      remplace la règle de hauteur de la révision 20, dette UI-03, qui
 *      exigeait panier + barre Total au-dessus du pli) :
 *        1/4 surface de vente compréhensible — la grille est là et au moins
 *            une carte produit tient ENTIÈREMENT dans les 844 px ;
 *        2/4 accès vocal ET tactile — le micro et « Choisir à l'écran »
 *            visibles, ≥ 44 px, non recouverts, réellement cliquables ;
 *        3/4 aperçu du panier — le nombre d'articles est lisible ;
 *        4/4 Total visible — un élément porte LE MONTANT TOTAL (le même que
 *            celui de la barre Total du panier, pas un nombre voisin), entier
 *            dans les 844 px et non tronqué ; peu importe quel bloc le porte,
 *            raccourci panier ou barre Total.
 *      Puis ce qui reste vrai et utile : largeur de défilement du document
 *      (≤ 390 ?), éléments interactifs qui sortent du viewport en largeur,
 *      cibles tactiles < 44 px, erreurs de page ;
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
// Suffixe des fichiers produits (lotF, F2, UI03…) : on ne réécrit pas
// l'histoire, chaque passe laisse sa capture. « A8 » = la passe de la règle du
// premier écran ; les captures « UI03 » restent celles de la règle de hauteur
// qu'elle remplace.
const PASSE = process.env.PASSE_CAPTURE || 'A8';
// L'ÉCRAN DU TÉLÉPHONE dans 8.webp, mesuré au pixel (scan des bords sombres
// du cadre, puis de la barre d'état) : intérieur x 97→844, du haut de
// « Caisse du jour » (y 135, sous la barre d'état) au bas visible (y 1611).
// 747 px d'image = 390 px CSS : c'est CETTE échelle qui sert à la comparaison,
// la même pour la maquette et pour le rendu — jamais un redimensionnement
// différent des deux côtés.
const ECRAN_MAQUETTE = { x: 97, y: 135, largeur: 747, hauteur: 1476 };
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
  const mesures = await page.evaluate(({ largeur, hauteur, cibleMin }) => {
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
    const haut = (el) => el ? Math.round(el.getBoundingClientRect().height) : null;
    const boutonPayer = [...document.querySelectorAll('button')].find(b => /Payer en espèces/.test(b.textContent || '') && visible(b));
    const carteRecu = [...document.querySelectorAll('div')].find(d => /^Reçu :$/.test((d.textContent || '').trim()) && visible(d))?.parentElement?.parentElement;

    // ── LA RÈGLE DU PREMIER ÉCRAN ─────────────────────────────────────
    // Tranchée par Patrick, elle REMPLACE la règle de hauteur de la révision 20
    // (dette UI-03), qui exigeait que le haut du panier ET le bas de la barre
    // Total tiennent dans les 844 px. Ce n'était pas une règle de sens, c'était
    // une hauteur : elle rougissait des deux côtés du lot A9 sans rien dire de
    // ce que la marchande peut faire.
    //   « Le Total doit rester visible sans défilement. C'est une information
    //     financière primaire. Je n'exige pas que tout le panier ni toute la
    //     zone de paiement soient visibles au-dessus du pli. Premier écran =
    //     surface de vente compréhensible + accès vocal/tactile + aperçu du
    //     panier + Total visible. »
    // Les quatre conditions ci-dessous sont mesurées à DÉFILEMENT ZÉRO, PANIER
    // NON VIDE. Chacune sort son propre message : un rouge doit NOMMER la
    // condition qui tombe, sinon il ne sert à rien.
    const dansEcran = (r) => r.top >= -0.5 && r.bottom <= hauteur + 0.5 && r.left >= -0.5 && r.right <= largeur + 0.5;
    const rond = (r) => ({ haut: Math.round(r.top), bas: Math.round(r.bottom), gauche: Math.round(r.left), droite: Math.round(r.right) });
    // Le rectangle du TEXTE RENDU, pas celui de la boîte : un montant se fait
    // couper par une ellipse ou par un ancêtre qui rogne, pas par sa propre
    // géométrie — mesurer la boîte laisserait passer « 2 90… ».
    const rectTexte = (el) => {
      const rg = document.createRange(); rg.selectNodeContents(el);
      const rs = [...rg.getClientRects()].filter(r => r.width > 0 && r.height > 0);
      if (!rs.length) return null;
      return { left: Math.min(...rs.map(r => r.left)), top: Math.min(...rs.map(r => r.top)), right: Math.max(...rs.map(r => r.right)), bottom: Math.max(...rs.map(r => r.bottom)) };
    };
    // Premier ancêtre qui rogne (overflow non visible) et hors duquel le texte
    // déborde : c'est exactement ce que « tronqué » veut dire à l'écran.
    const rogneur = (el, rt) => {
      for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
          const pr = p.getBoundingClientRect();
          if (rt.left < pr.left - 0.5 || rt.right > pr.right + 0.5 || rt.top < pr.top - 0.5 || rt.bottom > pr.bottom + 0.5) return libelle(p);
        }
      }
      return null;
    };
    // « Visible ET cliquable » : rendu, dans l'écran, au moins 44 px, et le
    // point central rend VRAIMENT ce bouton — un voile par-dessus le rend
    // inopérant sans rien changer à sa géométrie.
    const cliquable = (el, quoi) => {
      if (!el) return { ok: false, quoi, pourquoi: 'absent du DOM' };
      if (!visible(el)) return { ok: false, quoi, pourquoi: 'rendu mais invisible' };
      if (el.disabled) return { ok: false, quoi, pourquoi: 'désactivé' };
      const cs = getComputedStyle(el);
      if (cs.pointerEvents === 'none') return { ok: false, quoi, pourquoi: 'pointer-events: none' };
      const r = el.getBoundingClientRect();
      if (!dansEcran(r)) return { ok: false, quoi, rect: rond(r), pourquoi: `hors du premier écran (haut ${Math.round(r.top)}, bas ${Math.round(r.bottom)}, écran ${hauteur})` };
      if (Math.min(r.width, r.height) < cibleMin - 0.5) return { ok: false, quoi, rect: rond(r), pourquoi: `cible ${Math.round(r.width)}×${Math.round(r.height)} sous ${cibleMin} px` };
      const dessus = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
      if (!dessus || !(el.contains(dessus) || dessus.contains(el))) return { ok: false, quoi, rect: rond(r), pourquoi: `recouvert par « ${dessus ? libelle(dessus) : 'rien'} »` };
      return { ok: true, quoi, rect: rond(r) };
    };

    // 1/4 SURFACE DE VENTE COMPRÉHENSIBLE. La grille des produits est présente
    //     et au moins une carte tient ENTIÈREMENT dans le premier écran : une
    //     carte coupée en deux montre sa photo mais ni son nom ni son prix —
    //     on ne vend pas ce qu'on ne peut pas lire.
    const grille = document.querySelector('.pos-grille');
    const cartesRect = [...document.querySelectorAll('.pos-grille > *')].filter(visible)
      .map(el => { const r = el.getBoundingClientRect(); return { quoi: libelle(el), rect: rond(r), entiere: dansEcran(r) }; });
    const carteEntiere = cartesRect.find(c => c.entiere) || null;
    const c1 = (!grille || !visible(grille))
      ? { ok: false, pourquoi: 'la grille des produits (.pos-grille) est absente ou invisible' }
      : carteEntiere
        ? { ok: true, carte: carteEntiere, cartesRendues: cartesRect.length }
        : { ok: false, pourquoi: `aucune des ${cartesRect.length} carte(s) produit ne tient entièrement dans les ${hauteur} px (première carte : haut ${cartesRect[0] ? cartesRect[0].rect.haut : '?'}, bas ${cartesRect[0] ? cartesRect[0].rect.bas : '?'})`, cartes: cartesRect };

    // 2/4 ACCÈS VOCAL ET TACTILE. Le micro, ET le second chemin — les deux, pas
    //     l'un ou l'autre : la marchande qui ne veut pas parler doit pouvoir
    //     choisir à l'écran sans défiler.
    const micro = document.querySelector('section[aria-label="Vendre à la voix"] button[aria-label^="Appuie pour"]');
    const secondChemin = document.querySelector('button[aria-label^="Choisir la vente"]');
    const cMicro = cliquable(micro, 'micro');
    const cEcran = cliquable(secondChemin, '« Choisir à l’écran »');
    const c2 = (cMicro.ok && cEcran.ok)
      ? { ok: true, micro: cMicro, secondChemin: cEcran }
      : { ok: false, micro: cMicro, secondChemin: cEcran, pourquoi: [cMicro, cEcran].filter(x => !x.ok).map(x => `${x.quoi} : ${x.pourquoi}`).join(' ; ') };

    // 3/4 APERÇU DU PANIER : LE NOMBRE D'ARTICLES EST LISIBLE.
    //     Référence : le nom accessible du raccourci panier (« Panier : N
    //     article(s)… »), c'est-à-dire ce que l'application DÉCLARE elle-même.
    //     On exige ensuite qu'un ÉLÉMENT VU porte ce même nombre, entier dans
    //     l'écran et non tronqué. Le motif est ancré sur le mot (« Panier · 6 »,
    //     « 6 articles ») : un « 6 » isolé sur une pastille de stock n'est pas
    //     un aperçu du panier.
    const raccourci = document.querySelector('.caisse-panier-raccourci');
    const ariaRaccourci = raccourci ? (raccourci.getAttribute('aria-label') || '') : '';
    const nArticlesDeclare = (ariaRaccourci.match(/(\d+)\s*article/) || [])[1] || null;
    const motifCompte = /panier\s*[·:]\s*(\d+)|(\d+)\s*articles?\b/i;
    const feuilles = [...document.querySelectorAll('span, strong, b, p, div, li, td, h1, h2, h3')].filter(el => visible(el) && !el.children.length);
    const portentCompte = feuilles.map(el => {
      const m = (el.textContent || '').trim().match(motifCompte);
      if (!m) return null;
      const n = m[1] || m[2];
      if (nArticlesDeclare !== null && n !== nArticlesDeclare) return null;
      const rt = rectTexte(el);
      const base = { quoi: libelle(el), texte: (el.textContent || '').trim().slice(0, 40), n, rect: rt ? rond(rt) : null };
      if (!rt) return { ...base, ok: false, pourquoi: 'aucun texte rendu' };
      if (!dansEcran(rt)) return { ...base, ok: false, pourquoi: `sort du premier écran (haut ${Math.round(rt.top)}, bas ${Math.round(rt.bottom)})` };
      const rg = rogneur(el, rt);
      if (rg) return { ...base, ok: false, pourquoi: `tronqué par « ${rg} »` };
      return { ...base, ok: true };
    }).filter(Boolean);
    const compteLu = portentCompte.find(x => x.ok) || null;
    const c3 = compteLu
      ? { ok: true, nArticles: compteLu.n, declare: nArticlesDeclare, lu: compteLu }
      : { ok: false, declare: nArticlesDeclare, candidats: portentCompte,
          pourquoi: portentCompte.length
            ? `le nombre d'articles est affiché mais jamais lisible au premier écran : ${portentCompte.map(x => `« ${x.texte} » → ${x.pourquoi}`).join(' ; ')}`
            : `aucun élément ne montre le nombre d'articles du panier${nArticlesDeclare ? ` (l'application en déclare ${nArticlesDeclare})` : ''}` };

    // 4/4 TOTAL VISIBLE. Référence : LA BARRE TOTAL DU PANIER, via son nom
    //     accessible « Total N francs » — c'est elle qui dit quel nombre EST le
    //     total. On cherche ensuite, dans toute la page, les éléments FEUILLE
    //     qui affichent EXACTEMENT ce montant : le raccourci panier, la barre
    //     Total elle-même, ou n'importe quel autre bloc — c'est le montant qui
    //     compte, pas quel bloc le porte. Un nombre voisin (le reçu, la
    //     monnaie, le nombre d'articles) ne peut pas passer pour le total :
    //     il ne tombe pas dans cet ensemble.
    const barreTotal = [...document.querySelectorAll('[aria-label^="Total "]')].find(visible) || null;
    const ariaTotal = barreTotal ? (barreTotal.getAttribute('aria-label') || '') : '';
    const mTotal = ariaTotal.match(/^Total\s+([0-9][0-9\s\u00a0\u202f]*)\s*francs/);
    const totalPanier = mTotal ? mTotal[1].replace(/\D/g, '') : null;
    const memeMontant = (el) => (el.textContent || '').replace(/\D/g, '') === totalPanier;
    const porteursTotal = totalPanier === null ? [] : [...document.querySelectorAll('*')]
      .filter(el => visible(el) && memeMontant(el) && ![...el.children].some(memeMontant))
      .map(el => {
        const rt = rectTexte(el);
        const base = { quoi: libelle(el), texte: (el.textContent || '').trim().slice(0, 40),
          ou: el.closest('.caisse-panier-raccourci') ? 'raccourci panier' : el.closest('[aria-label^="Total "]') ? 'barre Total du panier' : 'autre bloc',
          rect: rt ? rond(rt) : null };
        if (!rt) return { ...base, ok: false, pourquoi: 'aucun texte rendu' };
        if (!dansEcran(rt)) return { ...base, ok: false, pourquoi: `sort du premier écran (haut ${Math.round(rt.top)}, bas ${Math.round(rt.bottom)}, écran ${hauteur})` };
        const rg = rogneur(el, rt);
        if (rg) return { ...base, ok: false, pourquoi: `montant tronqué par « ${rg} »` };
        const dessus = document.elementFromPoint((rt.left + rt.right) / 2, (rt.top + rt.bottom) / 2);
        if (!dessus || !(el.contains(dessus) || dessus.contains(el))) return { ...base, ok: false, pourquoi: `montant recouvert par « ${dessus ? libelle(dessus) : 'rien'} »` };
        return { ...base, ok: true };
      });
    const porteurRetenu = porteursTotal.find(x => x.ok) || null;
    const c4 = totalPanier === null
      ? { ok: false, pourquoi: "la barre Total du panier est introuvable : impossible de dire quel nombre EST le total" }
      : porteurRetenu
        ? { ok: true, totalPanier, montantLu: porteurRetenu.texte, porteParLe: porteurRetenu.ou, porteur: porteurRetenu, porteurs: porteursTotal }
        : { ok: false, totalPanier, porteurs: porteursTotal,
            pourquoi: porteursTotal.length
              ? `le total (${totalPanier} F) n'est lisible nulle part au premier écran : ${porteursTotal.map(x => `${x.ou} → ${x.pourquoi}`).join(' ; ')}`
              : `aucun élément n'affiche le total du panier (${ariaTotal || 'barre Total sans nom accessible'})` };

    const zoneVoix = document.querySelector('section[aria-label="Vendre à la voix"]')?.getBoundingClientRect();
    const enTete = document.querySelector('button[aria-label="Retour"]')?.closest('div[style*="fixed"]')?.getBoundingClientRect();
    return {
      premierEcran: { surfaceDeVente: c1, acces: c2, apercuPanier: c3, total: c4 },
      zoneVoixPx: zoneVoix ? Math.round(zoneVoix.height) : null,
      zoneVoixBas: zoneVoix ? Math.round(zoneVoix.bottom) : null,
      enTetePx: enTete ? Math.round(enTete.height) : null,
      carteProduitPx: haut(document.querySelector('.pos-grille > *')),
      cartesVisibles: [...document.querySelectorAll('.pos-grille > *')].filter(visible).length,
      // Positions dans le PREMIER viewport (défilement à 0) : doivent être < 844.
      panierHautPx: Math.round(([...document.querySelectorAll('h2')].find(h => /^Panier actuel/.test(h.textContent || '') && visible(h)) || { getBoundingClientRect: () => ({ top: NaN }) }).getBoundingClientRect().top),
      totalHautPx: Math.round(([...document.querySelectorAll('[aria-label^="Total "]')].find(visible) || { getBoundingClientRect: () => ({ top: NaN }) }).getBoundingClientRect().top),
      totalBasPx: Math.round(([...document.querySelectorAll('[aria-label^="Total "]')].find(visible) || { getBoundingClientRect: () => ({ bottom: NaN }) }).getBoundingClientRect().bottom),
      barreTotalPx: haut(document.querySelector('[aria-label^="Total "]')),
      carteRecuMonnaiePx: haut(carteRecu),
      boutonPayerPx: haut(boutonPayer),
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      interactifs: rects.length,
      debordent,
      ciblesSous44: petites,
      h1: h1 ? { texte: h1.textContent, lignes: Math.round(h1.getBoundingClientRect().height / 34) } : null,
      total: document.querySelector('[aria-label^="Total "]')?.getAttribute('aria-label') || null,
      polices: [...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family} ${f.weight}`).filter((v, i, a) => a.indexOf(v) === i),
    };
  }, { largeur: VIEWPORT.width, hauteur: VIEWPORT.height, cibleMin: CIBLE_MIN });

  // 5. Captures.
  const cheminPleine = resolve(SORTIE, `caisse-portrait-${PASSE}-pleine.png`);
  await page.screenshot({ path: cheminPleine, fullPage: true });
  await page.context().close();

  // Le viewport en 390 × 844 exacts (1 px CSS = 1 px image), comme demandé.
  const page1x = await monterCaisse(navigateur, VIEWPORT, 1);
  const cheminViewport = resolve(SORTIE, `caisse-portrait-${PASSE}.png`);
  await page1x.screenshot({ path: cheminViewport, fullPage: false });
  await page1x.context().close();
  const page2x = await monterCaisse(navigateur, VIEWPORT, 2);
  const cheminViewport2x = resolve(ici, '.viewport-2x.png');
  await page2x.screenshot({ path: cheminViewport2x, fullPage: false });
  await page2x.context().close();

  // « ENCAISSE » DIT, REÇU 5 000 : l'encart de relecture financière en
  // situation. L'intention est INJECTÉE au stub du moteur vocal (pas de
  // micro en headless) sous la forme exacte que le vrai moteur passe à
  // onAction ; la machine, la phrase et l'affichage sont ceux de POSCaisse.
  const pageR = await monterCaisse(navigateur, VIEWPORT, 1);
  await pageR.evaluate(() => window.__apercuVoix.injecter({ action: { type: 'encaisser' }, transcript: 'encaisse', intent: 'encaisser' }));
  const encart = pageR.locator('[role="status"]').locator('visible=true').first();
  await encart.waitFor();
  const relecture = await encart.innerText();
  await pageR.waitForTimeout(400);
  // Le viewport commence sur « Paiement » : billets, relecture, reçu | monnaie, Payer — l'encaissement en un écran.
  await pageR.evaluate(() => { const t = [...document.querySelectorAll('h2')].find(h => /^Paiement$/.test((h.textContent || '').trim()) && h.getBoundingClientRect().width > 0); const y = t.getBoundingClientRect().top + window.scrollY - 12; window.scrollTo(0, y); });
  await pageR.waitForTimeout(300);
  const cheminRelecture = resolve(SORTIE, `caisse-portrait-${PASSE}-relecture.png`);
  await pageR.screenshot({ path: cheminRelecture, fullPage: false });
  const mesuresRelecture = await pageR.evaluate(() => {
    const els = [...document.querySelectorAll('button, input, [role="button"]')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; }).map(el => (el.tagName === 'INPUT' && el.closest('label')) ? el.closest('label') : el);
    const petites = els.filter(el => { const r = el.getBoundingClientRect(); return Math.min(r.width, r.height) < 43.5; }).map(el => (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40));
    const st = document.querySelector('[role="status"]');
    return { scrollWidth: document.documentElement.scrollWidth, ciblesSous44: petites, encartPx: st ? Math.round(st.getBoundingClientRect().height) : null };
  });
  await pageR.context().close();

  // Contrôle grand écran (deux colonnes, panier à droite) — hors dépôt.
  if (process.env.APERCU_LARGE) {
    const pageL = await monterCaisse(navigateur, { width: 1280, height: 900 }, 1);
    await pageL.screenshot({ path: process.env.APERCU_LARGE, fullPage: false });
    await pageL.context().close();
  }

  let cheminComparaison = null;
  if (MAQUETTE && existsSync(MAQUETTE)) {
    cheminComparaison = resolve(SORTIE, `caisse-portrait-${PASSE}-comparaison.png`);
    const html = resolve(ici, '.comparaison.html');
    // Même échelle des deux côtés : 2 px d'image par px CSS. La maquette est
    // RECADRÉE à l'écran du téléphone (ECRAN_MAQUETTE) et mise à 780 px de
    // large (= 390 px CSS × 2) ; le rendu est le viewport 390 × 844 capturé
    // à 2× (780 × 1688). Aucun des deux n'est redimensionné autrement.
    const k = (VIEWPORT.width * 2) / ECRAN_MAQUETTE.largeur;
    const hMaquette = Math.round(ECRAN_MAQUETTE.hauteur * k);
    writeFileSync(html, `<!doctype html><html lang="fr"><meta charset="utf-8">
<style>
  body { margin: 0; background: #F5EBDD; font: 600 16px/24px Inter, system-ui, sans-serif; color: #332533; }
  .cadre { display: flex; gap: 24px; padding: 24px; align-items: flex-start; }
  figure { margin: 0; display: flex; flex-direction: column; gap: 8px; }
  figcaption { text-align: center; }
  .maquette { width: ${VIEWPORT.width * 2}px; height: ${hMaquette}px; overflow: hidden; position: relative; border-radius: 16px; background: #fff; }
  .maquette img { position: absolute; left: ${-Math.round(ECRAN_MAQUETTE.x * k)}px; top: ${-Math.round(ECRAN_MAQUETTE.y * k)}px; width: ${Math.round(941 * k)}px; display: block; }
  img.rendu { display: block; width: ${VIEWPORT.width * 2}px; height: ${VIEWPORT.height * 2}px; border-radius: 16px; box-shadow: 0 0 0 1px #D8CDC5; }
  .legende { font: 400 14px/20px Inter, system-ui, sans-serif; color: #6E6A63; text-align: center; }
</style>
<div class="cadre" id="cadre">
  <figure><figcaption>Maquette (8.webp), écran du téléphone recadré</figcaption><div class="maquette"><img src="file://${MAQUETTE}" alt=""></div><div class="legende">${ECRAN_MAQUETTE.largeur} × ${ECRAN_MAQUETTE.hauteur} px d'image → ${VIEWPORT.width} × ${Math.round(ECRAN_MAQUETTE.hauteur / ECRAN_MAQUETTE.largeur * VIEWPORT.width)} px CSS</div></figure>
  <figure><figcaption>Rendu réel, premier viewport ${VIEWPORT.width} × ${VIEWPORT.height} (données de démonstration, sans réseau)</figcaption><img class="rendu" src="file://${cheminViewport2x}" alt=""><div class="legende">même échelle : 2 px d'image par px CSS des deux côtés</div></figure>
</div></html>`);
    const p2 = await navigateur.newPage({ viewport: { width: 1660, height: 1800 }, deviceScaleFactor: 1 });
    await p2.goto('file://' + html);
    await p2.waitForLoadState('load');
    await p2.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
    await p2.locator('#cadre').screenshot({ path: cheminComparaison });
    await p2.close();
    unlinkSync(html);
    unlinkSync(cheminViewport2x);
  }

  const rapport = { ...mesures, relecture: { texte: relecture, ...mesuresRelecture }, requetesBloquees: bloquees.length, erreursPage, captures: { viewport: cheminViewport, pleine: cheminPleine, relecture: cheminRelecture, comparaison: cheminComparaison } };
  console.log(JSON.stringify(rapport, null, 2));
  if (mesures.scrollWidth > VIEWPORT.width) { console.error(`✗ débordement horizontal : scrollWidth ${mesures.scrollWidth} > ${VIEWPORT.width}`); code = 1; }
  if (mesures.debordent.length) { console.error(`✗ ${mesures.debordent.length} élément(s) interactif(s) sortent du viewport`); code = 1; }
  if (mesures.ciblesSous44.length) { console.error(`✗ ${mesures.ciblesSous44.length} cible(s) tactile(s) sous ${CIBLE_MIN} px`); code = 1; }
  if (mesuresRelecture.scrollWidth > VIEWPORT.width || mesuresRelecture.ciblesSous44.length) { console.error('✗ état « encaisse » : débordement ou cible < 44 px'); code = 1; }
  if (erreursPage.length) { console.error(`✗ ${erreursPage.length} erreur(s) de page`); code = 1; }
  // LA RÈGLE DU PREMIER ÉCRAN, condition par condition. Chaque rouge NOMME la
  // condition qui tombe et dit par quel chiffre — c'est à ça qu'un banc sert.
  // (Ce qui la précédait : « le haut du panier ET le bas de la barre Total
  //  tiennent dans 844 px ». Une hauteur, pas un sens ; supprimée, pas
  //  desserrée — les quatre conditions ci-dessous sont plus exigeantes sur ce
  //  qui compte : elles vérifient qu'on peut VENDRE et qu'on LIT le total.)
  const PE = mesures.premierEcran;
  for (const [nom, c] of [
    ['1/4 surface de vente compréhensible', PE.surfaceDeVente],
    ['2/4 accès vocal et tactile', PE.acces],
    ['3/4 aperçu du panier', PE.apercuPanier],
    ['4/4 Total visible', PE.total],
  ]) {
    if (c.ok) console.log(`  ✓ premier écran — ${nom}`);
    else { console.error(`✗ PREMIER ÉCRAN, ${nom} : ${c.pourquoi}`); code = 1; }
  }
  if (mesures.cartesVisibles > 4) { console.error(`✗ ${mesures.cartesVisibles} cartes visibles : l'aperçu replié doit n'en montrer qu'une rangée (4)`); code = 1; }
  if (code === 0) console.log(`✓ premier écran : les QUATRE conditions tiennent — vente lisible, voix + écran, panier ${PE.apercuPanier.nArticles} article(s), Total ${PE.total.montantLu} porté par le ${PE.total.porteParLe} ; 390 px sans débordement, ${mesures.interactifs} cibles interactives toutes ≥ ${CIBLE_MIN} px`);
} finally {
  await navigateur.close();
  serveur.kill('SIGTERM');
}
process.exit(code);
