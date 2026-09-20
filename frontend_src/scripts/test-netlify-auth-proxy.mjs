import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const redirectsUrl = new URL('../public/_redirects', import.meta.url);
const redirects = readFileSync(fileURLToPath(redirectsUrl), 'utf8')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));

const apiRule = redirects.findIndex((line) =>
  /^\/api\/v1\/\*\s+https:\/\/julaba-api\.onrender\.com\/api\/v1\/:splat\s+200$/.test(line),
);
const spaRule = redirects.findIndex((line) => /^\/\*\s+\/index\.html\s+200$/.test(line));

assert.notEqual(apiRule, -1, 'Le proxy /api/v1 vers le backend Jùlaba doit exister dans public/_redirects.');
assert.notEqual(spaRule, -1, 'Le repli SPA Netlify doit exister dans public/_redirects.');
assert.ok(apiRule < spaRule, 'Le proxy API doit être déclaré avant le repli SPA, sinon l’auth reçoit index.html.');

console.log('✓ Proxy Netlify auth/API présent et prioritaire sur le repli SPA');
