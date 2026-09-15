// MESURE des ecrans marchande a taille de telephone (390x844).
//
// Le depot a une methode : « yeux sur l'ecran, agent visuel qui MESURE ».
// Ce script l'outille. Il pilote un vrai Chromium sur le vrai bundle, se
// connecte comme une marchande, parcourt les ecrans et RELEVE ce qu'aucune
// lecture de code ne donne : debordement horizontal, contenu inatteignable
// derriere la barre du menu, cibles tactiles sous 44px.
//
// Deux pieges payes en l'ecrivant, encodes ici :
//
//  1. Mesurer SANS defiler ment. Derriere une barre FIXE, tout contenu de bas
//     de page est masque a un instant donne : ce n'est un defaut que s'il y
//     reste une fois la page defilee A FOND. Un premier releve avait ainsi
//     « trouve » un chevauchement inexistant.
//  2. Mesurer sur le serveur de DEV ment aussi. Des composants reserves au
//     dev (ProfileSwitcher, pied de page outils) s'y affichent et passent
//     pour des defauts. On mesure donc le bundle de PRODUCTION.
//
// Prerequis :
//   ./scripts/pg-test-local.sh start
//   npm run build -w backend && node backend/dist/main.js      (port 3010,
//     avec CORS_ORIGIN pointant le serveur statique, base de test)
//   VITE_API_URL=http://127.0.0.1:3010/api/v1 npm run build -w frontend_src
//     ^ OBLIGATOIRE : sans elle, le bundle appelle sa propre origine et la
//       connexion echoue avec « Reponse inattendue » (meme doctrine que
//       l'APK, voir 1958d6a).
//   puis servir frontend/dist avec un repli SPA sur le port 5199.
//
// Un compte marchande de test doit exister (voir docs/RECETTE-TERRAIN-GROUPEE).

const { chromium } = require('/home/user/julaba-app/node_modules/playwright-core');
const S = '/tmp/claude-0/-home-user-julaba-app/2a29731b-1ce1-5944-89dd-fb9cea0e9912/scratchpad/shots';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// Ce qu'on MESURE (pas ce qu'on suppose) sur chaque ecran, a 390x844 :
//  - debordement horizontal : la page glisse lateralement, signe d'un
//    element plus large que l'ecran ;
//  - contenu MASQUE par la barre du bas : un bouton derriere le menu est
//    inatteignable pour la marchande ;
//  - cibles tactiles < 44px : regle d'accessibilite deja appliquee au lot UX.
const MESURE = `(() => {
  const d = document.documentElement;
  const debordement = Math.max(0, d.scrollWidth - d.clientWidth);

  // Barre de navigation fixee en bas (menu Accueil / Acheter / Moi...).
  let barre = null;
  for (const el of document.querySelectorAll('nav, div, footer')) {
    const s = getComputedStyle(el);
    if ((s.position === 'fixed' || s.position === 'sticky')) {
      const r = el.getBoundingClientRect();
      if (r.height > 40 && r.height < 140 && r.bottom > innerHeight - 8 && r.width > innerWidth * 0.7) {
        if (!barre || r.height < barre.getBoundingClientRect().height) barre = el;
      }
    }
  }
  const rb = barre ? barre.getBoundingClientRect() : null;

  const masques = [];
  const petites = [];
  for (const el of document.querySelectorAll('button, a[href], input, select, [role="button"]')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || s.opacity === '0') continue;
    const nom = (el.innerText || el.getAttribute('aria-label') || el.tagName).replace(/\\s+/g, ' ').trim().slice(0, 34);

    if (Math.round(r.width) < 44 || Math.round(r.height) < 44) {
      petites.push({ nom, l: Math.round(r.width), h: Math.round(r.height) });
    }
    // Recouvert par la barre : chevauchement vertical reel, et l'element
    // n'appartient pas a la barre elle-meme.
    if (rb && barre && !barre.contains(el)) {
      const recouvre = Math.min(r.bottom, rb.bottom) - Math.max(r.top, rb.top);
      if (recouvre > 4 && r.top < rb.bottom && r.bottom > rb.top) {
        masques.push({ nom, recouvrement: Math.round(recouvre) });
      }
    }
  }
  return {
    debordement,
    barre: rb ? { haut: Math.round(rb.top), hauteur: Math.round(rb.height) } : null,
    masques: masques.slice(0, 8),
    petites: petites.slice(0, 10),
    hauteurPage: Math.round(d.scrollHeight),
  };
})()`;

(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const jsErr = [];
  p.on('pageerror', e => jsErr.push(e.message.slice(0, 120)));

  const taper = async (chiffres) => {
    for (const c of chiffres) {
      await p.locator('button:visible').filter({ hasText: new RegExp(`^${c}$`) }).first().click().catch(() => {});
      await p.waitForTimeout(160);
    }
  };

  await p.goto('http://127.0.0.1:5199/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1000);
  for (let i = 0; i < 12; i++) {
    if (await p.locator('button:visible').filter({ hasText: /^0$/ }).count()) break;
    const t = p.locator('button', { hasText: /Commencer|Suivant|Continuer/i }).first();
    if (await t.count()) { await t.click().catch(()=>{}); await p.waitForTimeout(700); continue; }
    const v = p.locator('button:visible'); const n = await v.count();
    if (!n) break;
    await v.nth(n - 1).click().catch(()=>{}); await p.waitForTimeout(700);
  }
  await taper('0700001234');
  await p.locator('button', { hasText: /C.est mon num/i }).first().click().catch(()=>{});
  await p.waitForTimeout(2200);
  await taper('1234');
  await p.waitForTimeout(1500);
  // Selon l'etat du clavier, la validation peut ne pas etre automatique :
  // on presse le cadenas s'il est encore la.
  const cadenas = p.locator('button', { hasText: /^\s*\u{1F512}\s*$/u }).first();
  if (await cadenas.count()) { await cadenas.click().catch(()=>{}); }
  await p.waitForTimeout(3500);

  // Ecarter la proposition de reconnaissance pour atteindre l'accueil reel.
  const non = p.locator('button', { hasText: /^Non$/ }).first();
  if (await non.count()) { await non.click().catch(()=>{}); await p.waitForTimeout(1200); }

  const ecrans = [
    ['accueil', null],
    ['vendre', /^Vendre$/],
    ['stock', /Mon stock/],
    ['depenses', /Mes d.penses/],
    ['ventes', /Mes ventes/],
    ['argent', /Mon argent/],
  ];

  for (const [nom, motif] of ecrans) {
    if (motif) {
      await p.goto('http://127.0.0.1:5199/marchand', { waitUntil: 'networkidle' }).catch(()=>{});
      await p.waitForTimeout(1200);
      const cible = p.locator('button', { hasText: motif }).first();
      if (await cible.count() === 0) { console.log(`\n[${nom}] introuvable depuis l'accueil`); continue; }
      await cible.click().catch(()=>{});
      await p.waitForTimeout(2500);
    }
    // DEFILER A FOND d'abord : derriere une barre FIXE, tout contenu est
    // masque a un instant donne. Le defaut n'existe que si l'element y reste
    // une fois la page defilee au maximum - la, il est vraiment inatteignable.
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await p.waitForTimeout(700);
    const m = await p.evaluate(MESURE);
    await p.screenshot({ path: `${S}/m-${nom}.png`, fullPage: false });
    console.log(`\n[${nom}] ${p.url()}`);
    console.log(`  debordement horizontal : ${m.debordement}px   hauteur page : ${m.hauteurPage}px`);
    console.log(`  barre du bas           : ${m.barre ? `haut=${m.barre.haut} hauteur=${m.barre.hauteur}` : 'aucune'}`);
    if (m.masques.length) console.log(`  MASQUES PAR LA BARRE   : ${JSON.stringify(m.masques)}`);
    if (m.petites.length) console.log(`  CIBLES < 44px          : ${JSON.stringify(m.petites)}`);
  }

  if (jsErr.length) console.log('\nERREURS JS :', JSON.stringify([...new Set(jsErr)].slice(0, 5)));
  await b.close();
})().catch(e => { console.error('ECHEC:', e.message); process.exit(1); });
