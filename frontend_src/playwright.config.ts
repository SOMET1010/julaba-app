import { defineConfig } from '@playwright/test';

// Test E2E UI (Chromium) du parcours « Je commence ma journée ».
// Le serveur Vite tourne avec E2E=1 : proxy /api/v1 -> backend local (same-origin).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5199',
    headless: true,
    launchOptions: {
      executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  },
  // preview sert le BUILD de prod (avec le service worker qui pré-cache le shell)
  // -> le rechargement HORS-LIGNE charge l'app depuis le cache SW, comme en prod.
  webServer: {
    command: 'E2E=1 E2E_API=http://127.0.0.1:3000 npx vite preview --port 5199 --host 127.0.0.1',
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
