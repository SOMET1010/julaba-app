// Mesure d'atteignabilité du code frontend — instrument de HYGIÈNE-1 (axe 1).
//
// Usage : node scripts/hygiene/atteignabilite.mjs   (depuis la racine du dépôt)
//         SORTIE=/chemin/liste.txt pour écrire la liste des candidats.
//
// HYGIÈNE-1 axe 1 — graphe d'atteignabilité réel depuis les points d'entrée.
// On ne se contente PAS de « jamais importé » : on part des entrées (main.tsx,
// index.html, scripts de build/test) et on marche le graphe d'imports, statiques
// ET dynamiques. Ce qui reste hors du parcours est CANDIDAT, pas condamné.
import fs from 'node:fs';
import path from 'node:path';

const RACINE = process.cwd();
const SRC = path.join(RACINE, 'frontend_src', 'src');
const EXT = ['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs', '.json'];

function tousFichiers(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) tousFichiers(p, acc);
    else acc.push(p);
  }
  return acc;
}

const fichiers = tousFichiers(SRC);
const codeSrc = fichiers.filter((f) => /\.(ts|tsx|mts|js|jsx|mjs)$/.test(f) && !f.endsWith('.d.ts'));

function resoudre(depuis, spec) {
  if (!spec.startsWith('.') && !spec.startsWith('/') && !spec.startsWith('@/')) return null; // paquet npm
  let base;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('/src/')) base = path.join(RACINE, 'frontend_src', spec.slice(1));
  else base = path.resolve(path.dirname(depuis), spec);
  const essais = [base, ...EXT.map((e) => base + e), ...EXT.map((e) => path.join(base, 'index' + e))];
  // .js → .ts (imports ESM TypeScript)
  if (/\.m?js$/.test(base)) {
    essais.push(base.replace(/\.m?js$/, '.ts'), base.replace(/\.m?js$/, '.tsx'), base.replace(/\.js$/, '.mts'));
  }
  for (const t of essais) {
    try { if (fs.statSync(t).isFile()) return t; } catch {}
  }
  return null;
}

const RE_STATIQUE = /(?:^|[\s;}])(?:import|export)\s+(?:[\s\S]*?\sfrom\s*)?['"]([^'"]+)['"]/g;
const RE_DYN = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const RE_REQUIRE = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
// vite: import.meta.glob('./x/*.ts') — chargement dynamique par motif
const RE_GLOB = /import\.meta\.glob\w*\s*\(\s*['"]([^'"]+)['"]/g;

const aretes = new Map(); // fichier -> Set(fichiers)
const globsVus = [];
for (const f of codeSrc.concat(fichiers.filter((x) => /\.(json|html)$/.test(x)))) {
  let txt;
  try { txt = fs.readFileSync(f, 'utf8'); } catch { continue; }
  const cibles = new Set();
  for (const re of [RE_STATIQUE, RE_DYN, RE_REQUIRE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(txt))) {
      const r = resoudre(f, m[1]);
      if (r) cibles.add(r);
    }
  }
  RE_GLOB.lastIndex = 0;
  let g;
  while ((g = RE_GLOB.exec(txt))) globsVus.push({ depuis: f, motif: g[1] });
  aretes.set(f, cibles);
}

// Entrées : main.tsx + tout fichier cité par index.html / vite.config / scripts npm
const entrees = new Set();
const mainT = path.join(SRC, 'main.tsx');
if (fs.existsSync(mainT)) entrees.add(mainT);

// Tests (verify, test:ci) : ce sont des consommateurs légitimes.
const pkg = JSON.parse(fs.readFileSync(path.join(RACINE, 'frontend_src', 'package.json'), 'utf8'));
const scripts = Object.entries(pkg.scripts || {});
const testsFichiers = fichiers.filter((f) => /\.(test|spec)\.(ts|tsx|mts|mjs|js)$/.test(f));
for (const t of testsFichiers) entrees.add(t);
// fichiers cités littéralement dans un script npm
for (const [, cmd] of scripts) {
  for (const m of cmd.matchAll(/[\w./-]*src\/[\w./-]+\.(?:ts|tsx|mts|mjs|js)/g)) {
    const p = path.join(RACINE, 'frontend_src', m[0].replace(/^\.?\//, ''));
    if (fs.existsSync(p)) entrees.add(p);
  }
}

// BFS
const atteints = new Set();
const file = [...entrees];
while (file.length) {
  const f = file.pop();
  if (atteints.has(f)) continue;
  atteints.add(f);
  for (const c of aretes.get(f) || []) if (!atteints.has(c)) file.push(c);
}

const appFiles = codeSrc
  .filter((f) => f.startsWith(path.join(SRC, 'app')))
  .filter((f) => !/\.(test|spec)\./.test(f));

const orphelins = appFiles.filter((f) => !atteints.has(f)).map((f) => path.relative(RACINE, f)).sort();

console.log('fichiers app analysés :', appFiles.length);
console.log('atteignables depuis les entrées :', appFiles.length - orphelins.length);
console.log('CANDIDATS (hors parcours) :', orphelins.length);
console.log('globs vite trouvés :', JSON.stringify(globsVus, null, 1));
if (process.env.SORTIE) fs.writeFileSync(process.env.SORTIE, orphelins.join('\n') + '\n');
else orphelins.forEach((o) => console.log('  ' + o));
