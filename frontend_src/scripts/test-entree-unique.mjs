import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const routes = readFileSync(join(ici, '..', 'src/app/routes.tsx'), 'utf8');
const maestro = readFileSync(join(ici, '..', '..', 'maestro/02-connexion.yaml'), 'utf8');

let echecs = 0;
const ok = (condition, label) => {
  console.log(condition ? '  ✅' : '  ❌', label);
  if (!condition) echecs += 1;
};

console.log('\n[1] Porte d’entrée unique');
ok(/path: "\/", element: <EntryGate/.test(routes), 'la racine monte EntryGate');
ok(/path: "\/welcome", element: <Navigate to="\/" replace/.test(routes), '/welcome revient à EntryGate');
ok(/path: "\/login", element: <Navigate to="\/" replace/.test(routes), '/login revient à EntryGate');
ok(!/path: "\/welcome", element: <Welcome/.test(routes), 'Welcome ne peut plus être monté hors EntryGate');
ok(!/path: "\/login", element: <LoginPassword/.test(routes), 'LoginPassword ne peut plus être monté hors EntryGate');

console.log('\n[2] Sentinel mobile fidèle');
const iBienvenue = maestro.indexOf('visible: "Bienvenue"');
const iTata = maestro.indexOf('visible: "Moi, c\'est Tata Nanti Lou"');
const iContinuer = maestro.indexOf('tapOn: "Continuer"');
const iNumero = maestro.indexOf('visible: "Ton numéro"');
ok(iBienvenue >= 0 && iTata > iBienvenue && iContinuer > iTata && iNumero > iContinuer, 'Maestro valide Bienvenue → Tata → Numéro dans cet ordre');

console.log(echecs === 0 ? '\nTous les garde-fous d’entrée sont verts ✅\n' : `\n${echecs} échec(s) ❌\n`);
if (echecs) process.exit(1);
