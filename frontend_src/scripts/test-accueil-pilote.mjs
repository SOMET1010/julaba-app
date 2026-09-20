import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const lire = (f) => readFileSync(join(ici, '..', 'src', 'app', 'components', f), 'utf8');
const accueil = lire('marchand/MarchandAccueilVoice.tsx');
const layout = lire('layout/AppLayout.tsx');
const sidebar = lire('layout/Sidebar.tsx');
const bottom = lire('layout/BottomBar.tsx');
const tata = lire('assistant/TantieSagesseModal.tsx');

let echecs = 0;
const ok = (condition, label) => {
  console.log(condition ? '  ✅' : '  ❌', label);
  if (!condition) echecs += 1;
};

console.log('\n[1] Accueil marchand du pilote');
ok(!accueil.includes("navigate('/marchand/keiwa')"), 'aucune porte Keiwa depuis l’accueil marchand');
ok(!accueil.includes("label: 'Mon argent'"), 'aucune tuile financière inactive présentée comme disponible');
ok(/Ma caisse aujourd'hui[\s\S]{0,160}fontSize: 14/.test(accueil) || /fontSize: 14[\s\S]{0,160}Ma caisse aujourd'hui/.test(accueil), 'le libellé financier principal atteint 14 px');

console.log('\n[2] Une seule Tata sur tous les formats');
ok(/<Sidebar[\s\S]{0,220}onMicClick=\{\(\) => setTataOuverte\(true\)\}/.test(layout), 'la sidebar ouvre Tata dans le layout');
ok(/<BottomBar[\s\S]{0,220}onMicClick=\{\(\) => setTataOuverte\(true\)\}/.test(layout), 'la barre mobile ouvre la même Tata');
ok((layout.match(/<TantieSagesseModal/g) || []).length === 1, 'le layout monte une seule modale Tata');
ok(!bottom.includes('<TantieSagesseModal') && !sidebar.includes('<TantieSagesseModal'), 'aucune seconde modale concurrente dans les navigations');
ok(!sidebar.includes("Je t'écoute..."), 'desktop ne prétend plus écouter sans ouvrir l’assistante');
ok(/role="dialog"/.test(tata) && /aria-modal="true"/.test(tata), 'Tata est annoncée comme une vraie boîte de dialogue');

console.log(echecs === 0 ? '\nTous les garde-fous accueil pilote sont verts ✅\n' : `\n${echecs} échec(s) ❌\n`);
if (echecs) process.exit(1);
