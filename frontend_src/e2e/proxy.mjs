// Mini-serveur même-origine pour la recette runtime : sert le build statique
// (frontend/dist) et relaie /api/* vers le backend local. Sans dépendance.
//   node proxy.mjs <dist-dir> [port] [apiTarget]
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const DIST = process.argv[2];
const PORT = Number(process.argv[3] || 4180);
const API = process.argv[4] || 'http://localhost:3000';
const apiHost = new URL(API).host;
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.map': 'application/json',
  '.wasm': 'application/wasm', '.onnx': 'application/octet-stream',
};

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) {
    const headers = { ...req.headers, host: apiHost };
    const pr = http.request(API + req.url, { method: req.method, headers }, (pres) => {
      res.writeHead(pres.statusCode || 502, pres.headers);
      pres.pipe(res);
    });
    pr.on('error', (e) => { res.writeHead(502); res.end('proxy error: ' + e.message); });
    req.pipe(pr);
    return;
  }
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let fp = normalize(join(DIST, urlPath));
  if (!fp.startsWith(DIST)) fp = join(DIST, 'index.html');
  try {
    const s = await stat(fp);
    if (s.isDirectory()) fp = join(fp, 'index.html');
    await stat(fp);
  } catch { fp = join(DIST, 'index.html'); } // fallback SPA
  try {
    const buf = await readFile(fp);
    res.writeHead(200, { 'content-type': types[extname(fp)] || 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404); res.end('not found'); }
});
server.listen(PORT, () => console.log('[proxy] up on ' + PORT + ' → ' + DIST + ' (api → ' + API + ')'));
