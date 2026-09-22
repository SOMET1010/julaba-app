/**
 * BANC DE PARCOURS — on JOUE la vente, on ne la photographie pas.
 * Lancer depuis frontend_src :  node apercu-caisse/parcours.mjs
 *   PW_CHROMIUM=/chemin/chrome  (défaut : /opt/pw-browsers/chromium-1194/chrome-linux/chrome)
 *
 * POURQUOI CE FICHIER EXISTE (21/09/2026). « Fais des tests, rejoue workflow
 * par workflow et tu vas t'autocorriger » (Patrick). `capture.mjs` montre
 * l'écran ; il ne dit pas ce qui s'est PASSÉ. Or le défaut de terrain était
 * précisément invisible sur une capture : l'écran affichait « J'ai compris :
 * Cinq tomates » et il ne se passait rien — ni ligne au panier, ni question,
 * ni un mot. Ce banc observe donc les trois choses qui comptent :
 *   1. CE QUI ENTRE AU PANIER (window.__panier) — la seule preuve sur l'argent ;
 *   2. CE QUI EST DIT, avec sa CLÉ de catalogue et ses variables
 *      (window.__journalVoix, alimenté par le vrai rendu vocal) ;
 *   3. ce qui s'affiche — en dernier, et jamais tout seul.
 *
 * CE QUI EST RÉEL ICI — et la liste a CHANGÉ le 22/09/2026 : POSCaisse,
 * MicroVenteCaisse, **useVoiceCore** (le moteur vocal entier), intentLocal,
 * vendreVocalUnifie, le catalogue i18n, audioManager, la machine
 * d'encaissement.
 * CE QUI EST SIMULÉ : la TRANSCRIPTION (sherpa-onnx n'existe pas hors de
 * l'APK — voir stubs/offlineStt.ts), la sortie audio (aucun haut-parleur en
 * headless : les LECTEURS d'audioManager sont remplacés, pas les décisions qui
 * y mènent) et le serveur (contextes stubés — aucune écriture réelle).
 *
 * POURQUOI CE BANC A MENTI (22/09/2026, deuxième passage de Patrick sur le
 * même défaut). Il déclarait P1 VERT avec 28 assertions pendant que le même
 * parcours était muet sur le téléphone. Trois bouchons rendaient ce que
 * l'application ne rend pas :
 *
 *   1. LE MOTEUR VOCAL ÉTAIT BOUCHONNÉ EN ENTIER. `stubs/useVoiceCore.ts`
 *      réimplémentait la dictée en trois lignes — poser le transcript, et
 *      appeler `onAction` si `intentLocal` reconnaissait quelque chose. Tout
 *      ce que le VRAI moteur fait autour (machine d'états, branche « entendu
 *      mais pas compris », file hors ligne, verrou parole/écoute) n'était donc
 *      jamais joué. Un banc qui remplace le moteur ne prouve rien du moteur.
 *   2. « DIT » VOULAIT DIRE « APPELÉ », PAS « ENTENDU ». Le stub d'AppContext
 *      poussait le texte dans un tableau sans passer par `audioManager` — donc
 *      sans le mute, sans l'anti-répétition, et surtout sans la règle « la plus
 *      récente gagne » qui COUPE la phrase en cours. Une phrase supplantée
 *      10 ms après son début était comptée comme prononcée.
 *   3. LE CATALOGUE MAÎTRE ÉTAIT TOUJOURS VIDE. Le banc coupe le réseau, et
 *      son cache local n'était jamais semé : la branche « une référence Odoo
 *      porte le même nom » de `ouvrirPrixManquant` — celle qu'un vrai
 *      téléphone emprunte dès la première synchro — n'a jamais été jouée.
 *
 * Les trois sont corrigés. `__journalDits` reste ce qui a été DEMANDÉ ;
 * `__journalRendu` dit ce qui a commencé à être JOUÉ, et avec quelle issue
 * (`ended` = entendu jusqu'au bout, `cancelled` = coupé par une voix plus
 * récente). C'est sur le second qu'on juge le silence.
 *
 * Ce banc exige Chromium : il reste un OUTIL À PART, hors de `npm run verify`
 * (qui doit tourner sans navigateur). La garde sans navigateur du même défaut
 * est `src/app/components/marchand/venteVocaleSansPrix.test.mts`.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = resolve(ici, '..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}/apercu-caisse/`;
const VIEWPORT = { width: 390, height: 844 };
const SORTIE = resolve(racine, '..', 'docs', 'parcours', 'captures');
const EXECUTABLE = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

mkdirSync(SORTIE, { recursive: true });

let echecs = 0;
const ok = (cond, quoi, obtenu) => {
  if (cond) console.log('  ✅', quoi);
  else { console.log('  ❌', quoi, obtenu === undefined ? '' : `— obtenu ${JSON.stringify(obtenu)}`); echecs++; }
};

const viteBin = resolve(dirname(require.resolve('vite/package.json')), 'bin/vite.js');
const serveur = spawn(process.execPath, [viteBin, '--config', 'apercu-caisse/vite.config.ts', '--logLevel', 'warn'], { cwd: racine, stdio: ['ignore', 'pipe', 'pipe'] });
serveur.stderr.on('data', d => process.stderr.write(`[vite] ${d}`));
const attendreServeur = async () => {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(BASE); if (r.ok) return; } catch { /* pas encore */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Le serveur Vite ne répond pas sur ' + BASE);
};

const erreursPage = [];

/** Ouvre la caisse dans l'état demandé (catalogue vide ? voix allumée ?). */
async function ouvrir(navigateur, requete) {
  const contexte = await navigateur.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR', permissions: ['microphone'] });
  await contexte.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith(`http://127.0.0.1:${PORT}/`) || u.startsWith('data:')) return route.continue();
    return route.abort(); // rien ne sort de la machine : ce qui manque manque pour de vrai
  });
  const page = await contexte.newPage();
  page.on('pageerror', e => erreursPage.push(String(e)));
  await page.goto(BASE + requete, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /vendre \?$/ }).first().waitFor({ timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.__viderJournalVoix?.());
  return page;
}

/** APPUIE SUR LE MICRO, comme un doigt : le vrai moteur enregistre, demande la
 *  transcription (seul maillon bouchonné) et décide de tout le reste lui-même. */
const dicter = (page, phrase) => page.evaluate(t => window.__apercuVoix.dicter(t), phrase);
const panier = (page) => page.evaluate(() => (window.__panier || []).map(i => ({ nom: i.nom, quantite: i.quantite, prix: i.prix, total: i.totalExact ?? i.prix * i.quantite })));
const voix = (page) => page.evaluate(() => window.__journalVoix || []);
const dits = (page) => page.evaluate(() => window.__journalDits || []);
/** Ce qui a VRAIMENT commencé à être joué (lecteurs d'audioManager), avec son issue. */
const rendu = (page) => page.evaluate(() => window.__journalRendu || []);
/** Ce qui a été ENTENDU jusqu'au bout — une phrase coupée n'a jamais existé pour elle. */
const entendu = async (page) => (await rendu(page)).filter(m => m.issue === 'ended').map(m => m.texte || m.url);
const photo = (page, nom) => page.screenshot({ path: resolve(SORTIE, `parcours-${nom}.png`), fullPage: false });

// Le moteur vocal est le VRAI : il ouvre un micro et enregistre pour de bon.
// Chromium fournit un périphérique factice ; seule la TRANSCRIPTION est bouchonnée.
const navigateur = await chromium.launch({ headless: true, executablePath: EXECUTABLE, args: ['--no-sandbox', '--font-render-hinting=none', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-capture', '--autoplay-policy=no-user-gesture-required'] });
try {
  await attendreServeur();

  // ── P0 — LE PARCOURS DE PATRICK, TEL QU'IL L'A VÉCU ────────────────────
  // 22/09/2026, deuxième signalement du MÊME défaut, sur un APK qui portait
  // déjà le correctif de la veille : « Cet écran me dérange, il est
  // visuellement ET sonorement muet. »
  //
  // Son état exact, et c'est lui que l'ancien banc ne rejouait pas : SON
  // catalogue est vide (« Produits : Aucun produit ») mais le CATALOGUE MAÎTRE
  // de son téléphone, lui, est rempli depuis la première synchro. La caisse
  // emprunte alors une AUTRE branche d'`ouvrirPrixManquant` — celle qui
  // reconnaît la référence Odoo et propose de l'adopter. Le banc coupait le
  // réseau ET ne semait pas ce cache : cette branche n'avait jamais tourné.
  // Voix COUPÉE : le cas le plus dur, celui où aucune phrase ne peut rattraper
  // un écran muet.
  console.log("\n[P0] Le cas de Patrick — son catalogue VIDE, catalogue maître GARNI, « trois tomates », voix coupée");
  {
    const page = await ouvrir(navigateur, '?catalogue=vide&maitre=garni');
    await dicter(page, 'trois tomates');
    await page.waitForTimeout(400);
    ok(await page.getByText("J'ai compris : trois tomates").isVisible(), "l'écran affiche « J'ai compris »");
    // LA RÈGLE : ce bandeau ne peut pas être le dernier mot. Soit la vente
    // continue, soit l'application dit qu'elle ne peut pas — jamais le silence.
    const feuille = page.getByRole('dialog', { name: 'Autre article' });
    ok(await feuille.isVisible(), "…et quelque chose S'OUVRE derrière : « J'ai compris » n'est pas un cul-de-sac");
    const rappel = await page.locator('[data-test="rappel-dictee"]').textContent();
    ok(/tomate/i.test(rappel || '') && /\b3\b/.test(rappel || ''), 'sa phrase lui est rappelée, produit et quantité', rappel);
    ok((await panier(page)).length === 0, "et aucune ligne n'entre au panier sans prix");
    // La référence du catalogue maître est reconnue : elle n'aura plus jamais à
    // redonner ce prix. C'est exactement la branche que le banc ne jouait pas.
    ok(/Tomate/.test(await feuille.textContent()), 'la référence du catalogue maître est proposée, pas une ligne anonyme');
    ok((await entendu(page)).length === 0, "profil « je lis » : rien n'est prononcé — et ce n'est plus un silence, c'est un écran", await entendu(page));
    await photo(page, 'p0-cas-patrick');
    await page.close();
  }

  // ── P0b — LE MÊME, VOIX ALLUMÉE : LA QUESTION EST ENTENDUE ─────────────
  // « Dite » ne suffit plus : audioManager coupe la lecture en cours dès qu'une
  // voix plus récente arrive. On juge donc sur ce qui est allé jusqu'au bout.
  console.log('\n[P0b] Le même, voix allumée — la question du prix est ENTENDUE, pas seulement demandée');
  {
    const page = await ouvrir(navigateur, '?catalogue=vide&maitre=garni&voix=on');
    await dicter(page, 'trois tomates');
    await page.waitForTimeout(400);
    const jv = await voix(page);
    ok(jv.some(m => m.id === 'TATA_QUEL_PRIX'), 'la question passe par la clé TATA_QUEL_PRIX, jamais en dur', jv.map(m => m.id));
    const attendu = await page.evaluate(() => window.__t('TATA_QUEL_PRIX', { produit: 'Tomate' }));
    ok((await entendu(page)).includes(attendu),
      "et cette phrase-là a été jouée JUSQU'AU BOUT — une phrase coupée n'a jamais existé pour elle",
      { attendu, rendu: await rendu(page) });
    ok((await panier(page)).length === 0, "toujours aucune ligne tant que le prix n'est pas donné");
    await page.close();
  }

  // ── P1 — CATALOGUE VIDE, PRODUIT INCONNU, DICTÉ ────────────────────────
  // Le trou principal : sur le téléphone de Patrick, « J'ai compris : Cinq
  // tomates » puis plus rien. Voix COUPÉE (profil « je lis ») : c'est le cas
  // le plus dur, celui où aucune phrase ne peut rattraper un écran muet.
  console.log('\n[P1] Catalogue vide — « cinq tomates » dicté (voix coupée)');
  {
    const page = await ouvrir(navigateur, '?catalogue=vide');
    ok((await panier(page)).length === 0, 'au départ, le panier est vide');
    await dicter(page, 'cinq tomates');
    await page.waitForTimeout(400);

    ok(await page.getByText("J'ai compris : cinq tomates").isVisible(), "l'écran affiche « J'ai compris »");
    const ap = await panier(page);
    ok(ap.length === 0, 'aucune ligne n\'entre au panier sans prix', ap);
    const feuille = page.getByRole('dialog', { name: 'Autre article' });
    ok(await feuille.isVisible(), "la saisie s'ouvre d'elle-même après « J'ai compris » (plus de silence)");
    const rappel = await page.locator('[data-test="rappel-dictee"]').textContent();
    ok(/tomate/i.test(rappel || ''), 'elle y retrouve le produit dicté, sans le retaper', rappel);
    ok(/\b5\b/.test(rappel || ''), 'et la quantité dictée', rappel);
    // Profil « je lis » : Tata se tait, et c'est normal. Ce qui ne l'est plus,
    // c'est que l'écran se taise AUSSI — c'était tout le défaut.
    ok((await dits(page)).length === 0, 'voix coupée : aucune phrase n\'est prononcée', await dits(page));
    await photo(page, 'p1-prix-demande');

    // Elle donne son prix : 200 F l'unité.
    await page.getByPlaceholder('0').fill('200');
    await page.waitForTimeout(150);
    const rappel2 = await page.locator('[data-test="rappel-dictee"]').textContent();
    ok(/1\s?000/.test(rappel2 || ''), 'le total se calcule sous ses yeux (200 × 5), rien n\'est inventé', rappel2);
    await page.getByRole('button', { name: /^Ajouter$/ }).click();
    await page.waitForTimeout(400);
    const ap2 = await panier(page);
    ok(ap2.length === 1, 'la ligne entre au panier une fois le prix donné', ap2);
    ok(ap2[0]?.quantite === 5, 'avec la quantité dictée', ap2[0]);
    ok(ap2[0]?.total === 1000, 'et le total de son prix, pas un autre', ap2[0]);
    ok(/tomate/i.test(ap2[0]?.nom || ''), 'et le nom dicté — jamais « Autre article »', ap2[0]);
    await photo(page, 'p1-ligne-au-panier');
    await page.close();
  }

  // ── P1b — LE MÊME PARCOURS, VOIX ALLUMÉE ───────────────────────────────
  // Ce qui est DIT, et par quelle clé : une capture ne le prouve pas.
  console.log('\n[P1b] Catalogue vide, voix allumée — la question du prix est DITE');
  {
    const page = await ouvrir(navigateur, '?catalogue=vide&voix=on');
    await dicter(page, 'cinq tomates');
    await page.waitForTimeout(400);
    const jv = await voix(page);
    const quelPrix = jv.find(m => m.id === 'TATA_QUEL_PRIX');
    ok(!!quelPrix, 'la question du prix passe par la clé TATA_QUEL_PRIX', jv.map(m => m.id));
    ok(quelPrix?.variables?.produit === 'tomate', 'avec le produit dicté en variable', quelPrix?.variables);
    const attendu = await page.evaluate(() => window.__t('TATA_QUEL_PRIX', { produit: 'tomate' }));
    ok((await entendu(page)).includes(attendu), 'et c\'est bien cette phrase-là qui a été JOUÉE jusqu\'au bout', { attendu, rendu: await rendu(page) });
    ok((await panier(page)).length === 0, 'toujours aucune ligne tant que le prix n\'est pas donné');
    await page.close();
  }

  // ── P2 — PRODUIT CONNU AU CATALOGUE, DICTÉ ─────────────────────────────
  console.log('\n[P2] Catalogue garni — « cinq tomates » dicté (voix allumée)');
  {
    const page = await ouvrir(navigateur, '?panier=vide&voix=on');
    await dicter(page, 'cinq tomates');
    await page.waitForTimeout(400);
    const ap = await panier(page);
    ok(ap.length === 1, 'la ligne entre directement au panier', ap);
    ok(ap[0]?.quantite === 5, 'la quantité dictée', ap[0]);
    ok(ap[0]?.total === 2500, 'au prix du catalogue (500 × 5), pas au prix d\'un autre', ap[0]);
    const parle = (await dits(page)).join(' | ');
    ok(/tomate/i.test(parle) && /2\s?500/.test(parle), 'Tata redit ce qu\'elle a compris, quantité et total', parle);
    ok(!(await page.getByRole('dialog', { name: 'Autre article' }).isVisible()), 'aucun écran ne s\'ouvre : il n\'y a rien à demander');
    await photo(page, 'p2-produit-connu');
    await page.close();
  }

  // ── P3 — « + AUTRE ARTICLE » AU DOIGT ──────────────────────────────────
  console.log('\n[P3] « + Autre article » ouvert au doigt');
  {
    const page = await ouvrir(navigateur, '?panier=vide');
    await page.getByRole('button', { name: /Autre article/ }).first().click();
    await page.waitForTimeout(300);
    ok(await page.getByRole('dialog', { name: 'Autre article' }).isVisible(), 'la feuille s\'ouvre');
    ok(await page.locator('[data-test="rappel-dictee"]').count() === 0, 'aucun rappel de dictée : rien n\'a été dit, on n\'invente rien');
    await page.getByPlaceholder('0').fill('700');
    await page.getByRole('button', { name: /^Ajouter$/ }).click();
    await page.waitForTimeout(300);
    const ap = await panier(page);
    ok(ap.length === 1 && ap[0].quantite === 1 && ap[0].total === 700, 'le geste tactile n\'a pas bougé : 1 ligne, 1 unité, le montant tapé', ap);
    await photo(page, 'p3-montant-libre');
    await page.close();
  }

  // ── P4 — PANIER → ENCAISSEMENT ─────────────────────────────────────────
  console.log('\n[P4] Panier, Total, relecture du compte');
  {
    const page = await ouvrir(navigateur, '?voix=on');
    // Règle du premier écran : LE MONTANT TOTAL du panier est lisible sans
    // défiler (peu importe quel bloc le porte — même règle que capture.mjs).
    const totalVisible = await page.evaluate(() => {
      const total = (window.__panier || []).reduce((s, i) => s + (i.totalExact ?? i.prix * i.quantite), 0);
      const texte = total.toLocaleString('fr-FR');
      return [...document.querySelectorAll('*')]
        .filter(e => e.children.length === 0 && (e.textContent || '').includes(texte))
        .some(e => { const r = e.getBoundingClientRect(); return r.height > 0 && r.top >= 0 && r.bottom <= 844; });
    });
    ok(totalVisible, 'le montant total du panier se voit sans défiler');
    await page.getByRole('button', { name: /billet de 5.000 francs/ }).first().click();
    await page.waitForTimeout(300);
    await dicter(page, 'encaisse');
    await page.waitForTimeout(800);
    // La relecture vient de la MACHINE d'encaissement : son texte est déjà
    // résolu (clés du catalogue), dit ET affiché tel quel — on l'observe donc
    // sur ce qui part à la voix, pas sur le journal des clés.
    const parle = (await dits(page)).join(' | ');
    ok(/valide\s*\?/i.test(parle), 'Tata relit le compte et demande « Je valide ? » avant tout paiement', parle);
    ok(/2\s?900|5\s?000|2\s?100/.test(parle), 'en redisant les chiffres du compte', parle);
    const ap = await panier(page);
    ok(ap.length > 0, 'le panier est intact : « encaisse » n\'a rien écrit tout seul', ap.length);
    await photo(page, 'p4-relecture');
    await page.close();
  }

  // ── P5 — LE PRIX DICTÉ À L'UNITÉ ───────────────────────────────────────
  // « C'est 500 le tas » est la façon normale de parler au marché. La caisse
  // lisait ce 500 comme le total de la vente : trois tas entraient au panier
  // pour 500 F — le TIERS — sans un mot, sans un écran. C'est le geste le
  // plus banal du métier, et c'était de l'argent perdu en silence.
  console.log('\n[P5] Prix dicté à l\'unité — « trois tas de tomates à 500 » (catalogue 500 le tas)');
  {
    const page = await ouvrir(navigateur, '?panier=vide&voix=on');
    await dicter(page, 'trois tas de tomates à 500');
    await page.waitForTimeout(400);
    const ap = await panier(page);
    ok(ap.length === 1, 'une ligne entre au panier', ap);
    ok(ap[0]?.quantite === 3, 'les trois tas dictés', ap[0]);
    ok(ap[0]?.total === 1500, 'et la vente vaut 1 500 F — pas 500, son tiers', ap[0]);
    ok(ap[0]?.prix === 500, 'au prix qu\'elle a annoncé : 500 le tas', ap[0]);
    // Ce qu'elle ENTEND doit porter le même chiffre que ce qu'elle encaissera :
    // c'est le seul moyen, pour qui ne lit pas, de détecter un malentendu.
    const parle = (await dits(page)).join(' | ');
    ok(/1\s?500/.test(parle), 'Tata redit le montant réel de la vente (1 500)', parle);
    ok(!/\bpour 500 francs\b/.test(parle), 'et jamais 500 — la voix ne contredit pas le panier', parle);
    await photo(page, 'p5-prix-unitaire');
    await page.close();
  }

  // ── P5b — LE MÊME MONTANT, ANNONCÉ SUR LE LOT ──────────────────────────
  // « Pour » ne veut pas dire « à ». Le correctif ne doit pas basculer dans
  // l'excès inverse : trois tas POUR 500, c'est 500, pas 1 500.
  console.log('\n[P5b] « trois tas de tomates pour 500 » — « pour » désigne le lot');
  {
    const page = await ouvrir(navigateur, '?panier=vide&voix=on');
    await dicter(page, 'trois tas de tomates pour 500');
    await page.waitForTimeout(400);
    const ap = await panier(page);
    ok(ap.length === 1 && ap[0]?.total === 500, 'la vente vaut 500 F — le prix du lot', ap);
    ok(ap[0]?.quantite === 3, 'sur les trois tas', ap[0]);
    await page.close();
  }

  // ── P5c — CE QUE RIEN NE TRANCHE NE S'ÉCRIT PAS ────────────────────────
  // Le cœur de la décision de Patrick : ni préposition, ni prix au catalogue,
  // ni quantité 1. 500 peut valoir 500 ou 1 000 — on ne devine pas, on
  // demande, et AUCUN franc n'entre au panier avant la réponse.
  console.log('\n[P5c] Montant réellement ambigu — aucune écriture avant clarification');
  {
    const page = await ouvrir(navigateur, '?catalogue=vide&voix=on');
    await dicter(page, 'deux tas de gombo 500');
    await page.waitForTimeout(400);
    const ap = await panier(page);
    ok(ap.length === 0, 'AUCUNE ligne n\'entre au panier', ap);
    const jv = await voix(page);
    const question = jv.find(m => m.id === 'TATA_AMBIGUITE');
    ok(!!question, 'la question passe par la clé TATA_AMBIGUITE, jamais en dur', jv.map(m => m.id));
    ok(String(question?.variables?.montant) === '500', 'on lui relit SON chiffre', question?.variables);
    ok(String(question?.variables?.quantite) === '2', 'et SA quantité', question?.variables);
    const attendu = await page.evaluate(() => window.__t('TATA_AMBIGUITE', { montant: 500, quantite: '2' }));
    ok((await dits(page)).includes(attendu), 'et c\'est bien cette phrase-là qui part à la voix', { attendu, dits: await dits(page) });
    // L'écran s'ouvre aussi : elle le voit même si elle a coupé la voix.
    ok(await page.getByRole('dialog', { name: 'Autre article' }).isVisible(), 'l\'écran de clarification s\'ouvre, pré-rempli');
    await photo(page, 'p5c-ambiguite');
    await page.close();
  }

  console.log('');
  if (erreursPage.length) { console.log('  ❌ erreurs de page :', erreursPage.slice(0, 3)); echecs++; }
  console.log(echecs === 0 ? '✅ Tous les parcours vont au bout\n' : `❌ ${echecs} échec(s)\n`);
} finally {
  await navigateur.close();
  serveur.kill();
}
process.exit(echecs === 0 ? 0 : 1);
