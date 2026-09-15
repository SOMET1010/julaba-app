/**
 * Où l'application parle-t-elle ? — tests de `resoudreUrlApi`.
 * Lancer : npm run test:api-url   (tsx, sans DOM ni navigateur)
 *
 * CE QUE CE FICHIER PROTEGE, ET C'EST TOUT L'ENJEU DE LA PORTE ANDROID :
 * dans un APK, la page est servie par Capacitor depuis `localhost`. Un chemin
 * RELATIF comme « /api/v1 » y designe les fichiers embarques dans le
 * telephone, PAS un backend. Une application native qui retombe sur ce chemin
 * est une coquille : elle se lance, n'affiche aucune erreur, et aucune requete
 * n'atteint jamais un serveur.
 *
 * Le test central est donc une NEGATION : en natif, jamais « /api/v1 ».
 */
import { resoudreUrlApi, URL_API_NON_CONFIGUREE, API_URL } from "./api.js";

let failures = 0;
function eq(a: unknown, b: unknown, label: string) {
  if (JSON.stringify(a) === JSON.stringify(b)) console.log("  ✅", label);
  else { console.log("  ❌", label, `(attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`); failures++; }
}
function vrai(c: boolean, label: string) { eq(c, true, label); }

console.log("web — l'URL injectee au build gagne toujours");
eq(resoudreUrlApi({ viteApiUrl: "https://api.exemple.test/api/v1", plateforme: "web", hostname: "julaba-web.onrender.com" }),
   { url: "https://api.exemple.test/api/v1", natifSansConfiguration: false },
   "VITE_API_URL passe avant le filet onrender");
eq(resoudreUrlApi({ viteApiUrl: "  https://api.exemple.test/api/v1  ", plateforme: "web", hostname: "x" }).url,
   "https://api.exemple.test/api/v1", "espaces autour de VITE_API_URL ignores");

console.log("web — sans VITE_API_URL");
eq(resoudreUrlApi({ plateforme: "web", hostname: "julaba-web.onrender.com" }),
   { url: "https://julaba-api.onrender.com/api/v1", natifSansConfiguration: false },
   "production web : front et back sont sur DEUX domaines");
eq(resoudreUrlApi({ plateforme: "web", hostname: "localhost" }),
   { url: "/api/v1", natifSansConfiguration: false },
   "dev / meme domaine : chemin relatif (comportement historique inchange)");
eq(resoudreUrlApi({ viteApiUrl: "   ", plateforme: "web", hostname: "localhost" }).url,
   "/api/v1", "VITE_API_URL vide equivaut a absente");

console.log("natif — avec VITE_API_URL : rien de special");
for (const plateforme of ["android", "ios"] as const) {
  eq(resoudreUrlApi({ viteApiUrl: "https://api.exemple.test/api/v1", plateforme, hostname: "localhost" }),
     { url: "https://api.exemple.test/api/v1", natifSansConfiguration: false },
     `${plateforme} configure : l'URL du build, sans alerte`);
}

console.log("natif — SANS VITE_API_URL : panne bruyante, jamais de repli relatif");
for (const plateforme of ["android", "ios"] as const) {
  const r = resoudreUrlApi({ plateforme, hostname: "localhost" });
  vrai(r.natifSansConfiguration, `${plateforme} : le defaut de build est signale`);
  eq(r.url, URL_API_NON_CONFIGUREE, `${plateforme} : URL impossible et reconnaissable`);
  // LE test. Un APK qui repart sur « /api/v1 » tape sur ses propres fichiers.
  vrai(!r.url.startsWith("/"), `${plateforme} : JAMAIS un chemin relatif`);
  vrai(r.url !== "/api/v1", `${plateforme} : JAMAIS « /api/v1 »`);
}

console.log("l'URL de non-configuration ne peut pas resoudre par accident");
// `.invalid` est reserve par la RFC 2606 : aucun DNS ne le resoudra jamais.
vrai(/\.invalid(\/|$)/.test(new URL(URL_API_NON_CONFIGUREE).hostname + "/"),
     "domaine en .invalid (RFC 2606)");
vrai(!URL_API_NON_CONFIGUREE.includes("onrender.com"),
     "ne pointe vers aucun vrai backend");

console.log("le module s'importe hors Vite sans exploser");
// Sous tsx, `import.meta.env` n'existe pas. Si ce fichier a pu importer
// API_URL, c'est que la lecture est defensive — sinon rien ci-dessus n'aurait
// tourne. On verifie juste qu'il en sort une chaine utilisable.
vrai(typeof API_URL === "string" && API_URL.length > 0, "API_URL est une chaine non vide");

if (failures > 0) { console.log(`\n${failures} test(s) en échec.`); process.exit(1); }
console.log("\nTous les tests api-url sont verts ✅");
