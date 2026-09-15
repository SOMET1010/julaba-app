/**
 * Résolution de l'URL du backend (inclusion : l'APK doit joindre le vrai
 * serveur même sans VITE_API_URL au build).
 * Lancer : npm run test:api-url   (tsx, sans DOM ni navigateur)
 */
import { resolveApiUrlPure, BACKEND_V2_URL } from "./api.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}

function main() {
  console.log("\n[1] VITE_API_URL injectée au build → toujours prioritaire");
  {
    eq(resolveApiUrlPure({ envVar: "https://exemple.test/api/v1" }), "https://exemple.test/api/v1", "valeur du build utilisée telle quelle");
    eq(resolveApiUrlPure({ envVar: "https://exemple.test/api/v1", hostname: "julaba-web.onrender.com", platformeCapacitor: "android" }), "https://exemple.test/api/v1", "prioritaire même sur le domaine web ou dans l'APK");
  }

  console.log("\n[2] Site web V2 sans VITE_API_URL → backend V2 connu");
  {
    eq(resolveApiUrlPure({ hostname: "julaba-web.onrender.com" }), BACKEND_V2_URL, "domaine web de prod → backend V2");
    eq(resolveApiUrlPure({ hostname: "autre-site.exemple.com" }), "/api/v1", "un autre domaine ne déclenche pas le filet web");
  }

  console.log("\n[3] APK Capacitor sans VITE_API_URL → LE défaut critique (bloquant avant ce correctif)");
  {
    // Avant ce correctif : un relatif "/api/v1" se résolvait contre l'origine
    // interne du WebView (localhost/file://), jamais le vrai backend — chaque
    // appel réseau échouait en silence dès l'installation de l'APK.
    eq(resolveApiUrlPure({ platformeCapacitor: "android" }), BACKEND_V2_URL, "Android sans VITE_API_URL → backend V2, pas un relatif inatteignable");
    eq(resolveApiUrlPure({ platformeCapacitor: "ios" }), BACKEND_V2_URL, "iOS sans VITE_API_URL → backend V2");
  }

  console.log("\n[4] Navigateur web ordinaire (dev, ou Capacitor.getPlatform() === 'web')");
  {
    eq(resolveApiUrlPure({ platformeCapacitor: "web" }), "/api/v1", "plateforme 'web' explicite → défaut relatif (proxy Vite en dev)");
    eq(resolveApiUrlPure({}), "/api/v1", "aucune info (SSR, tests) → défaut relatif, jamais une URL inventée");
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
