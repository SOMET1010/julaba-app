/**
 * ══════════════════════════════════════════════════════════════════════════
 * RECONNAISSANCE — aller voir ce qu'il y a derrière chaque porte, une fois.
 * ══════════════════════════════════════════════════════════════════════════
 *
 *   cd frontend_src && node apercu-caisse/banc-terrain/reconnaitre.mjs
 *
 * POURQUOI. Le banc terrain exige, pour chaque écran, une PREUVE : un texte que
 * la marchande voit vraiment, et qu'il attend au lieu d'attendre un délai. Cette
 * exigence est bonne — mais elle interdit d'ajouter 26 écrans d'un coup, parce
 * qu'il faudrait INVENTER 26 textes. Ce script ne juge rien : il ouvre chaque
 * route du parcours marchande, laisse l'écran se poser, et RELÈVE ce qui s'y
 * trouve — titre, premiers mots, erreurs, fichier monté. La sortie se recopie
 * dans la table PARCOURS du banc.
 *
 * C'est une MESURE, pas une génération : on lit ce que l'application affiche,
 * on n'écrit pas ce qu'on aimerait qu'elle affiche.
 *
 * Mêmes conditions que le banc : catalogue vide, aucun réseau, 390 × 844,
 * NODE_ENV=production (donc aucun outil de développement à l'écran).
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ici = dirname(fileURLToPath(import.meta.url));
const racine = resolve(ici, '..', '..');            // frontend_src
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const PORT = 5198;                                   // ≠ 5197 : les deux bancs cohabitent
const ORIGINE = `http://127.0.0.1:${PORT}`;
const VIEWPORT = { width: 390, height: 844 };
const EXECUTABLE = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SORTIE = resolve(racine, '..', 'docs', 'parcours', 'captures', 'reconnaissance');

const MARCHANDE = {
  id: 'banc-terrain-marchande', role: 'marchand', firstName: 'Awa', lastName: 'Koné',
  phone: '0700000000', genre: 'femme', validated: true, estMembreCooperative: false,
};
const SEMENCES = {
  julaba_seen_splash: 'true',
  julaba_completed_onboarding: 'true',
  julaba_auth_user: JSON.stringify(MARCHANDE),
};

/** Les 28 portes de la marchande, telles que src/app/routes.tsx les déclare. */
const PORTES = [
  ['/marchand',                     'components/marchand/MarchandHome.tsx'],
  ['/marchand/caisse',              'components/marchand/POSCaisse.tsx'],
  ['/marchand/cahier',              'components/marchand/MarchandDepenses.tsx'],
  ['/marchand/depense',             'components/marchand/DepenseForm.tsx'],
  ['/marchand/stock',               'components/marchand/GestionStock.tsx'],
  ['/marchand/marche',              'components/marchand/MarcheVirtuel.tsx'],
  ['/marchand/recoltes-prevues',    'components/marchand/RecoltesPrevues.tsx'],
  ['/marchand/profil',              'components/marchand/MarchandProfil.tsx'],
  ['/marchand/ventes-passees',      'components/marchand/VentesPassees.tsx'],
  ['/marchand/resume-caisse',       'components/marchand/ResumeCaisse.tsx'],
  ['/marchand/commandes',           'components/marchand/MesCommandes.tsx'],
  ['/marchand/alertes',             'components/marchand/MarchandAlertes.tsx'],
  ['/marchand/parametres',          'components/marchand/Parametres.tsx'],
  ['/marchand/cooperative',         'components/marchand/MaCooperative.tsx'],
  ['/marchand/cooperative/besoin',  'components/marchand/BesoinMarchand.tsx'],
  ['/marchand/tontines',            'components/marchand/Tontines.tsx'],
  ['/marchand/tontines/1',          'components/marchand/TontineDetail.tsx'],
  ['/marchand/protection-sociale',  'components/marchand/ProtectionSociale.tsx'],
  ['/marchand/fidelite',            'components/marchand/Fidelite.tsx'],
  ['/marchand/academy',             'components/academy/UniversalAcademy.tsx'],
  ['/marchand/keiwa',               'components/wallet/WalletPage.tsx'],
  ['/marchand/keiwa/transfert',     'components/wallet/TransfertPage.tsx'],
  ['/marchand/keiwa/paiements',     'components/wallet/PaiementsPage.tsx'],
  ['/marchand/keiwa/banque',        'components/wallet/BanquePage.tsx'],
  ['/marchand/keiwa/carte',         'components/wallet/CartePage.tsx'],
  ['/marchand/keiwa/historique',    'components/wallet/HistoriquePage.tsx'],
  ['/marchand/support',             'components/shared/SupportPage.tsx'],
];

/** Ce qu'on relève : ce qu'une personne voit en arrivant, rien de plus. */
const RELEVE = `() => {
  const root = document.getElementById('root');
  const texte = (root ? root.innerText || '' : '').replace(/[ \\t]+/g, ' ').trim();
  const titres = [...document.querySelectorAll('h1,h2,h3,[role="heading"]')]
    .filter(el => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1; })
    .map(el => (el.innerText || '').replace(/\\s+/g, ' ').trim())
    .filter(Boolean);
  const controles = document.querySelectorAll('button, a[href], [role="button"], input, select, textarea').length;
  const jetons = [...document.querySelectorAll('*')].length;
  return {
    url: location.pathname,
    titres: titres.slice(0, 6),
    lignes: texte.split('\\n').map(s => s.trim()).filter(Boolean).slice(0, 12),
    longueur: texte.length,
    controles,
    noeuds: jetons,
    vide: texte.length < 20,
  };
}`;

mkdirSync(SORTIE, { recursive: true });
const viteBin = resolve(dirname(require.resolve('vite/package.json')), 'bin/vite.js');
const serveur = spawn(
  process.execPath,
  [viteBin, '--config', 'apercu-caisse/banc-terrain/vite.config.ts', '--port', String(PORT),
   '--strictPort', '--logLevel', 'warn'],
  { cwd: racine, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'production' } },
);
serveur.stderr.on('data', d => process.stderr.write(`[vite] ${d}`));

async function attendreServeur() {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(ORIGINE + '/'); if (r.ok) return; } catch { /* pas encore */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Le serveur Vite ne répond pas sur ' + ORIGINE);
}

const releves = [];
const navigateur = await chromium.launch({
  headless: true, executablePath: EXECUTABLE,
  args: ['--no-sandbox', '--font-render-hinting=none', '--autoplay-policy=no-user-gesture-required'],
});

try {
  await attendreServeur();
  for (const [chemin, source] of PORTES) {
    const contexte = await navigateur.newContext({
      viewport: VIEWPORT, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR',
    });
    await contexte.route('**/*', route => {
      const u = route.request().url();
      if (u.startsWith(ORIGINE) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
      return route.abort();
    });
    await contexte.addInitScript(s => {
      try { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } catch { /* ignore */ }
    }, SEMENCES);

    const erreurs = [];
    const page = await contexte.newPage();
    page.on('pageerror', e => erreurs.push(String(e && e.message ? e.message : e).slice(0, 200)));
    page.on('console', m => { if (m.type() === 'error') erreurs.push('[console] ' + m.text().slice(0, 160)); });

    let releve = null, souci = '';
    try {
      await page.goto(ORIGINE + chemin, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // Pas de preuve à attendre — c'est ce qu'on cherche. On laisse l'écran se
      // poser : le module paresseux arrive, puis les animations d'entrée.
      await page.waitForFunction(
        () => { const r = document.getElementById('root'); return r && (r.innerText || '').trim().length > 10; },
        { timeout: 20000 },
      ).catch(() => {});
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      await page.waitForTimeout(1400);
      releve = await page.evaluate(`(${RELEVE})()`);
      const nom = chemin.replace(/^\//, '').replace(/\//g, '-');
      await page.screenshot({ path: resolve(SORTIE, `${nom}.png`) }).catch(() => {});
    } catch (e) {
      souci = String(e.message || e).split('\n')[0].slice(0, 180);
    } finally {
      await contexte.close();
    }
    releves.push({ chemin, source, releve, souci, erreurs: erreurs.slice(0, 4) });
    const t = releve ? (releve.titres[0] || releve.lignes[0] || '(aucun titre)') : '—';
    process.stderr.write(`  ${chemin.padEnd(32)} ${souci ? '✗ ' + souci : (releve?.vide ? '(ÉCRAN VIDE)' : t)}\n`);
  }
} finally {
  await navigateur.close().catch(() => {});
  serveur.kill('SIGTERM');
}

console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║  RECONNAISSANCE — 27 portes de la marchande, catalogue vide, sans réseau    ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
for (const r of releves) {
  console.log(`── ${r.chemin}`);
  console.log(`   source  : src/app/${r.source}`);
  if (r.souci) { console.log(`   ✗ ${r.souci}`); }
  if (r.releve) {
    console.log(`   titres  : ${r.releve.titres.length ? r.releve.titres.map(t => `« ${t} »`).join('  ') : '(aucun)'}`);
    console.log(`   texte   : ${r.releve.lignes.slice(0, 6).map(l => `« ${l} »`).join('  ')}`);
    console.log(`   mesure  : ${r.releve.longueur} car., ${r.releve.controles} contrôle(s), ${r.releve.noeuds} nœuds`
      + (r.releve.vide ? '   ⚠ ÉCRAN VIDE' : ''));
  }
  if (r.erreurs.length) r.erreurs.forEach(e => console.log(`   erreur  : ${e}`));
  console.log('');
}
const chemin = resolve(SORTIE, 'reconnaissance.json');
writeFileSync(chemin, JSON.stringify({ portes: releves }, null, 2));
console.log(`Relevé complet : ${chemin}`);
