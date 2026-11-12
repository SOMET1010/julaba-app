/** Capture le banc UI (app réelle) avec Chromium déjà présent — aucun Playwright à installer.
 *  Sorties : apercu-banc-ui/captures/*.png (copiées ensuite dans download/ pour le propriétaire). */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { setTimeout as pause } from 'node:timers/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const frontend = resolve(ici, '..');
const sorties = join(ici, 'captures');
const vite = resolve(frontend, '../node_modules/vite/bin/vite.js');
const port = 5215;
const origine = `http://127.0.0.1:${port}`;
const chrome = process.env.PW_CHROMIUM
  || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
mkdirSync(sorties, { recursive: true });

// API morte : /auth/me échoue RÉSEAU → la session en cache reste (mode hors-ligne,
// même chemin de code que l'APK sans réseau). Port 9 = discard, refus immédiat.
const envBanc = {
  ...process.env,
  VITE_API_URL: 'http://127.0.0.1:9/api/v1',
  VITE_JULABA_MODULES_HORS_PILOTE: 'true',
  VITE_JULABA_VOICE_PREVIEW: 'false',
  JULABA_VOIX_DYU: '0',
  JULABA_DYU_ARGENT: '0',
};

const serveur = spawn(process.execPath, [
  vite, '--config', join(ici, 'vite.config.ts'), '--host', '127.0.0.1',
], { cwd: frontend, stdio: 'inherit', env: envBanc });

try {
  let pret = false;
  for (let i = 0; i < 120; i++) {
    try { pret = (await fetch(origine)).ok; } catch { /* Vite démarre */ }
    if (pret) break;
    await pause(250);
  }
  if (!pret) throw new Error('Vite ne répond pas sur le banc UI.');

  const captures = [
    // Préchauffage : Vite compile l'app à la volée — la première navigation
    // est lente, sa capture serait un écran blanc. On navigue sans garder.
    ['préchauffage', '/marchand', 1440, 900, 9000],
    // ── MOBILE 390×844 (la marchande, l'APK) ──
    ['accueil-mobile', '/marchand', 390, 844, 4000],
    ['depenses-mobile', '/marchand/cahier', 390, 844, 4000],
    // ── DESKTOP 1440×900 (la sidebar, la position des retours) ──
    ['accueil-desktop', '/marchand', 1440, 900, 4000],
    ['depenses-desktop', '/marchand/cahier', 1440, 900, 4000],
    ['ventes-passees-desktop', '/marchand/ventes-passees', 1440, 900, 4000],
    ['stock-desktop', '/marchand/stock', 1440, 900, 4000],
    ['caisse-desktop', '/marchand/caisse', 1440, 900, 4000],
    ['depense-form-desktop', '/marchand/depense', 1440, 900, 4000],
    ['keiwa-desktop', '/marchand/keiwa', 1440, 900, 4000],
    ['keiwa-paiements-desktop', '/marchand/keiwa/paiements', 1440, 900, 4000],
    ['keiwa-carte-desktop', '/marchand/keiwa/carte', 1440, 900, 4000],
    ['keiwa-historique-desktop', '/marchand/keiwa/historique', 1440, 900, 4000],
  ];

  for (const [nom, route, largeur, hauteur, budget] of captures) {
    const profil = mkdtempSync(join(tmpdir(), `julaba-banc-ui-${nom}-`));
    const capture = spawnSync(chrome, [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--hide-scrollbars', '--force-device-scale-factor=1',
      `--window-size=${largeur},${hauteur}`, `--virtual-time-budget=${budget}`,
      `--user-data-dir=${profil}`,
      `--screenshot=${join(sorties, `${nom}.png`)}`,
      `${origine}${route}`,
    ], { cwd: frontend, stdio: 'inherit', env: envBanc });
    rmSync(profil, { recursive: true, force: true });
    if (capture.status !== 0) throw new Error(`Chromium n'a pas capturé ${nom}.`);
    console.log(`Capture : ${nom} (${largeur}x${hauteur}) ${route}`);
  }
} finally {
  serveur.kill('SIGTERM');
}
