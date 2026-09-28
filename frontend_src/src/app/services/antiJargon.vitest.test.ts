/**
 * PILOTE Vitest — Test ANTI-JARGON (inclusion — docs/INCLUSION.md §3.1).
 *
 * Migration du test legacy `antiJargon.test.mts` (scan statique via `node:fs` +
 * helpers ad-hoc) vers la syntaxe native Vitest. C'est l'un des 3 pilotes
 * INIT-021 ; le test legacy continue de s'exécuter via `tsx`
 * (`npm run test:jargon`).
 *
 * L'interface parle le langage de la marchande : on dit le geste (« pose ton
 * doigt ») et le résultat (« Tata t'a reconnue »), jamais la technologie.
 * Ce test balaie les CHAÎNES DE CARACTÈRES du code applicatif et échoue si un
 * mot interdit apparaît — l'inclusion ne vit pas que dans la culture du
 * projet, elle se vérifie.
 *
 * Périmètre : src/app/** (écrans marchande/acteurs). Exclus : le back-office
 * (outil de professionnels), les outils dev, les tests eux-mêmes.
 *
 * Environnement : `node` (pas de DOM requis, on ne fait que scanner des
 * fichiers). On surcharge l'environnement jsdom par défaut de la config.
 *
 * Lancer : `npm run test:vitest`.
 */
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Mots interdits dans une chaîne visible. Comparaison sans accents ni casse.
const MOTS_INTERDITS = [
  "biometrie",
  "biometrique",
  "authentification",
  "webauthn",
  "credential",
  "erreur serveur",
  "session expiree",
];

// Dossiers/fichiers hors périmètre (audience professionnelle ou outillage).
const EXCLUS = [
  "/components/backoffice/",
  "/components/dev/",
  "/components/identificateur/", // agent professionnel formé (enrôlement) : « biométrie » est un terme métier
  "/services/backoffice-api",
  "/pages/AdminRecovery",
  ".test.mts",
  ".test.tsx",
  ".vitest.test.",
  ".spec.",
];

// On résout `src/app` à partir du chemin du test (et non `process.cwd()`) pour
// rester robuste quel que soit le répertoire d'où Vitest est lancé.
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const RACINE = join(__dirname, "..");

function normaliser(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
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
    const s = m[1] ?? m[2] ?? m[3] ?? "";
    // Seules les PHRASES visibles comptent : une chaîne sans espace est du code
    // (chemin d'import, URL d'API, clé de stockage), pas un texte lu par la
    // marchande. Les phrases jargonneuses contiennent toujours un espace.
    if (s.length >= 4 && s.includes(" ")) out.push(s);
  }
  return out;
}

function listerViolations(): Array<{ fichier: string; mot: string; chaine: string }> {
  const fichiers = listerFichiers(RACINE).filter((f) => !EXCLUS.some((e) => f.includes(e)));
  const violations: Array<{ fichier: string; mot: string; chaine: string }> = [];
  for (const f of fichiers) {
    const source = readFileSync(f, "utf8");
    for (const chaine of extraireChaines(source)) {
      const n = normaliser(chaine);
      for (const mot of MOTS_INTERDITS) {
        if (n.includes(mot)) {
          violations.push({
            fichier: relative(join(__dirname, "..", ".."), f),
            mot,
            chaine: chaine.slice(0, 90),
          });
        }
      }
    }
  }
  return violations;
}

describe("ANTI-JARGON — l'interface parle le langage de la marchande", () => {
  it("ne contient aucune chaîne jargonneuse dans src/app (hors back-office/dev/tests)", () => {
    const violations = listerViolations();
    if (violations.length !== 0) {
      const detail = violations
        .map((v) => `  ❌ ${v.fichier} — « ${v.chaine} » contient « ${v.mot} »`)
        .join("\n");
      // On affiche TOUTES les violations d'un coup : l'assertion échoue avec un
      // message lisible plutôt qu'une liste tronquée.
      expect.fail(
        `${violations.length} violation(s) jargon — reformule avec le geste et le résultat (docs/INCLUSION.md §3.1) :\n${detail}`,
      );
    }
    expect(violations).toEqual([]);
  });
});
