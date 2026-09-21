/**
 * Tests du parseur de nombres MANDINGUE (noyau mandingue + variétés régionales,
 * dont le dioula véhiculaire ivoirien en variété de PREMIER RANG).
 * Lancer : npm run test:mandingue   (tsx, sans DOM ni navigateur)
 *
 * Ce fichier est le NOUVEAU maillon : il va dans `verify`, jamais dans la
 * chaîne `test:ci` gelée. L'ancien `nombresBambara.test.mts` n'est PAS touché —
 * c'est lui, inchangé, qui prouve la non-régression de Bamako côté `test:ci`.
 *
 * Trois preuves, dans cet ordre :
 *   [A] Abidjan — les formes dioula nouvellement attestées sont comprises ;
 *   [B] Bamako  — aucune forme bambara existante n'a été perdue ;
 *   [C] la grammaire garde le dernier mot : aucune inférence nouvelle, et le
 *       piège dɔrɔmɛ (1 dɔrɔmɛ = 5 FCFA) reste intact.
 */
import * as M from "./nombresMandingue.js";

const { extraireNombreBambara, contientNombreBambara, normaliserBambara } = M;

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}

function main() {
  console.log("\n[A] ABIDJAN — dioula véhiculaire ivoirien, variété de premier rang");
  {
    eq(extraireNombreBambara("looru"), 5, "looru = 5 (dioula, là où Bamako dit duuru)");
    eq(extraireNombreBambara("wolonfila"), 7, "wolonfila = 7");
    eq(extraireNombreBambara("wolonvila"), 7, "wolonvila = 7 (le v de biwolonvila)");
    eq(extraireNombreBambara("seegi"), 8, "seegi = 8");
    eq(extraireNombreBambara("kɔnɔtɔ"), 9, "kɔnɔtɔ = 9");
    eq(extraireNombreBambara("waga kelen"), 1000, "waga kelen = 1000");
    eq(extraireNombreBambara("baa kelen"), 1000, "baa kelen = 1000");
    eq(extraireNombreBambara("tan ni looru"), 15, "tan ni looru = 15 (composition « ni » inchangée)");
    eq(extraireNombreBambara("keme looru"), 500, "kɛmɛ looru = 500");
    eq(extraireNombreBambara("waga looru"), 5000, "waga looru = 5000");
  }

  console.log("\n[A-bis] Dizaines ATTACHÉES — normalisation de forme, pas de lexique");
  {
    eq(extraireNombreBambara("bisaba"), 30, "bisaba = 30");
    eq(extraireNombreBambara("binaani"), 40, "binaani = 40");
    eq(extraireNombreBambara("bilooru"), 50, "bilooru = 50");
    eq(extraireNombreBambara("biwɔɔrɔ"), 60, "biwɔɔrɔ = 60");
    eq(extraireNombreBambara("biwolonvila"), 70, "biwolonvila = 70");
    eq(extraireNombreBambara("biseegi"), 80, "biseegi = 80");
    eq(extraireNombreBambara("bisegin"), 80, "bisegin = 80");
    eq(extraireNombreBambara("bikɔnɔtɔ"), 90, "bikɔnɔtɔ = 90");
    eq(extraireNombreBambara("bilooru ni looru"), 55, "bilooru ni looru = 55 (attachée + « ni »)");
    eq(extraireNombreBambara("keme fila ni bikɔnɔtɔ"), 290, "kɛmɛ fila ni bikɔnɔtɔ = 290");
  }

  console.log("\n[B] BAMAKO — non-régression : rien n'a été retiré");
  {
    eq(extraireNombreBambara("duuru"), 5, "duuru = 5 (Bamako reste compris)");
    eq(extraireNombreBambara("wolonwula"), 7, "wolonwula = 7");
    eq(extraireNombreBambara("seegin"), 8, "seegin = 8");
    eq(extraireNombreBambara("segin"), 8, "segin = 8");
    eq(extraireNombreBambara("kɔnɔntɔn"), 9, "kɔnɔntɔn = 9");
    eq(extraireNombreBambara("ba kelen"), 1000, "ba kelen = 1000");
    eq(extraireNombreBambara("waa fila"), 2000, "waa fila = 2000");
    eq(extraireNombreBambara("bi saba"), 30, "bi saba = 30 (forme séparée intacte)");
    eq(extraireNombreBambara("keme saba ni bi duuru ni duuru"), 355, "kɛmɛ saba ni bi duuru ni duuru = 355");
    eq(extraireNombreBambara("tan ni kelen"), 11, "tan ni kelen = 11");
    eq(extraireNombreBambara("mugan ni fila"), 22, "mugan ni fila = 22");
    eq(extraireNombreBambara("n ye tamati feere keme duuru la"), 500, "phrase de Bamako : 500 au milieu");
  }

  console.log("\n[C] L'argent et la grammaire — rien de neuf ne s'invente");
  {
    // dɔrɔmɛ : au marché les prix se disent en pièces de 5 F. Intact.
    eq(extraireNombreBambara("dorome keme"), 500, "dɔrɔmɛ kɛmɛ = 500 FCFA (piège intact)");
    eq(extraireNombreBambara("dɔrɔmɛ looru"), 25, "dɔrɔmɛ looru = 5 dɔrɔmɛ = 25 FCFA (dioula × argent)");
    eq(extraireNombreBambara("dorome tan ni duuru"), 75, "dɔrɔmɛ tan ni duuru = 75 FCFA");

    // dɔ n'est PAS un numéral : c'est l'indéfini « un certain / quelqu'un ».
    eq(extraireNombreBambara("dɔ"), null, "dɔ seul → null (pas un numéral)");
    eq(extraireNombreBambara("mɔgɔ dɔ nana"), null, "« quelqu'un est venu » → aucun montant");
    ok(!contientNombreBambara("dɔ"), "dɔ n'est pas détecté comme mot numérique");

    // Pas de nombre = pas de montant, avant comme après.
    eq(extraireNombreBambara("aucun nombre ici"), null, "pas de nombre → null");
    eq(extraireNombreBambara(""), null, "chaîne vide → null");
    ok(!contientNombreBambara("bonjour tamati"), "pas de faux positif sur mots ordinaires");

    // La normalisation des dizaines attachées ne coupe QUE les formes attestées.
    eq(extraireNombreBambara("bitiki"), null, "« bitiki » (boutique) n'est pas coupé en bi + tiki");
    eq(extraireNombreBambara("bi"), null, "« bi » seul (aujourd'hui) n'est pas un nombre");
  }

  console.log("\n[D] Traçabilité — chaque forme porte sa variété ET sa source");
  {
    const lex = (M as Record<string, unknown>).LEXIQUE_MANDINGUE as
      | ReadonlyArray<{ forme: string; valeur: number; variete: string; source: string }>
      | undefined;
    ok(Array.isArray(lex) && lex.length > 0, "LEXIQUE_MANDINGUE est exporté et non vide");
    if (Array.isArray(lex)) {
      ok(lex.every(e => e.forme && typeof e.valeur === "number" && e.variete && e.source),
        "toute entrée a forme + valeur + variété + source (aucune forme sans attestation)");
      const looru = lex.filter(e => e.forme === "looru");
      ok(looru.length > 0 && looru.every(e => e.valeur === 5),
        "looru est déclaré, valeur 5");
      ok(looru.some(e => e.variete === "dioula-ci"), "looru attesté en variété dioula-ci");
      const duuru = lex.filter(e => e.forme === "duuru");
      ok(duuru.some(e => e.variete === "bambara"), "duuru reste attesté en bambara");
      ok(duuru.length > 1, "duuru a plusieurs entrées : aucune forme n'appartient à UNE seule variété");
      ok(!lex.some(e => e.forme === "do"), "dɔ n'est enregistré nulle part comme forme numérique");
    }
  }

  console.log("\n[E] Normalisation orthographique (rappel)");
  {
    eq(normaliserBambara("Kɔnɔtɔ"), "konoto", "ɔ → o, minuscules");
    eq(normaliserBambara("biwɔɔrɔ"), "biwooro", "l'attachée arrive bien en ascii");
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
