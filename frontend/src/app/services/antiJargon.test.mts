/**
 * Test ANTI-JARGON (inclusion — docs/INCLUSION.md §3.1).
 * Lancer : npm run test:jargon   (tsx, scan statique, sans DOM)
 *
 * L'interface parle le langage de la marchande : on dit le geste (« pose ton
 * doigt ») et le résultat (« Tata t'a reconnue »), jamais la technologie.
 * Ce test balaie les CHAÎNES DE CARACTÈRES du code applicatif et échoue si un
 * mot interdit apparaît — l'inclusion ne vit pas que dans la culture du
 * projet, elle se vérifie.
 *
 * Périmètre : src/app/** (écrans marchande/acteurs). Exclus : le back-office
 * (outil de professionnels), les outils dev, les tests eux-mêmes.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Mots interdits dans une chaîne visible. Comparaison sans accents ni casse.
const MOTS_INTERDITS = [
  'biometrie',
  'biometrique',
  'authentification',
  'webauthn',
  'credential',
  'erreur serveur',
  'session expiree',
];

// Dossiers/fichiers hors périmètre (audience professionnelle ou outillage).
const EXCLUS = [
  '/components/backoffice/',
  '/components/dev/',
  '/components/identificateur/', // agent professionnel formé (enrôlement) : « biométrie » est un terme métier
  '/services/backoffice-api',
  '/pages/AdminRecovery',
  '.test.mts',
  '.spec.',
];

const RACINE = join(process.cwd(), 'src', 'app');

function normaliser(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function listerFichiers(dir: string): string[] {
  const out: string[] = [];
  for (const nom of readdirSync(dir)) {
    const chemin = join(dir, nom);
    const st = statSync(chemin);
    if (st.isDirectory()) out.push(...listerFichiers(chemin));
    else if (/\.(ts|tsx)$/.test(nom)) out.push(chemin);
  }
  return out;
}

/** Extrait les littéraux de chaîne ('…', "…", `…`) d'un source TS/TSX. */
function extraireChaines(source: string): string[] {
  const out: string[] = [];
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const s = m[1] ?? m[2] ?? m[3] ?? '';
    // Seules les PHRASES visibles comptent : une chaîne sans espace est du code
    // (chemin d'import, URL d'API, clé de stockage), pas un texte lu par la
    // marchande. Les phrases jargonneuses contiennent toujours un espace.
    if (s.length >= 4 && s.includes(' ')) out.push(s);
  }
  return out;
}

function main() {
  const fichiers = listerFichiers(RACINE)
    .filter(f => !EXCLUS.some(e => f.includes(e)));

  const violations: Array<{ fichier: string; mot: string; chaine: string }> = [];
  for (const f of fichiers) {
    const source = readFileSync(f, 'utf8');
    for (const chaine of extraireChaines(source)) {
      const n = normaliser(chaine);
      for (const mot of MOTS_INTERDITS) {
        if (n.includes(mot)) violations.push({ fichier: relative(process.cwd(), f), mot, chaine: chaine.slice(0, 90) });
      }
    }
  }

  console.log(`\n[anti-jargon] ${fichiers.length} fichiers balayés, ${MOTS_INTERDITS.length} mots interdits`);
  if (violations.length === 0) {
    console.log('  ✅ aucune chaîne jargonneuse — l\'interface parle le langage de la marchande\n');
    return;
  }
  for (const v of violations) {
    console.log(`  ❌ ${v.fichier} — « ${v.chaine} » contient « ${v.mot} »`);
  }
  console.log(`\n${violations.length} violation(s) ❌ — reformule avec le geste et le résultat (docs/INCLUSION.md §3.1)\n`);
  process.exit(1);
}

main();
