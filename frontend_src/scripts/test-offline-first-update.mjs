import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const frontend = join(ici, '..');
const main = readFileSync(join(frontend, 'src/main.tsx'), 'utf8');
const sw = readFileSync(join(frontend, 'public/sw.js'), 'utf8');
const vite = readFileSync(join(frontend, 'vite.config.ts'), 'utf8');

let failures = 0;
function ok(condition, label) {
  if (condition) console.log('  ✅', label);
  else { console.log('  ❌', label); failures += 1; }
}

console.log('\n[1] Installation offline dès l’ouverture');
ok(/navigator\.serviceWorker\s*\.register\('\/sw\.js',\s*\{\s*updateViaCache:\s*'none'\s*\}\)/s.test(main),
  'le service worker est enregistré au démarrage sans réutiliser un sw.js périmé');
ok(/await\s+Promise\.allSettled\(PRECACHE\.map/.test(sw),
  'tous les chunks applicatifs sont réellement attendus pendant l’installation');
ok(!/PRECACHE_MAX_BYTES|statSync\(join\(assetsDir/.test(vite),
  'aucun chunk JS/CSS essentiel n’est exclu du pré-cache à cause de sa taille');
ok(/caches\.match\('\/index\.html'\)/.test(sw),
  'une navigation sans réseau retombe sur l’application en cache');

console.log('\n[2] Voix disponible sans réseau');
ok(/listerMp3Recursivement\(voiceDir\)/.test(vite),
  'tous les MP3 sous public/voix sont inventoriés récursivement');
ok(/await\s+Promise\.allSettled\(PRECACHE_VOICE\.map/.test(sw),
  'l’installation attend la mise en cache des clips vocaux');
ok(/url\.pathname\.startsWith\('\/voix\/'\)/.test(sw),
  'les clips déjà téléchargés sont servis depuis le cache en priorité');

console.log('\n[3] Aucune actualisation manuelle demandée');
ok(/serviceWorker\.addEventListener\('controllerchange'/.test(main),
  'la prise de contrôle d’une nouvelle version est détectée');
ok(/if \(reloading \|\| !hadController\) return;[\s\S]{0,100}window\.location\.reload\(\)/.test(main),
  'la nouvelle version recharge automatiquement une seule fois, jamais à la première installation');
ok(/reg\.update\?\.\(\)/.test(main),
  'une mise à jour est recherchée automatiquement');
ok(/visibilitychange/.test(main),
  'le retour au premier plan vérifie la version sans geste de la vendeuse');
ok(/self\.skipWaiting\(\)/.test(sw) && /self\.clients\.claim\(\)/.test(sw),
  'le nouveau service worker prend la main sans bouton système');

console.log(failures === 0 ? '\nOffline-first sans actualisation manuelle : OK ✅\n' : `\n${failures} échec(s) ❌\n`);
if (failures > 0) process.exit(1);
