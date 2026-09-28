/**
 * Vitest — Test de COHÉRENCE DES TOKENS de couleur (contraste v2 — inclusion
 * §2.4). Migration depuis `tokens.test.mts` (scan statique via `node:fs` +
 * helpers ad-hoc + `process.exit(1)`). Le test legacy continue via `tsx`
 * (`npm run test:tokens`) — cohabitation INIT-021.
 *
 * Garanties :
 * 1. Tout token `--encre*` / `--trait*` référencé dans le code (var(--…))
 *    est bien DÉFINI dans styles/tokens.css (:root) — pas de token fantôme
 *    qui laisserait un texte sans couleur.
 * 2. Les blocs `html.soleil` ET `html.dark` ne surchargent QUE des tokens
 *    définis dans :root (pas de faute de frappe silencieuse).
 * 3. Tout token surchargé par le soleil l'est AUSSI par le sombre (et
 *    inversement) : un mode qui oublierait un token laisserait une encre
 *    noire sur fond sombre — invisible.
 *
 * Environnement : `node` (scan fs, pas de DOM requis).
 *
 * Lancer : `npm run test:vitest`.
 */
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// On résout les chemins à partir du fichier de test (et non `process.cwd()`)
// pour rester robuste quel que soit le répertoire d'où Vitest est lancé.
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SRC = join(__dirname, "..", "..");        // .../frontend_src/src
const RACINE = join(SRC, "app");                // .../frontend_src/src/app
const TOKENS_CSS = join(SRC, "styles", "tokens.css");
const PREFIXES = ["--encre", "--trait"];

function listerFichiers(dir: string): string[] {
  const out: string[] = [];
  for (const nom of readdirSync(dir)) {
    const chemin = join(dir, nom);
    const st = statSync(chemin);
    if (st.isDirectory()) out.push(...listerFichiers(chemin));
    // On exclut les tests legacy (qui référencent des tokens à titre de
    // données de test, ex. `var(--encre-noir)` dans une chaîne de comparaison).
    else if (/\.(ts|tsx)$/.test(nom) && !/\.test\.(mts|tsx)$/.test(nom) && !/\.vitest\.test\./.test(nom)) {
      out.push(chemin);
    }
  }
  return out;
}

function extraireBloc(css: string, selecteur: string): string {
  const i = css.indexOf(selecteur);
  if (i < 0) return "";
  const debut = css.indexOf("{", i);
  const fin = css.indexOf("}", debut);
  return css.slice(debut + 1, fin);
}

function nomsDefinis(bloc: string): Set<string> {
  return new Set([...bloc.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
}

function listerTokensFantomes(): Array<{ fichier: string; token: string }> {
  const css = readFileSync(TOKENS_CSS, "utf8");
  const racineTokens = nomsDefinis(extraireBloc(css, ":root"));
  const inconnus: Array<{ fichier: string; token: string }> = [];
  for (const f of listerFichiers(RACINE)) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
      const token = m[1];
      if (!PREFIXES.some((p) => token.startsWith(p))) continue;
      if (!racineTokens.has(token)) inconnus.push({ fichier: relative(SRC, f), token });
    }
  }
  return inconnus;
}

describe("tokens.css — définitions et surcharges des modes", () => {
  const css = readFileSync(TOKENS_CSS, "utf8");
  const racineTokens = nomsDefinis(extraireBloc(css, ":root"));
  const soleilTokens = nomsDefinis(extraireBloc(css, "html.soleil"));
  const sombreTokens = nomsDefinis(extraireBloc(css, "html.dark"));

  it(":root définit des tokens", () => {
    expect(racineTokens.size).toBeGreaterThan(0);
  });

  it("chaque surcharge soleil existe dans :root", () => {
    for (const t of soleilTokens) {
      expect(racineTokens.has(t), `surcharge soleil « ${t} » existe dans :root`).toBe(true);
    }
  });

  it("chaque surcharge sombre existe dans :root", () => {
    for (const t of sombreTokens) {
      expect(racineTokens.has(t), `surcharge sombre « ${t} » existe dans :root`).toBe(true);
    }
  });

  it("parité des modes : chaque token surchargé par le soleil l'est aussi par le sombre", () => {
    for (const t of soleilTokens) {
      expect(sombreTokens.has(t), `« ${t} » surchargé par le soleil l'est aussi par le sombre`).toBe(true);
    }
  });

  it("parité des modes : chaque token surchargé par le sombre l'est aussi par le soleil", () => {
    for (const t of sombreTokens) {
      expect(soleilTokens.has(t), `« ${t} » surchargé par le sombre l'est aussi par le soleil`).toBe(true);
    }
  });
});

describe("Tout var(--encre*/--trait*) du code est défini", () => {
  it("aucun token fantôme", () => {
    const inconnus = listerTokensFantomes();
    if (inconnus.length !== 0) {
      const detail = inconnus
        .map((u) => `  ❌ ${u.fichier} référence « ${u.token} » non défini dans tokens.css`)
        .join("\n");
      expect.fail(`${inconnus.length} token(s) fantôme(s) :\n${detail}`);
    }
    expect(inconnus).toEqual([]);
  });

  it("au moins un usage de token dans le code balayé", () => {
    // Garde anti-retour : si le scan ne trouve plus rien, c'est qu'il est cassé.
    const css = readFileSync(TOKENS_CSS, "utf8");
    const racineTokens = nomsDefinis(extraireBloc(css, ":root"));
    let usages = 0;
    for (const f of listerFichiers(RACINE)) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
        const token = m[1];
        if (PREFIXES.some((p) => token.startsWith(p))) usages++;
      }
    }
    // On garde la même sémantique que le test legacy : il y a des tokens, donc
    // il y a des usages.
    expect(usages).toBeGreaterThan(0);
    expect(racineTokens.size).toBeGreaterThan(0);
  });
});
