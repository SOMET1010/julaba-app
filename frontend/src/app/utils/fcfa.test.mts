/**
 * Tests des billets/pièces FCFA (inclusion §2.2).
 * Lancer : npm run test:fcfa   (tsx, sans DOM ni navigateur)
 */
import { COUPURES, decomposerMonnaie, direCoupure, hauteurBillet } from "./fcfa.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const composantCoupure = readFileSync(
  fileURLToPath(new URL("../components/marchand/CoupureDessinee.tsx", import.meta.url)),
  "utf8",
);

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}

function main() {
  console.log("\n[1] Coupures d'encaissement");
  {
    eq(COUPURES.map(c => c.valeur), [10000, 5000, 2000, 1000, 500, 250, 200, 100, 50, 25], "toutes les coupures, décroissantes");
    ok(COUPURES.every(c => c.forme === 'billet' ? c.valeur >= 1000 : c.valeur <= 500), "billets ≥ 1 000, pièces ≤ 500");
    ok(COUPURES.find(c => c.valeur === 500)?.forme === 'piece', "500 FCFA est présentée comme une pièce");
    ok(COUPURES.every((c, i) => i === 0 || COUPURES[i - 1].valeur > c.valeur), "ordre strictement décroissant");
    eq(
      COUPURES.filter(c => c.forme === 'billet').map(c => [c.valeur, c.couleur, c.repere]),
      [
        [10000, '#76539D', 'technologie'],
        [5000, '#347A4B', 'agriculture'],
        [2000, '#3577AE', 'transport'],
        [1000, '#B34E45', 'education'],
      ],
      "couleurs dominantes et thèmes simplifiés alignés sur les références BCEAO",
    );
  }

  console.log("\n[2] Décomposition de la monnaie (glouton canonique)");
  {
    eq(decomposerMonnaie(2500), { lignes: [{ valeur: 2000, nb: 1 }, { valeur: 500, nb: 1 }], reste: 0 }, "2 500 = 2000 + 500");
    eq(decomposerMonnaie(400), { lignes: [{ valeur: 200, nb: 2 }], reste: 0 }, "400 = 200 × 2");
    eq(decomposerMonnaie(75), { lignes: [{ valeur: 50, nb: 1 }, { valeur: 25, nb: 1 }], reste: 0 }, "75 = 50 + 25");
    eq(decomposerMonnaie(17500), { lignes: [{ valeur: 10000, nb: 1 }, { valeur: 5000, nb: 1 }, { valeur: 2000, nb: 1 }, { valeur: 500, nb: 1 }], reste: 0 }, "17 500 en 4 coupures");
    eq(decomposerMonnaie(0), { lignes: [], reste: 0 }, "0 → rien à rendre");
    eq(decomposerMonnaie(12), { lignes: [{ valeur: 10, nb: 1 }], reste: 2 }, "montant non rond → reste explicite");
    eq(decomposerMonnaie(-100), { lignes: [], reste: 0 }, "négatif → rien (jamais de monnaie négative)");
  }

  console.log("\n[3] Coupures dites à voix haute");
  {
    eq(direCoupure(10000), "dix mille francs", "10 000 se dit");
    eq(direCoupure(500), "cinq cents francs", "500 se dit");
    eq(direCoupure(25), "vingt-cinq francs", "25 se dit");
  }

  console.log("\n[4] Billets dessinés — échelle réelle et cible tactile");
  {
    // Les vraies coupures XOF grandissent avec la valeur : une marchande qui
    // ne lit pas s'appuie sur ce repère autant que sur la couleur. On
    // reproduit l'ÉCHELLE, jamais le dessin (la BCEAO encadre la reproduction
    // des billets). Et aucune taille ne doit passer sous la cible tactile de
    // 44 px : un billet qu'on rate au doigt annule le bénéfice de l'avoir
    // dessiné.
    const billets = COUPURES.filter((c) => c.forme === "billet").map((c) => c.valeur);
    const hauteurs = billets.map(hauteurBillet);

    ok(hauteurs.length === 4, "quatre billets proposés à l'encaissement");
    ok(hauteurs.every((h) => h >= 44), "aucun billet sous la cible tactile de 44 px");

    // COUPURES est trié décroissant (10 000 → 500) : les hauteurs aussi.
    let croissanteAvecLaValeur = true;
    for (let i = 1; i < hauteurs.length; i++) {
      if (hauteurs[i] >= hauteurs[i - 1]) croissanteAvecLaValeur = false;
    }
    ok(croissanteAvecLaValeur, "le billet grandit avec la valeur, comme les vraies coupures");
    ok(
      hauteurBillet(10000) - hauteurBillet(1000) >= 12,
      "l'écart entre le plus gros et le plus petit billet se voit à l'œil nu",
    );
    ok(hauteurBillet(123456) >= 44, "valeur inattendue → taille plancher, jamais 0");
  }

  console.log("\n[5] Repères visuels sans reproduction des billets");
  {
    ok(/data-billet-repere=\{coupure\.repere\}/.test(composantCoupure), "le thème de chaque billet est matérialisé dans le dessin");
    for (const icone of ["RadioTower", "Sprout", "BusFront", "BookOpen"]) {
      ok(composantCoupure.includes(icone), `le repère ${icone} est disponible`);
    }
    ok(!/logo BCEAO|numéro de série|signe de sécurité/i.test(composantCoupure.replace(/\/\*[\s\S]*?\*\//g, "")), "aucun élément sécurisé n'est reproduit dans le rendu");
  }

  // ── UN MONTANT DIT N'EST PAS UN MONTANT AFFICHÉ ────────────────────────
  //
  // Retour terrain, confirmé deux fois : « il lit 2000 francs : 2 zéro zéro
  // zéro francs ». Mesuré : `(2000).toLocaleString('fr-FR')` rend `2` + U+202F
  // (espace fine insécable) + `000`, et AUCUNE couche ne la retire avant le
  // moteur de voix. Celui-ci reçoit un nombre coupé et lit les chiffres un par
  // un. Sans locale, c'est pire : `toLocaleString()` suit la locale de
  // l'APPAREIL — le même montant n'est pas dit pareil selon le téléphone.
  //
  // LA RÈGLE EXISTE DÉJÀ, on n'en écrit pas une seconde : `nombreEnMotsFr`
  // (i18n/voice/argent/deuxFormes) rend « deux mille », déterministe, sans ICU.
  // `formeEcran` garde l'espace fine pour l'ŒIL — elle y est bonne. Ne jamais
  // donner deux sens à la même donnée : un montant affiché n'est pas un montant
  // dit, et les confondre est exactement ce qui a produit ce défaut.
  {
    const ecrans = [
      "components/marchand/DepenseForm.tsx",
      "components/marchand/GestionStock.tsx",
      "components/marchand/MarchandModals.tsx",
      "components/marchand/CreditModal.tsx",
      "components/marchand/MesCommandes.tsx",
      "components/marchand/VentesPassees.tsx",
    ];
    for (const rel of ecrans) {
      const src = readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), "utf-8")
        .replace(/\/\*[\s\S]*?\*\//g, "").split("\n")
        .filter((l) => !/^\s*(\/\/|\*)/.test(l)).join("\n");
      const nom = rel.split("/").pop();

      // Un appel de parole qui contient un formatage d'ÉCRAN sur la même ligne.
      const fautifs = src.split("\n").filter((l) =>
        /(speak|dire|direEtRetenir|speakAuto)\s*\(/.test(l) &&
        /toLocaleString|formatMontantFR|formatF\(/.test(l));
      ok(fautifs.length === 0,
         `${nom} : aucun montant formaté pour l'écran ne part à la voix (${fautifs.length} restant(s))`);
    }
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
