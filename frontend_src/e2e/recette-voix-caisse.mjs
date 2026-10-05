/**
 * RECETTE VOIX DE LA CAISSE — jouée dans un VRAI navigateur, pas à la main.
 *
 * POURQUOI ELLE EXISTE. Patrick, 28/09 : « tu dois faire toi-même une recette
 * pas à pas sinon c'est injouable, je ne fais pas deux étapes et ça manque ».
 * Il avait raison : une recette de dix blocs, rejouée à chaque SHA, sur un
 * téléphone, par une seule personne, n'est pas une méthode.
 *
 * CE QUI TOURNE POUR DE VRAI : le backend, PostgreSQL, le bundle de
 * production, `useVoiceCore`, `MicroVenteCaisse`, `POSCaisse`, la machine
 * d'encaissement, le panier, l'argent. Un vrai Chromium, un vrai micro
 * (périphérique de test de Chrome), un vrai clic sur le vrai bouton.
 *
 * CE QUI NE TOURNE PAS, ET LA RECETTE NE PRÉTEND PAS LE CONTRAIRE :
 * sherpa-onnx, qui n'existe que dans l'APK. `offlineStt` est remplacé par un
 * stub (e2e/stub/) piloté par ce script. Donc TOUT CE QUI EST EN AVAL DE LA
 * TRANSCRIPTION est prouvé ici ; la transcription elle-même ne l'est pas —
 * elle reste à vérifier sur le téléphone, par le 🐞 Rapport de test.
 *
 * DEUX PIÈGES QUE CE SCRIPT A DÉJÀ PAYÉS, et qu'il documente pour ne pas les
 * repayer :
 *   · LE MAUVAIS MICRO. Celui de la barre du bas ouvre l'assistante — une
 *     autre instance du moteur, un autre panier. On vise nommément
 *     « Appuie pour parler », le micro de la caisse.
 *   · LA MAUVAISE ZONE. Lire toute la page rendait « Arachide grillée » et
 *     « 200 F » présents… dans la GRILLE PRODUITS, panier vide. Deux
 *     assertions vertes sur rien. On lit le PANIER, et rien que lui.
 *
 * Lancer : bash frontend_src/e2e/run-recette-voix.sh
 */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL || 'http://localhost:4180';
const EXEC = process.env.CHROMIUM_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT = process.env.RECETTE_OUT || '/tmp/recette-voix';
const MARCHANDE = { phone: '+2250700000009', password: '1234' };

let echecs = 0, num = 0;
const ok = (c, quoi, detail = '') => {
  console.log(`   ${c ? '✓' : '✗'} ${quoi}${detail ? ' — ' + detail : ''}`);
  if (!c) echecs++;
  return c;
};
const etape = (titre) => console.log(`\n[${++num}] ${titre}`);

const browser = await chromium.launch({
  executablePath: EXEC, headless: true,
  // Un vrai micro : sans lui, getUserMedia échoue et l'écran affiche
  // « Micro non accessible » — on testerait le message d'erreur, pas la voix.
  args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});

try {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 1,
    permissions: ['microphone'], locale: 'fr-FR',
  });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('julaba_completed_onboarding', 'true');
      localStorage.setItem('julaba_onboarding_done', 'true');
      const u = localStorage.getItem('julaba_test_user');
      if (u) localStorage.setItem('julaba_auth_user', u);
    } catch { /* stockage indisponible */ }
    // ── MOUCHARD DE PAROLE ────────────────────────────────────────────────
    // On n'écoute pas le son : on note CE QUI EST DEMANDÉ à la synthèse. Sans
    // ça, « la voix a dit zéro franc » reste un récit — et c'est exactement le
    // genre d'anomalie qu'on n'a pas su diagnostiquer pendant trois jours.
    const dit = [];
    Object.defineProperty(window, '__ditVoix', { get: () => dit.slice() });
    try {
      const ss = window.speechSynthesis;
      if (ss) {
        const vrai = ss.speak.bind(ss);
        ss.speak = (u) => { try { dit.push(String((u && u.text) || '')); } catch { /* ignore */ } return vrai(u); };
      }
    } catch { /* pas de synthèse dans ce contexte */ }
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('   [erreur page]', e.message.split('\n')[0]));

  // Connexion par l'API : ce n'est pas l'écran de connexion qu'on teste ici.
  const r = await ctx.request.post(`${BASE}/api/v1/auth/login`, { data: MARCHANDE });
  if (!r.ok()) throw new Error(`connexion -> ${r.status()} ${await r.text()}`);
  const session = await r.json();
  const jeton = session.accessToken || session.access_token || session.token;

  // Le produit HORS LEXIQUE du moteur : c'est tout l'objet de CAT-01.
  const PRODUIT = { nom: 'Arachide grillée', prix: 100, unite: 'tas', stock: 50, categorie: 'Autre' };
  // La VRAIE route de la caisse (caisse-api.creerProduitCaisse), pas une route
  // devinée : un 404 silencieux laisserait la boutique vide et la recette
  // validerait un écran qui n'a rien à montrer. C'est arrivé au 1er passage.
  const cr = await ctx.request.post(`${BASE}/api/v1/caisse/produits`, {
    data: PRODUIT, headers: jeton ? { Authorization: `Bearer ${jeton}` } : {},
  });
  if (!cr.ok()) throw new Error(`création du produit -> ${cr.status()} ${(await cr.text()).slice(0, 200)}`);
  console.log(`   (produit de recette « ${PRODUIT.nom} » à ${PRODUIT.prix} F créé)`);

  await page.goto(`${BASE}/favicon.png`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.evaluate((u) => { try { localStorage.setItem('julaba_test_user', JSON.stringify(u)); } catch { /* ignore */ } }, session.user);

  /** Dit une phrase À LA CAISSE : on pose la transcription, puis on touche le
   *  vrai micro de la caisse. Le reste du chemin est celui de la marchande. */
  async function dire(phrase) {
    await page.evaluate((p) => { window.__transcriptScripte = p; }, phrase);
    await page.locator('[aria-label="Appuie pour parler"]').first().click({ timeout: 15000 });
    // ON N'ATTEND PAS UNE DURÉE, ON ATTEND L'ÉTAT — et le bon état.
    //
    // Deux erreurs de harnais payées ici, dans l'ordre :
    //   1. attendre 8 s en dur. Le périphérique de test de Chrome émet un son
    //      continu, donc le micro tient jusqu'au plafond de 12 s (MIC-01,
    //      comportement VOULU en milieu bruyant) : on mesurait un panier vide.
    //   2. attendre que « Appuie pour terminer » soit DÉTACHÉ. C'est le MÊME
    //      bouton dont le libellé bascule : au moment du clic il porte encore
    //      « Appuie pour parler », donc le sélecteur ne correspond à rien et
    //      l'attente se satisfait en 93 ms — avant l'enregistrement.
    // On attend donc que l'écoute COMMENCE, puis qu'elle FINISSE.
    await page.locator('[aria-label="Appuie pour terminer"]').first()
      .waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    await page.locator('[aria-label="Appuie pour parler"]').first()
      .waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(4500); // transcription + effet métier + rendu
  }
  const texteEcran = () => page.evaluate(() => document.body.innerText);
  const voixDite = () => page.evaluate(() => (window.__ditVoix || []).join(' | '));
  /**
   * LE PANIER, LU À SA SOURCE — pas dans du texte d'écran.
   *
   * Deux extracteurs par innerText ont déjà menti ici : le premier avalait la
   * grille produits (« Arachide grillée » et « 200 F » y figurent, panier
   * vide → deux assertions vertes sur rien), le second rendait une chaîne
   * vide dès que le libellé du bloc changeait après une vente.
   *
   * `cartStorage` (clé `julaba_cart_<utilisateur>`) est la source de vérité du
   * panier, celle-là même que PAN-01 a rendue fidèle. On l'interroge.
   */
  const panier = () => page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith('julaba_cart_')) continue;
      try {
        const brut = JSON.parse(localStorage.getItem(k) || 'null');
        const items = Array.isArray(brut) ? brut : (brut && brut.items) || [];
        return items.map((i) => ({
          nom: i.nom, quantite: Number(i.quantite) || 0,
          total: Number(i.totalExact ?? (Number(i.prix) || 0) * (Number(i.quantite) || 0)) || 0,
        }));
      } catch { /* clé illisible : on continue */ }
    }
    return [];
  });
  const totalPanier = async () => (await panier()).reduce((a, l) => a + l.total, 0);
  const montrePanier = async (etiquette) => {
    const p = await panier();
    console.log(`      ${etiquette} : ${p.length ? p.map((l) => `${l.quantite} × ${l.nom} = ${l.total} F`).join(' · ') : '(vide)'}`);
    return p;
  };

  // ═══════════════════════════════════════════════════════════════════════
  etape('A1 — ouverture de l\'accueil : la voix ne doit pas annoncer zéro franc');
  await page.goto(`${BASE}/marchand/accueil`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(7000);
  {
    const dites = await voixDite();
    const ecran = await texteEcran();
    console.log(`      voix : ${dites || '(rien)'}`);
    ok(!/z[ée]ro franc/i.test(dites), 'la voix n\'annonce pas « zéro franc » au montage');
    ok(!/NaN/.test(ecran), 'et l\'écran n\'affiche aucun NaN');
  }
  await page.screenshot({ path: `${OUT}/01-accueil.png` }).catch(() => {});

  // ═══════════════════════════════════════════════════════════════════════
  etape('CAT-01 — « vends deux arachides grillées » : un produit hors lexique');
  await page.goto(`${BASE}/marchand/caisse`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await dire('vends deux arachides grillées');
  {
    const ecran = await texteEcran();
    const lignes = await montrePanier('panier');
    await page.screenshot({ path: `${OUT}/02-catalogue.png`, fullPage: true }).catch(() => {});
    ok(!/Je n[’']ai pas compris/i.test(ecran), 'PLUS de « Je n\'ai pas compris » sur un produit de son catalogue');
    ok(lignes.length > 0, 'le panier n\'est plus vide — la vente est PARTIE');
    ok(lignes.some((l) => /Arachide/i.test(l.nom || '')), 'c\'est « Arachide grillée », nommée par SON catalogue');
    ok(lignes.some((l) => l.quantite === 2), '« deux » est bien une QUANTITÉ, pas 2 francs');
    const totalArachide = await totalPanier();
    ok(totalArachide === 200, '2 × 100 F = 200 F : le prix vient de son catalogue, rien d\'inventé', `total = ${totalArachide} F`);
    ok(!lignes.some((l) => /Produit vocal/i.test(l.nom || '')), 'et surtout PAS de ligne « Produit vocal » à 2 F');
  }

  // ═══════════════════════════════════════════════════════════════════════
  etape('ENC-01 — « encaisser » : l\'écran ne doit plus dire le contraire du moteur');
  await dire('encaisser');
  {
    const ecran = await texteEcran();
    const lignesEnc = await montrePanier('panier');
    const total = lignesEnc.reduce((a, l) => a + l.total, 0);
    const dites = await voixDite();
    await page.screenshot({ path: `${OUT}/03-encaisser.png`, fullPage: true }).catch(() => {});
    console.log(`      voix : ${dites.slice(-200)}`);
    ok(!/Je n[’']ai pas compris/i.test(ecran), 'le bandeau ne dit PLUS « Je n\'ai pas compris » sur « encaisser »');
    ok(!/Ton panier est vide/i.test(dites), 'la machine voit bien le panier');
    ok(total === 200, 'et le panier porte toujours ses 200 F', `total = ${total} F`);
    ok(/Elle doit/i.test(ecran) || /Elle doit/i.test(dites), 'la relecture du compte apparaît (« Elle doit … »)');
    ok(/Touche les billets/i.test(ecran) || /Touche les billets/i.test(dites), 'et elle dit le geste suivant');
  }

  // ═══════════════════════════════════════════════════════════════════════
  etape('Non-régression — une vente ordinaire du lexique passe toujours');
  await dire('vends trois tomates à 500');
  {
    const lignes = await montrePanier('panier');
    await page.screenshot({ path: `${OUT}/04-vente-lexique.png`, fullPage: true }).catch(() => {});
    ok(lignes.some((l) => /tomate/i.test(l.nom || '')), 'la vente au lexique arrive elle aussi AU PANIER');
    ok(lignes.some((l) => /Arachide/i.test(l.nom || '')), 'et l\'arachide y est toujours : rien n\'a été écrasé');
  }

  if (echecs > 0) {
    // LE JOURNAL, VERSÉ AU COMPTE RENDU. C'est le même que le 🐞 Rapport de
    // test du téléphone : quand la recette tombe, on veut la trace, pas un
    // récit.
    const j = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('julaba_journal_voix') || '[]'); } catch { return []; } });
    console.log(`\n   — journal de voix (${j.length} entrées, 20 dernières) —`);
    for (const e of j.slice(-20)) console.log(`     ${e.ev} ${JSON.stringify(e.d || {}).slice(0, 150)}`);
  }
  // ═══════════════════════════════════════════════════════════════════════
  etape('CAT-02 — elle nomme un produit qu\'elle NE VEND PAS');
  {
    const avant = await totalPanier();
    await dire('vends deux mangues séchées');
    const lignes = await montrePanier('panier');
    await page.screenshot({ path: `${OUT}/05-hors-catalogue.png`, fullPage: true }).catch(() => {});
    ok(!lignes.some((l) => /Produit vocal/i.test(l.nom || '')),
       'AUCUNE ligne « Produit vocal » — c\'est le défaut que Patrick a fait fermer');
    const apres = await totalPanier();
    ok(apres === avant, 'et pas un franc de plus au panier', `${avant} F → ${apres} F`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  etape('Non-régression — l\'article libre vocal continue de passer');
  {
    // CAT-02 a fait ce qu'il doit : Tata DEMANDE le prix du produit qu'elle
    // ne connaît pas, et la saisie guidée s'ouvre par-dessus le micro. Ce
    // n'est pas un défaut, c'est la suite du parcours — on la referme comme
    // la marchande le ferait, en revenant à sa caisse. Le panier survit.
    await page.goto(`${BASE}/marchand/caisse`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    const avant = await totalPanier();
    await dire('vends pour 500');
    const apres = await totalPanier();
    await montrePanier('panier');
    await page.screenshot({ path: `${OUT}/06-article-libre.png`, fullPage: true }).catch(() => {});
    ok(apres === avant + 500,
       'un montant dicté sans produit nommé pose toujours sa ligne', `${avant} F → ${apres} F`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  etape('F4NT-B — « Tomate mille francs » : un produit et un prix, sans quantité');
  {
    // LA PHRASE EXACTE DU RAPPORT TERRAIN F4NT (APK d3cb6ce, 01/10 16h41).
    // Elle était transcrite parfaitement par sherpa et rendait « je n'ai pas
    // bien compris » : `extraire` avait produit ET montant, et les deux portes
    // en aval exigeaient une QUANTITÉ. Ici on le joue dans le bundle de
    // PRODUCTION, à travers le vrai `onAction` — pas en test pur, parce que
    // c'est exactement l'erreur qui a coûté CAT-01.
    const avant = await totalPanier();
    // CINQUIÈME PIÈGE DE HARNAIS, payé le 01/10 et noté ici comme les quatre
    // autres : la première version de cette étape exigeait AUCUNE ligne
    // « Produit vocal » dans le panier. Elle tombait — et le code avait raison.
    // L'étape [6] vient d'en créer une, LÉGITIMEMENT (« vends pour 500 » est un
    // article libre, c'est la contrainte de CAT-02). Ce qu'il faut mesurer n'est
    // pas l'absence d'un état, c'est que CETTE étape n'en AJOUTE pas.
    const vocalAvant = (await panier()).filter((l) => /Produit vocal/i.test(l.nom || '')).length;
    await dire('Tomate mille francs');
    const lignes = await montrePanier('panier');
    await page.screenshot({ path: `${OUT}/07-f4nt-prix-sans-quantite.png`, fullPage: true }).catch(() => {});
    const apres = await totalPanier();
    ok(apres === avant + 1000,
       'la ligne porte le prix DIT, mille francs', `${avant} F → ${apres} F`);
    ok(lignes.some((l) => /tomate/i.test(l.nom || '')),
       'et c\'est bien de la tomate');
    const vocalApres = lignes.filter((l) => /Produit vocal/i.test(l.nom || '')).length;
    ok(vocalApres === vocalAvant,
       'aucun « Produit vocal » AJOUTÉ par cette phrase : CAT-02 tient toujours',
       `${vocalAvant} → ${vocalApres}`);
  }

  console.log(`\n${echecs === 0 ? '✓ RECETTE VOIX : aucun échec' : `✗ RECETTE VOIX : ${echecs} échec(s)`}`);
  console.log(`   captures : ${OUT}/0*.png`);
} catch (e) {
  echecs++;
  console.log('\n✗ RUPTURE DE HARNAIS :', e.message.split('\n')[0]);
} finally {
  await browser.close();
}
process.exit(echecs === 0 ? 0 : 1);
