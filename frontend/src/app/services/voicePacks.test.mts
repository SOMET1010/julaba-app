// Tests des packs de voix (V1) — validation + résolution, module pur.
// Lancer :  npx tsx src/app/services/voicePacks.test.mts

import { validerManifeste, choisirPack, indexerClips } from "./voicePacks.js";

let failures = 0;
function ok(cond: boolean, label: string): void {
  if (cond) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

const MANIFESTE_VALIDE = {
  manifest_version: 1,
  packs: [
    {
      lang: "fr", voice: "tata_v2", pack_version: 3,
      base_url: "https://cdn.exemple.ci/voix/fr/tata_v2/3",
      clips: [
        { key: "intro_bienvenue", file: "intro_bienvenue.mp3", texte: "Bonjour, je suis Tata." },
        { key: "vente_enregistree", file: "/vente_ok.mp3" },
      ],
    },
    {
      lang: "fr", voice: "tata_v2", pack_version: 2,
      base_url: "https://cdn.exemple.ci/voix/fr/tata_v2/2/",
      clips: [{ key: "intro_bienvenue", file: "vieux.mp3" }],
    },
    {
      lang: "dyu", voice: "tata_v1", pack_version: 1,
      base_url: "https://cdn.exemple.ci/voix/dyu/tata_v1/1/",
      clips: [{ key: "intro_bienvenue", file: "dyu.mp3" }],
    },
  ],
};

function main(): void {
  console.log("\n[1] Validation");
  ok(validerManifeste(MANIFESTE_VALIDE) !== null, "manifeste complet accepté");
  ok(validerManifeste(null) === null, "null refusé");
  ok(validerManifeste("pas un objet") === null, "chaîne refusée");
  ok(validerManifeste({ packs: [] }) === null, "manifest_version manquant refusé");
  ok(validerManifeste({ manifest_version: 1 }) === null, "packs manquants refusés");

  console.log("\n[2] Sécurité des URLs — un manifeste ne peut pas faire sortir l'appli du web");
  const louche = validerManifeste({
    manifest_version: 1,
    packs: [
      { lang: "fr", voice: "v", pack_version: 1, base_url: "file:///etc", clips: [{ key: "a", file: "a.mp3" }] },
      { lang: "fr", voice: "v", pack_version: 1, base_url: "https://ok.ci/p/1", clips: [
        { key: "traverse", file: "../../secret.mp3" },
        { key: "absolue", file: "https://ailleurs.com/x.mp3" },
        { key: "bon", file: "bon.mp3" },
      ] },
    ],
  });
  ok(louche !== null, "le manifeste survit aux entrées louches");
  ok(louche!.packs.length === 1, "pack base_url non-http écarté");
  ok(louche!.packs[0].clips.length === 1 && louche!.packs[0].clips[0].key === "bon",
     "clips « .. » et URL absolue écartés, le clip sain reste");

  console.log("\n[3] Choix du pack");
  const m = validerManifeste(MANIFESTE_VALIDE)!;
  ok(choisirPack(m, "fr")?.pack_version === 3, "fr → la version la plus haute (3)");
  ok(choisirPack(m, "dyu")?.pack_version === 1, "dyu → son pack");
  ok(choisirPack(m, "bci") === null, "langue absente → null");

  console.log("\n[4] Résolution des URLs (slashs propres)");
  const idx = indexerClips(choisirPack(m, "fr")!);
  ok(idx.get("intro_bienvenue")?.url === "https://cdn.exemple.ci/voix/fr/tata_v2/3/intro_bienvenue.mp3",
     "base sans slash final + fichier simple");
  ok(idx.get("vente_enregistree")?.url === "https://cdn.exemple.ci/voix/fr/tata_v2/3/vente_ok.mp3",
     "fichier avec slash de tête → pas de double slash");
  ok(idx.get("intro_bienvenue")?.texte === "Bonjour, je suis Tata.", "texte du clip transporté");
  ok(idx.get("inconnue") === undefined, "clé inconnue → absente (l'appelant retombe sur l'embarqué)");

  console.log(failures === 0 ? "\nTous les tests voicePacks passent." : `\n${failures} échec(s).`);
  if (failures > 0) process.exit(1);
}

main();
