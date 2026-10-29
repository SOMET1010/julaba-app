/**
 * Tests de la TAILLE DU TEXTE (zoom réel, Paramètres).
 * Lancer : npm run test:taille   (tsx, cœur pur, sans DOM)
 */
import { zoomPourTaille, appliquerTailleTexte, ZOOMS_TEXTE, TAILLE_TEXTE_DEFAUT, VAR_ZOOM_TEXTE } from "./tailleTexte.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}

function main() {
  console.log("\n[1] Zoom par cran du curseur");
  {
    eq(zoomPourTaille(TAILLE_TEXTE_DEFAUT), 1, "cran normal (3) → 100 %");
    eq(zoomPourTaille(0), 0.85, "cran minimum → 85 %");
    eq(zoomPourTaille(6), 1.3, "cran maximum → 130 %");
    for (let i = 1; i < ZOOMS_TEXTE.length; i++) {
      ok(ZOOMS_TEXTE[i] > ZOOMS_TEXTE[i - 1], `cran ${i} strictement plus grand que le cran ${i - 1}`);
    }
  }

  console.log("\n[2] Valeurs hors bornes ou invalides → jamais de casse (100 %)");
  {
    eq(zoomPourTaille(-1), 1, "cran négatif → 100 %");
    eq(zoomPourTaille(99), 1, "cran trop grand → 100 %");
    eq(zoomPourTaille(Number.NaN), 1, "NaN → 100 %");
    eq(zoomPourTaille(2.6), 1, "valeur décimale 2.6 → arrondie au cran 3 (100 %)");
    eq(zoomPourTaille(1.4), 0.9, "valeur décimale 1.4 → arrondie au cran 1 (90 %)");
  }

  console.log("\n[3] Application : la variable CSS est posée");
  {
    const posees: Record<string, string> = {};
    const style = { setProperty: (n: string, v: string) => { posees[n] = v; } };
    eq(appliquerTailleTexte(style, 5), 1.2, "cran 5 → zoom 120 % renvoyé");
    eq(posees[VAR_ZOOM_TEXTE], "1.2", "variable --zoom-texte posée");
    appliquerTailleTexte(style, TAILLE_TEXTE_DEFAUT);
    eq(posees[VAR_ZOOM_TEXTE], "1", "retour au cran normal → 1");
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
