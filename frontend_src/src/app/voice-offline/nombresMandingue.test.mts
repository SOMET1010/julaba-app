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
import * as CONTRAT from "./perteSemantique.js";

/** Le porteur `Parsed<T>`, lu en structurel (le test ne dépend pas de son import de type). */
type ParsedLike<T> = {
  resolved: boolean;
  value?: T;
  loss?: { kind: string; candidates?: readonly string[] };
  candidates?: readonly T[];
};

const { extraireNombreBambara, contientNombreBambara, normaliserBambara } = M;

/** Forme portée par le module (lue en structurel : le test ne dépend pas de son import de type). */
type ExprMon = {
  value: number;
  unit: "DOROME" | "FRANC" | null;
  resolution?: string;
  cleClarification?: string;
};

/**
 * CORPUS — « Les 100 mots les plus utilisés en dioula de Côte d'Ivoire ».
 *
 * La page en PUBLIE 90, avec des rangs jusqu'à 98 et des ex æquo (kà, ní, yé
 * apparaissent plusieurs fois dans la source, et sont conservés tels quels).
 *
 *   « Je ne fabriquerais donc pas dix entrées pour obtenir artificiellement
 *     100. » — Patrick
 *
 * Même doctrine que le refus de remplir des cellules sans base : on ne complète
 * pas pour atteindre un chiffre rond. 90 publiées, 90 enregistrées, orthographe
 * de la source.
 *
 * ARCHIVÉ, PAS BRANCHÉ (décision de Patrick, confirmée deux fois) : `san`,
 * `feere`, `da`/`sɔngɔ`, `wari`, `warimisɛn` (monnaie, pièces) et le
 * marchandage sont un corpus attesté NON EXÉCUTABLE. Ils sont ici comme
 * matière de test négatif, et nulle part ailleurs. Aucun branchement.
 */
const CORPUS_FREQUENT: readonly string[] = [
  "á", "à", "áa", "Ala", "àle", "án", "àyiwa", "báara", "bán", "bé",
  "bɛ́ɛ", "bóro", "bɔ̀", "cɛ̀", "cógo", "dén", "dɛ", "dí", "dɔ̀n", "dɔ́ɔnin",
  "dùgu", "fána", "fèere", "fèn", "fɛ̀", "fó", "fɔɔ", "gwɛ̀lɛ", "í", "ká",
  "kà", "kà", "kélen", "kɛ̀", "kɛ̀mɛ", "kò", "kósɔbɛ", "kósɔn", "kɔ́mi", "kɔ̀ni",
  "kɔ́nɔ", "lá", "lò", "lón", "lɔ́n", "má", "mà", "mɛ", "mɛ́n", "mín",
  "mɔ̀gɔ", "mùn", "mùso", "n", "nà", "ní", "ní", "ní", "nín", "ɲi",
  "ɲíni", "ɲúman", "ó", "ò", "ɔ̀nhɔ́n", "sà", "sàn", "sé", "sisan", "sɔ̀rɔ",
  "tà", "tága", "tán", "tèn", "tɛ́", "tó", "tùbabu", "tùma", "tùn", "ù",
  "wà", "wári", "wúli", "yàn", "yé", "yé", "yé", "yèn", "yɛ̀rɛ", "yɔ́rɔ",
];

/**
 * B — formes du corpus qui SONT légitimement des nombres. Un test naïf les
 * mettrait en négatif absolu et serait faux.
 */
const B_NOMBRES: readonly string[] = ["kélen", "tán", "kɛ̀mɛ"];

/** Ce que rend `recognizeNumber` (lu en structurel, comme le reste du module). */
type Reconnaissance = {
  kind: "NUMBER" | "AMBIGUOUS";
  value?: number;
  confidence?: string;
  candidates?: ReadonlyArray<{ kind: string; value?: number; meaning?: string }>;
};

/**
 * Collisions CONNUES entre le corpus et le lexique existant : `tà` (prendre)
 * tombe sur `ta` = 10, `wà` (particule interrogative) sur `wa` = 1000. Ces
 * deux formes du lexique sont antérieures et leur retrait est interdit.
 * Le test prouve que la collision ne franchit PAS l'étage monétaire.
 */
const COLLISIONS: readonly string[] = ["tà", "wà"];

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

  console.log("\n[F] L'ARGENT — un nombre nu ne devient JAMAIS un montant tout seul");
  {
    const lire = (M as Record<string, unknown>).lireExpressionMonetaire as
      | ((t: string) => ExprMon | null) | undefined;
    const resoudre = (M as Record<string, unknown>).resoudreMontant as
      | ((e: ExprMon) => { fcfa: number; value: number; unit: string } | null) | undefined;
    const avecUnite = (M as Record<string, unknown>).resoudreAvecUnite as
      | ((e: ExprMon, u: "DOROME" | "FRANC") => { fcfa: number; value: number }) | undefined;
    const valeurLex = (M as Record<string, unknown>).valeurLexicaleMandingue as
      | ((t: string) => number | null) | undefined;

    ok(typeof lire === "function", "lireExpressionMonetaire est exporté");
    ok(typeof resoudre === "function", "resoudreMontant est exporté");
    ok(typeof avecUnite === "function", "resoudreAvecUnite est exporté");
    ok(typeof valeurLex === "function", "valeurLexicaleMandingue est exporté");

    if (lire && resoudre && avecUnite && valeurLex) {
      // ── L'invariant central, les deux cas côte à côte ──────────────────
      // « mugan » : lexicalement 20, monétairement NON RÉSOLU, écriture INTERDITE.
      const nu = lire("mugan")!;
      eq(nu.value, 20, "mugan : la valeur lexicale est 20");
      eq(nu.unit, null, "mugan : AUCUNE unité — le dɔrɔmɛ est le plus souvent omis au marché");
      eq(nu.resolution, "REQUIRES_CLARIFICATION", "mugan : clarification REQUISE");
      eq(resoudre(nu), null, "mugan : AUCUN montant FCFA ne peut en sortir");
      eq(nu.cleClarification, "TATA_AMBIGUITE_DOROME", "la question passe par une CLÉ de catalogue, jamais une phrase en dur");
      eq((nu as { fcfa?: number }).fcfa, undefined, "aucun champ fcfa, même absent de valeur par défaut");

      // « dɔrɔmɛ mugan » : lexicalement 20 AUSSI, unité DOROME, 100 FCFA certain.
      const dor = lire("dɔrɔmɛ mugan")!;
      eq(dor.value, 20, "dɔrɔmɛ mugan : la valeur lexicale reste 20 — c'est l'UNITÉ qui change le sens");
      eq(dor.unit, "DOROME", "dɔrɔmɛ mugan : unité DOROME");
      eq(resoudre(dor)!.fcfa, 100, "dɔrɔmɛ mugan = 100 FCFA, certain");

      // L'invariant de Patrick, mot pour mot.
      eq(valeurLex("kɛmɛ"), 100, "valeurLexicaleMandingue('kɛmɛ') === 100 — la valeur du mot ne bouge pas");
      eq(valeurLex("dɔrɔmɛ kɛmɛ"), 100, "valeurLexicaleMandingue('dɔrɔmɛ kɛmɛ') === 100 AUSSI — la valeur ne bouge JAMAIS");
      eq(resoudre(lire("dɔrɔmɛ kɛmɛ")!)!.fcfa, 500, "lireExpressionMonetaire('dɔrɔmɛ kɛmɛ').fcfa === 500 — l'unité, elle, change tout");

      // ── Le cas de tomates de la source, celui qui coûte cinq fois ──────
      // « 100 F de tomates » se dit « mugan » au marché. Lire 20 F serait
      // enregistrer le cinquième de la vente, en silence.
      eq(resoudre(lire("mugan")!), null, "« mugan » pour 100 F de tomates : on ne devine pas, on DEMANDE");
      eq(avecUnite(lire("mugan")!, "DOROME").fcfa, 100, "la marchande répond « dɔrɔmɛ » → 100 FCFA");
      eq(avecUnite(lire("mugan")!, "FRANC").fcfa, 20, "elle répond « francs » → 20 FCFA");
      eq(avecUnite(lire("mugan")!, "DOROME").value, 20, "la VALEUR déjà comprise est conservée : on n'a demandé que l'unité");

      // ── Le marqueur français explicite lève l'ambiguïté dans le bon sens ─
      const fr = lire("mugan francs")!;
      eq(fr.unit, "FRANC", "« mugan francs » : marqueur explicite → FRANC");
      eq(resoudre(fr)!.fcfa, 20, "« mugan francs » = 20 FCFA");

      // ── Table attestée (Coast Systems) : dɔrɔmɛ kelen = 5 FCFA ─────────
      const table: ReadonlyArray<[string, number]> = [
        ["dɔrɔmɛ kelen", 5], ["dɔrɔmɛ fila", 10], ["dɔrɔmɛ saba", 15],
        ["dɔrɔmɛ naani", 20], ["dɔrɔmɛ looru", 25], ["dɔrɔmɛ duuru", 25],
        ["dɔrɔmɛ tan", 50], ["dɔrɔmɛ mugan", 100], ["dɔrɔmɛ bi looru", 250],
        ["dɔrɔmɛ bi duuru", 250], ["dɔrɔmɛ kɛmɛ", 500], ["dɔrɔmɛ kɛmɛ fila", 1000],
        ["dɔrɔmɛ kɛmɛ looru", 2500], ["dɔrɔmɛ waa kelen", 5000],
        ["dɔrɔmɛ waga kelen", 5000], ["dɔrɔmɛ waa fila", 10000],
        ["dɔrɔmɛ waga fila", 10000],
      ];
      for (const [phrase, fcfa] of table) {
        const e = lire(phrase);
        const r = e ? resoudre(e) : null;
        eq(r ? r.fcfa : null, fcfa, `${phrase} = ${fcfa} FCFA`);
      }

      // ── Rien à lire n'est PAS une incertitude ──────────────────────────
      eq(lire("aucun nombre ici"), null, "pas de nombre → null (et non « incertain »)");
      eq(lire("dɔ"), null, "« dɔ » ne produit ni nombre ni incertitude");
    }
  }

  console.log("\n[G] CORPUS des mots fréquents du dioula de Côte d'Ivoire");
  {
    // La page annoncée « les 100 mots les plus utilisés » en PUBLIE 90, avec des
    // rangs jusqu'à 98 et des ex æquo.
    // « Je ne fabriquerais donc pas dix entrées pour obtenir artificiellement 100. »
    // (Patrick) — même doctrine que le refus de remplir des cellules sans base.
    eq(CORPUS_FREQUENT.length, 90, "le corpus compte les 90 formes PUBLIÉES, pas 100 fabriquées");
    eq(new Set(CORPUS_FREQUENT).size, 85, "85 formes distinctes (les ex æquo kà, ní, yé sont listés tels quels)");

    const lire = (M as Record<string, unknown>).lireExpressionMonetaire as
      | ((t: string) => ExprMon | null) | undefined;
    const resoudre = (M as Record<string, unknown>).resoudreMontant as
      | ((e: ExprMon) => { fcfa: number } | null) | undefined;
    const fcfaDe = (mot: string): number | null => {
      if (!lire || !resoudre) return null;
      const e = lire(mot);
      const r = e ? resoudre(e) : null;
      return r ? r.fcfa : null;
    };

    // ── A. CORPUS_NEGATIF_ABSOLU ───────────────────────────────────────
    // Ni nombre, ni montant. Pièges inclus : sàn (acheter), fèere (vendre),
    // wári (argent) sont fréquents et tentants — ils ne déclenchent RIEN.
    const A = CORPUS_FREQUENT.filter(m => !B_NOMBRES.includes(m) && !COLLISIONS.includes(m));
    eq(new Set(A).size, 80, "A · CORPUS_NEGATIF_ABSOLU : 80 formes distinctes");
    const fautifs = A.filter(m => extraireNombreBambara(m) !== null || fcfaDe(m) !== null);
    eq(fautifs, [], "A · aucune de ces formes ne produit de nombre ni de montant");
    for (const piege of ["sàn", "fèere", "wári"]) {
      eq(extraireNombreBambara(piege), null, `A · piège « ${piege} » : aucun nombre`);
      eq(fcfaDe(piege), null, `A · piège « ${piege} » : aucun montant`);
    }

    // ── B. CORPUS_NOMBRE_SANS_OPERATION ────────────────────────────────
    // kélen, tán, kɛ̀mɛ SONT légitimement des nombres : un test naïf qui les
    // mettrait en A serait faux. Ils produisent une VALEUR, jamais une
    // écriture comptable à eux seuls.
    eq(B_NOMBRES.length, 3, "B · trois formes du corpus sont de vrais nombres");
    for (const [mot, valeur] of [["kélen", 1], ["tán", 10], ["kɛ̀mɛ", 100]] as ReadonlyArray<[string, number]>) {
      eq(extraireNombreBambara(mot), valeur, `B · « ${mot} » vaut ${valeur} lexicalement`);
      eq(fcfaDe(mot), null, `B · « ${mot} » seul ne produit AUCUN montant FCFA`);
    }

    // ── C. MONNAIE_EXPLICITE ───────────────────────────────────────────
    // Le même mot, précédé de dɔrɔmɛ, devient une somme certaine.
    eq(fcfaDe("dɔrɔmɛ kélen"), 5, "C · dɔrɔmɛ kélen = 5 FCFA");
    eq(fcfaDe("dɔrɔmɛ tán"), 50, "C · dɔrɔmɛ tán = 50 FCFA");
    eq(fcfaDe("dɔrɔmɛ kɛ̀mɛ"), 500, "C · dɔrɔmɛ kɛ̀mɛ = 500 FCFA");

    // ── HOMOGRAPHES TONALS — le ton tranche quand il est là ────────────
    // `tà` (prendre) et `wà` (particule interrogative) tombaient sur des formes
    // du lexique (`ta` = 10, `wa` = 1000) qu'il est INTERDIT de retirer : les
    // retirer ferait perdre une capacité attestée sans résoudre le défaut.
    // Le défaut était dans la NORMALISATION, qui détruisait le ton en silence.
    for (const mot of COLLISIONS) {
      eq(extraireNombreBambara(mot), null, `« ${mot} » porte son ton : ce n'est PAS un nombre`);
      eq(fcfaDe(mot), null, `« ${mot} » : AUCUN montant`);
    }

    // ── ET LE CAS RÉEL : l'ASR ne transcrit pas les tons ───────────────
    // C'est le groupe qui compte le plus. Quand le ton est absent, on NE
    // TRANCHE PAS en faveur du nombre — on conserve l'ambiguïté.
    const reconnaitre = (M as Record<string, unknown>).recognizeNumber as
      | ((m: string) => Reconnaissance | null) | undefined;
    ok(typeof reconnaitre === "function", "recognizeNumber est exporté");
    if (reconnaitre) {
      for (const h of [["tà", "ta", 10, "prendre"], ["wà", "wa", 1000, "particule interrogative"]] as ReadonlyArray<[string, string, number, string]>) {
        const [tonee, nue, valeur, sens] = h;
        eq(reconnaitre(tonee), null, `recognizeNumber('${tonee}') → null : le ton tranche`);
        const r = reconnaitre(nue)!;
        eq(r.kind, "AMBIGUOUS", `recognizeNumber('${nue}').kind === 'AMBIGUOUS' — ce que l'ASR rendra`);
        eq(r.candidates![0], { kind: "NUMBER", value: valeur }, `'${nue}' : candidat numérique ${valeur}`);
        eq(r.candidates![1], { kind: "LEXICAL", meaning: sens }, `'${nue}' : candidat lexical « ${sens} »`);
        eq((r as { value?: number }).value, undefined, `'${nue}' : aucune valeur directe — il faut regarder .kind`);
      }
      // Un nombre sans homographe reste CERTAIN : on n'a pas rendu tout flou.
      eq(reconnaitre("tan"), { kind: "NUMBER", value: 10, confidence: "CERTAIN" }, "recognizeNumber('tan') reste CERTAIN");
      eq(reconnaitre("looru"), { kind: "NUMBER", value: 5, confidence: "CERTAIN" }, "recognizeNumber('looru') reste CERTAIN");
      eq(reconnaitre("fèere"), null, "recognizeNumber('fèere') → null : pas un nombre");
    }

    // ── La normalisation TRANSPORTE sa perte ───────────────────────────
    const avecPertes = (M as Record<string, unknown>).normaliserAvecPertes as
      | ((t: string) => { texte: string; pertes: ReadonlyArray<{ origine: string; rabattue: string; sens: string }> }) | undefined;
    ok(typeof avecPertes === "function", "normaliserAvecPertes est exporté");
    if (avecPertes) {
      eq(avecPertes("kɛmɛ").pertes, [], "rien de perdu sur « kɛmɛ »");
      const p = avecPertes("à tà wári");
      eq(p.pertes.length, 1, "« tà » : la perte est SIGNALÉE, pas cachée");
      eq(p.pertes[0], { origine: "tà", rabattue: "ta", sens: "prendre" }, "la perte dit quoi, vers quoi, et pourquoi");
    }

    // La propriété de sécurité centrale, sur le corpus ENTIER.
    const montants = CORPUS_FREQUENT.filter(m => fcfaDe(m) !== null);
    eq(montants, [], "AUCUN mot nu du corpus — même parfaitement reconnu — ne devient un montant FCFA");
  }

  console.log("\n[H] CONTRAT DE PERTE SÉMANTIQUE — la règle d'architecture");
  {
    // « Toute information qui a une incidence sur l'argent doit être soit
    //   conservée, soit explicitement marquée comme perdue ; jamais
    //   reconstruite implicitement en aval. »
    const normContrat = (M as Record<string, unknown>).normaliserSousContrat as
      | ((t: string) => ParsedLike<string>) | undefined;
    const montantContrat = (M as Record<string, unknown>).lireMontantSousContrat as
      | ((t: string) => ParsedLike<{ fcfa: number; unit: string }> | null) | undefined;
    const frontiere = (M as Record<string, unknown>).montantEcrituresAutorisees as
      | ((m: { fcfa: number }) => number) | undefined;

    ok(typeof normContrat === "function", "normaliserSousContrat est exporté");
    ok(typeof montantContrat === "function", "lireMontantSousContrat est exporté");
    ok(typeof frontiere === "function", "montantEcrituresAutorisees est exporté (frontière financière)");

    if (normContrat && montantContrat && frontiere) {
      // ── TONE_DROPPED : une normalisation qui perd ne rend PAS le même type ─
      const propre = normContrat("kɛmɛ");
      eq(propre.resolved, true, "« kɛmɛ » : rien de perdu → resolved");
      eq(propre.value, "keme", "« kɛmɛ » : la valeur est accessible");

      const perdue = normContrat("tà");
      eq(perdue.resolved, false, "« tà » : un ton rabattu → NON résolu");
      eq(perdue.loss!.kind, "TONE_DROPPED", "la perte est nommée TONE_DROPPED");
      eq(perdue.value, undefined, "sur la branche non résolue, .value N'EXISTE PAS");
      ok((perdue.loss!.candidates ?? []).includes("ta"), "TONE_DROPPED dit sur quoi on rabattait (« ta »)");
      ok((perdue.loss!.candidates ?? []).includes("prendre"), "TONE_DROPPED dit ce que c'était (« prendre »)");
      ok((perdue.candidates ?? []).length === 2, "les deux lectures possibles sont portées");

      // ── UNIT_MISSING : le nombre nu, sous contrat ──────────────────────
      const nu = montantContrat("mugan")!;
      eq(nu.resolved, false, "« mugan » : NON résolu");
      eq(nu.loss!.kind, "UNIT_MISSING", "la perte est nommée UNIT_MISSING");
      eq(nu.value, undefined, "« mugan » : aucun .value à lire par accident");
      eq((nu.candidates ?? []).map(c => c.fcfa), [20, 100], "les DEUX lectures réelles sont portées : 20 F ou 100 F");

      const certain = montantContrat("dɔrɔmɛ mugan")!;
      eq(certain.resolved, true, "« dɔrɔmɛ mugan » : résolu");
      eq(certain.value!.fcfa, 100, "« dɔrɔmɛ mugan » = 100 FCFA");

      eq(montantContrat("aucun nombre ici"), null, "rien à lire n'est PAS une perte");

      // ── La frontière financière n'accepte que du résolu ────────────────
      eq(frontiere(certain.value!), 100, "la frontière accepte un MontantResolu");
      // Et la branche non résolue n'a pas de .value à lui passer : c'est le
      // compilateur qui l'interdit, pas une convention. On le constate ici.
      eq((nu as { value?: unknown }).value, undefined, "aucun montant ne peut franchir la frontière sans résolution explicite");
    }

    // Les helpers du contrat lui-même.
    const C = CONTRAT as Record<string, unknown>;
    const valeurResolue = C.valeurResolue as (<T>(p: ParsedLike<T>) => T | null) | undefined;
    const resoudreAvecCandidat = C.resoudreAvecCandidat as
      (<T>(p: ParsedLike<T>, c: T, e?: (a: T, b: T) => boolean) => T | null) | undefined;
    ok(typeof valeurResolue === "function", "valeurResolue est exporté");
    if (valeurResolue && resoudreAvecCandidat && montantContrat) {
      const nu = montantContrat("mugan")!;
      eq(valeurResolue(nu), null, "valeurResolue d'une perte → null : pas de repli, pas de premier candidat");
      const choisi = (nu.candidates ?? []).find(c => c.unit === "DOROME")!;
      eq(resoudreAvecCandidat(nu, choisi)!.fcfa, 100, "résoudre en NOMMANT le candidat retenu : 100 FCFA");
      eq(resoudreAvecCandidat(nu, { fcfa: 999, unit: "FRANC" }), null, "on ne résout JAMAIS vers une valeur inventée");
    }
  }

  console.log("\n[I] L'API TYPÉE — value + unit conservés de bout en bout");
  {
    const parseNum = (M as Record<string, unknown>).parseMandingueNumericExpression as
      | ((t: string) => ParsedLike<number> | null) | undefined;
    const parseMoney = (M as Record<string, unknown>).parseMandingueMonetaryExpression as
      | ((t: string) => ParsedLike<{ kind: string; value: number; unit: string }> | null) | undefined;
    const resolveMoney = (M as Record<string, unknown>).resolveMoney as
      | ((e: { value: number; unit: string }) => { amount: number; currency: string }) | undefined;

    ok(typeof parseNum === "function", "parseMandingueNumericExpression est exporté");
    ok(typeof parseMoney === "function", "parseMandingueMonetaryExpression est exporté");
    ok(typeof resolveMoney === "function", "resolveMoney est exporté");

    if (parseNum && parseMoney && resolveMoney) {
      eq(parseNum("kɛmɛ")!.value, 100, "parseMandingueNumericExpression('kɛmɛ') → 100, résolu");
      eq(parseNum("tà")!.resolved, false, "« tà » : le nombre aussi porte sa perte");
      eq(parseNum("aucun nombre ici"), null, "pas de nombre → null");

      // Le point central : value vaut 100, JAMAIS 500.
      const dor = parseMoney("dɔrɔmɛ kɛmɛ")!;
      eq(dor.resolved, true, "« dɔrɔmɛ kɛmɛ » : résolu");
      eq(dor.value!.kind, "MONETARY_EXPRESSION", "la forme se nomme MONETARY_EXPRESSION");
      eq(dor.value!.value, 100, "value === 100 — la conversion n'est PAS repliée dans la valeur");
      eq(dor.value!.unit, "DOROME", "unit === 'DOROME' — l'unité voyage avec la valeur");
      eq(resolveMoney(dor.value!), { amount: 500, currency: "XOF" }, "resolveMoney → { amount: 500, currency: 'XOF' }");

      // Et le nombre nu reste non résolu, avec ses deux lectures.
      const nu = parseMoney("mugan")!;
      eq(nu.resolved, false, "« mugan » : NON résolu");
      eq(nu.loss!.kind, "UNIT_MISSING", "UNIT_MISSING");
      eq((nu.candidates ?? []).map(c => resolveMoney(c).amount), [20, 100], "les deux lectures : 20 F ou 100 F");
      eq(nu.value, undefined, "aucune valeur lisible sans résoudre");
    }

    // La legacy est marquée, et son défaut est toujours là — c'est pour ça
    // que l'interdiction est mécanique et pas seulement écrite.
    eq(extraireNombreBambara("dɔrɔmɛ kɛmɛ"), 500, "legacy : rend 500, un nombre nu qui a absorbé l'unité");
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
