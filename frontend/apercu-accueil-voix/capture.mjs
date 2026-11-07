/** Capture le banc local avec Chromium déjà présent — aucun Playwright à installer. */
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
const port = 5201;
const origine = `http://127.0.0.1:${port}/`;
mkdirSync(sorties, { recursive: true });

const serveur = spawn(process.execPath, [
  vite, '--config', join(ici, 'vite.config.ts'), '--host', '127.0.0.1',
], { cwd: frontend, stdio: 'inherit' });

try {
  let pret = false;
  for (let i = 0; i < 80; i++) {
    try { pret = (await fetch(origine)).ok; } catch { /* Vite démarre */ }
    if (pret) break;
    await pause(250);
  }
  if (!pret) throw new Error('Vite ne répond pas sur le banc de prévisualisation.');

  const etats = [
    ['accueil', 'accueil-marchand.png'],
    ['caisse-question', 'ouverture-question-fond.png'],
    ['caisse-ecoute', 'ouverture-ecoute-sans-texte.png'],
    ['caisse-confirme', 'ouverture-montant-relu.png'],
    ['caisse-confirm-ecoute', 'confirmation-ecoute-sans-texte.png'],
    ['produit-question', 'produit-question.png'],
    ['produit-ecoute', 'produit-ecoute-sans-texte.png'],
    ['produit-unite', 'produit-connu-choix-unite.png'],
    ['produit-quantite', 'produit-connu-quantite.png'],
  ];
  for (const [etat, nom] of etats) {
    const profil = mkdtempSync(join(tmpdir(), `julaba-preview-${etat}-`));
    const capture = spawnSync('chromium', [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--hide-scrollbars', '--force-device-scale-factor=2',
      '--window-size=390,844', '--virtual-time-budget=1200',
      `--user-data-dir=${profil}`,
      `--screenshot=${join(sorties, nom)}`,
      `${origine}?etat=${etat}`,
    ], { cwd: frontend, stdio: 'inherit' });
    rmSync(profil, { recursive: true, force: true });
    if (capture.status !== 0) throw new Error(`Chromium n’a pas capturé ${etat}.`);
    console.log(`Capture : ${join(sorties, nom)}`);
  }
} finally {
  serveur.kill('SIGTERM');
}
