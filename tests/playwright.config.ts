import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './specs',
  timeout: 15000,
  use: {
    baseURL: 'https://julaba.online',
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  },
  reporter: 'line',
});
