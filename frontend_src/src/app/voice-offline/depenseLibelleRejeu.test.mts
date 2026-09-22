/**
 * DEP-01 — LE LIBELLÉ D'UNE DÉPENSE SURVIT AU REJEU HORS LIGNE.
 * Lancer : npm run test:depense-libelle   (tsx, store mémoire, sans IndexedDB)
 *
 * CE QUE CE TEST PROUVE, ET CE QU'IL NE PROUVE PAS
 * ------------------------------------------------
 * Il rejoue la VRAIE file (`enfilerOperation` + `synchroniser`, store mémoire)
 * et regarde le corps RÉELLEMENT posté. Il ne peut pas ouvrir la base : la
 * persistance est prouvée par l'invariant backend
 * `backend/test/invariants/dep-01-libelle-depense.spec.ts`. Ce qu'il prouve
 * ici, c'est le maillon que l'invariant backend ne voit pas : le corps qui
 * sort de la file porte le motif SOUS UN NOM QUE LE SERVEUR LIT.
 *
 * Les deux bouts sont LUS DANS LE CODE, jamais recopiés à la main — sinon le
 * test dirait seulement que je sais recopier :
 *   • le payload de dépense est lu dans `CaisseContext.tsx` (quel champ porte
 *     le motif quand la marchande appuie sur « Enregistrer ») ;
 *   • les champs que le serveur accepte pour ce motif sont lus dans
 *     `caisse-rest.controller.ts` (ce que `description:` va réellement
 *     chercher dans le corps de la requête).
 * Si l'un des deux bouge, ce test bouge avec lui.
 *
 * LE DÉFAUT QU'IL ATTRAPE : le téléphone envoie `notes`, le serveur lit
 * `description`. Le motif tombe dans le vide, sans erreur — à la saisie comme
 * au rejeu d'une file hors ligne, qui repousse le payload tel quel.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as oc from "./offlineCaisse.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..", "..", "..", "..");
const F_CONTEXTE = join(RACINE, "frontend_src/src/app/contexts/CaisseContext.tsx");
const F_API = join(RACINE, "frontend_src/src/app/services/api/caisse-api.ts");
const F_CONTROLEUR = join(RACINE, "backend/src/caisse-rest/caisse-rest.controller.ts");

// ── Lecture du code réel ────────────────────────────────────────────────────

/** Les clés du payload que `CaisseContext.enregistrerDepense` construit. */
function clesDuPayloadDepense(): string[] {
  const src = readFileSync(F_CONTEXTE, "utf8");
  const m = src.match(/const payload:\s*caisseApi\.EnregistrerDepenseData\s*=\s*\{([^}]*)\}/);
  if (!m) throw new Error("payload de dépense introuvable dans CaisseContext.tsx");
  return m[1].split(",").map((p) => p.split(":")[0].trim()).filter(Boolean);
}

/** Le corps du gestionnaire `POST /caisse/depense`, jusqu'au décorateur suivant. */
function gestionnaireDepense(): string {
  const src = readFileSync(F_CONTROLEUR, "utf8");
  const i = src.indexOf("async enregistrerDepense(");
  if (i === -1) throw new Error("gestionnaire enregistrerDepense introuvable dans le contrôleur");
  const j = src.indexOf("\n  @", i);
  return src.slice(i, j === -1 ? src.length : j);
}

/** L'expression affectée à `description:` dans ce gestionnaire, jusqu'à la
 *  virgule de premier niveau (parenthèses, crochets et accoladres appariés). */
function expressionDescription(handler: string): string {
  const k = handler.indexOf("description:");
  if (k === -1) throw new Error("aucune affectation `description:` dans le gestionnaire de dépense");
  let i = k + "description:".length;
  let par = 0, cro = 0, acc = 0;
  const debut = i;
  for (; i < handler.length; i++) {
    const c = handler[i];
    if (c === "(") par++; else if (c === ")") par--;
    else if (c === "[") cro++; else if (c === "]") cro--;
    else if (c === "{") acc++; else if (c === "}") acc--;
    else if (c === "," && par <= 0 && cro <= 0 && acc <= 0) break;
  }
  return handler.slice(debut, i);
}

/** Les champs du CORPS DE REQUÊTE que le serveur va chercher pour ce motif. */
function champsMotifLusParLeServeur(): string[] {
  const expr = expressionDescription(gestionnaireDepense());
  return [...new Set([...expr.matchAll(/body\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))];
}

// ── Le rejeu, avec la vraie file ────────────────────────────────────────────

const UID = "marchande-awa";
const MOTIF = "Transport marché — porteur de sacs";

/** Rejoue une file d'UNE opération et rend le corps réellement posté. */
async function rejouer(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const store = oc.memoryOutboxStore();
  await oc.enfilerOperation("/caisse/depense", payload, UID, store);
  let corps: Record<string, unknown> | null = null;
  const res = await oc.synchroniser(
    async (_endpoint, p) => { corps = p as Record<string, unknown>; },
    UID,
    store,
  );
  if (res.ok !== 1 || corps === null) throw new Error(`le rejeu n'a rien posté (ok=${res.ok})`);
  return corps;
}

/** Le motif est-il là, sous un nom que le serveur lit vraiment ? */
function motifRecu(corps: Record<string, unknown>, champsLus: string[]): boolean {
  return champsLus.some((c) => corps[c] === MOTIF);
}

async function run() {
  const cles = clesDuPayloadDepense();
  const champsLus = champsMotifLusParLeServeur();
  // CE QUI N'EST PAS UN MOTIF, et qui est écrit ici plutôt que deviné.
  //
  // T0 ne compte que les champs qui pourraient PORTER LE MOTIF : c'est la
  // duplication `notes` + `description` qu'il surveille. Le payload en porte
  // d'autres, qui disent autre chose — et ne pas les nommer reviendrait à
  // faire dire à T0 « le payload n'a qu'un champ », ce qui n'a jamais été son
  // propos et deviendrait faux au premier ajout légitime.
  //
  //   montant, idempotency_key : présents depuis DEP-01.
  //   categorie                : DEP-02 — la catégorie TOUCHÉE par la
  //                              marchande. Un identifiant fermé
  //                              (`taxe_mairie`), pas du texte libre : le
  //                              serveur le VÉRIFIE contre sa liste, et il ne
  //                              peut donc pas servir de second motif. Son
  //                              propre passage par la file est prouvé en T6.
  const PAS_UN_MOTIF = ["montant", "idempotency_key", "categorie"];
  const champMotif = cles.filter((c) => !PAS_UN_MOTIF.includes(c));

  console.log("\nCe que le code dit aujourd’hui :");
  console.log(`  payload de CaisseContext : { ${cles.join(", ")} }`);
  console.log(`  champs lus par le serveur pour le motif : ${champsLus.join(", ")}`);

  // T0 — les deux lectures ont du sens (sinon les tests suivants ne prouvent rien).
  ok(champMotif.length === 1, `T0 le payload de dépense porte UN seul champ de motif (${champMotif.join(", ") || "aucun"})`);
  ok(champsLus.length >= 1, "T0 le serveur va chercher au moins un champ du corps pour le motif");

  // T1 — LE CHEMIN RÉEL : ce que le téléphone met en file aujourd'hui, rejoué,
  // arrive-t-il au serveur sous un nom qu'il lit ? C'est DEP-01 tout entier.
  {
    const corps = await rejouer({ montant: 2000, [champMotif[0]]: MOTIF, idempotency_key: "dep-rejeu-1" });
    ok(motifRecu(corps, champsLus), "T1 le payload RÉEL de CaisseContext, rejoué, remet le motif sous un champ que le serveur lit");
    ok(corps.idempotency_key === "dep-rejeu-1", "T1 la clé d’idempotence traverse le rejeu (pas de double compte)");
    ok(typeof corps.date_operation === "string", "T1 la dépense rejouée porte toujours son jour comptable (ARGENT-1 intact)");
  }

  // T2 — LA FILE HÉRITÉE : des téléphones déjà installés portent des opérations
  // écrites avec `notes`. Les refuser perdrait le motif d'une dépense DÉJÀ
  // saisie. Elles doivent arriver, elles aussi, sous un nom que le serveur lit.
  {
    const corps = await rejouer({ montant: 1500, notes: MOTIF, idempotency_key: "dep-rejeu-2" });
    ok(motifRecu(corps, champsLus), "T2 une file hors ligne HÉRITÉE (payload `notes`) rejoue son motif sous un champ que le serveur lit");
  }

  // T3 — LE CONTRAT CANONIQUE : `description` est le nom de la colonne et de
  // l'entité. Une file écrite après la correction doit passer, évidemment.
  {
    const corps = await rejouer({ montant: 800, description: MOTIF, idempotency_key: "dep-rejeu-3" });
    ok(motifRecu(corps, champsLus), "T3 une file portant `description` rejoue son motif sous un champ que le serveur lit");
  }

  // T4 — UNE SEULE VÉRITÉ : le type de l'API dit le nom canonique. Sans cela,
  // le champ que le téléphone envoie resterait affaire de convention orale.
  {
    const api = readFileSync(F_API, "utf8");
    const bloc = api.match(/export interface EnregistrerDepenseData \{([\s\S]*?)\n\}/);
    ok(!!bloc && /(^|\s)description\??\s*:/.test(bloc[1]), "T4 `EnregistrerDepenseData` déclare `description`, le nom canonique");
  }

  // T5 — LE MOTIF NE SE PERD PAS EN SILENCE : une file rejouée sans aucun motif
  // reste légitime, mais elle ne doit pas faire croire qu'un motif est passé.
  {
    const corps = await rejouer({ montant: 300, idempotency_key: "dep-rejeu-4" });
    ok(!motifRecu(corps, champsLus), "T5 une dépense sans motif n’en invente pas un");
  }

  // T6 — DEP-02 : LA CATÉGORIE TRAVERSE LA FILE, ELLE AUSSI.
  //
  // Le motif a été perdu une première fois parce que personne ne regardait ce
  // qui SORT de la file. La catégorie emprunte exactement le même chemin : une
  // dépense notée au marché sans réseau dort dans la file et n'est rejouée que
  // des heures plus tard. Si elle se perdait là, le défaut serait le même,
  // simplement plus difficile à voir — l'écran afficherait « Catégorie pas
  // notée » sur une dépense que la marchande a bel et bien catégorisée.
  {
    const corps = await rejouer({
      montant: 2000, description: MOTIF, categorie: "taxe_mairie", idempotency_key: "dep-rejeu-5",
    });
    ok(corps.categorie === "taxe_mairie", "T6 la catégorie touchée traverse le rejeu hors ligne, telle quelle");
    ok(motifRecu(corps, champsLus), "T6 et le motif l’accompagne — la catégorie ne prend pas sa place");
  }

  // T7 — ET ELLE NE S'INVENTE PAS. Une file écrite avant DEP-02 n'a pas de
  // catégorie ; le rejeu ne doit pas lui en fabriquer une à partir du motif,
  // qui est précisément la faute fermée par DEP-02 côté écran.
  {
    const corps = await rejouer({ montant: 700, description: MOTIF, idempotency_key: "dep-rejeu-6" });
    ok(corps.categorie === undefined, "T7 une file d’avant DEP-02 rejoue SANS catégorie — on n’en déduit pas une du motif");
  }

  console.log(
    failures === 0
      ? "\nLe libellé de dépense traverse la file hors ligne ✅\n" +
        "  (la PERSISTANCE en base est prouvée à part, par l’invariant backend dep-01-libelle-depense.spec.ts)"
      : `\n${failures} test(s) en échec ❌`,
  );
  process.exit(failures ? 1 : 0);
}
run();
