/**
 * Garde-fou — L'UNITÉ SE DEMANDE AUSSI SUR L'ARTICLE LIBRE. VOIX-01, lot E (b).
 * Lancer : npm run test:choix-unite   (tsx, rendu statique, sans navigateur)
 *
 * CE TEST EST ROUGE À SA LIVRAISON, ET DOIT LE RESTER JUSQU'AU CÂBLAGE.
 * Le lot E livre le composant `ChoixUnite` mais n'a pas la main sur
 * `POSCaisse.tsx` (lot C). La partie [3] ci-dessous lit le source de la
 * caisse et ÉCHOUE tant que le chemin « montant libre » de la feuille « Autre
 * article » enregistre `unite: 'unite'` en dur au lieu de l'unité choisie.
 * C'est le contrat que l'intégrateur doit honorer — puis ajouter
 * `&& npm run test:choix-unite` à la fin de `verify`. Ne pas le faire passer
 * en assouplissant ce test : le trou serait simplement caché.
 *
 * LE DÉFAUT REPRODUIT. Une marchande vend un tas de gombo hors catalogue par
 * « Autre article » : rien ne lui demande l'unité, et son reçu dit
 * « 1 × gombo ». Le chemin voisin (adopter une référence) la demande. La
 * doctrine ne souffre pas d'exception : « L'unité est obligatoire partout ».
 *
 * Parties [1] et [2] : le composant lui-même — six unités, aucune cible sous
 * 44 px (règle tactile du dépôt), et la voix à la sélection.
 *
 * Ce que ce test NE prouve PAS : le rendu réel sur un téléphone (aucun
 * navigateur ici), ni que l'unité choisie arrive jusqu'au reçu — c'est
 * `test-unite-persistee` qui couvre le câblage panier → vente → reçu.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChoixUnite, UNITES_CHOIX, CIBLE_TACTILE_MIN, phraseUnite } from "./ChoixUnite.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}

console.log("\n[1] Les six unités de la caisse, toutes touchables");
{
  const html = renderToStaticMarkup(createElement(ChoixUnite, { valeur: "tas", onChoisir: () => {} }));
  const boutons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) || [];
  ok(boutons.length === 6, `six boutons rendus (obtenu ${boutons.length})`);
  for (const u of ["unité", "tas", "kg", "sac", "bassine", "régime"]) {
    ok(boutons.some((b) => b.endsWith(`>${u}</button>`)), `« ${u} » est proposée`);
  }
  ok(UNITES_CHOIX.length === 6, "UNITES_CHOIX exporte exactement ces six unités");
  const sous44 = boutons.filter((b) => {
    const m = /min-height:\s*(\d+)px/.exec(b);
    return !m || Number(m[1]) < CIBLE_TACTILE_MIN;
  });
  ok(sous44.length === 0, `aucun bouton sous ${CIBLE_TACTILE_MIN} px de haut (${sous44.length} en défaut)`);
  ok(boutons.every((b) => /type="button"/.test(b)), "type=\"button\" : jamais une soumission de formulaire par surprise");
  const presses = boutons.filter((b) => /aria-pressed="true"/.test(b));
  ok(presses.length === 1 && presses[0].endsWith(">tas</button>"), "l'unité retenue est marquée (aria-pressed), et elle seule");
}

console.log("\n[2] À la sélection : la valeur remonte, et Tata la dit");
{
  // Pas de DOM : on parcourt l'arbre d'éléments React et on appuie sur le
  // gestionnaire onClick du bouton, comme le ferait le navigateur.
  const choisies: string[] = [];
  const dites: string[] = [];
  const arbre = ChoixUnite({ valeur: "unité", onChoisir: (u) => choisies.push(u), dire: (t) => dites.push(t) });
  const boutons: ReactElement<{ onClick?: () => void; children?: ReactNode }>[] = [];
  const parcourir = (n: ReactNode) => {
    if (Array.isArray(n)) { n.forEach(parcourir); return; }
    if (!n || typeof n !== "object" || !("props" in n)) return;
    const el = n as ReactElement<{ children?: ReactNode; onClick?: () => void }>;
    if (el.type === "button") boutons.push(el);
    parcourir(el.props.children);
  };
  parcourir(arbre);
  const tas = boutons.find((b) => b.props.children === "tas");
  ok(tas !== undefined, "le bouton « tas » existe dans l'arbre");
  tas?.props.onClick?.();
  ok(choisies.length === 1 && choisies[0] === "tas", "onChoisir reçoit « tas »");
  ok(dites.length === 1 && dites[0] === "au tas", `Tata dit « au tas » (obtenu « ${dites[0]} »)`);
  ok(phraseUnite("kg") === "au kilo", "« kg » se DIT « au kilo » — on ne prononce pas une abréviation");
  ok(phraseUnite("unité") === "à l'unité" && phraseUnite("bassine") === "à la bassine", "les tournures sont celles du marché");

  // Sans `dire`, rien ne casse : la voix est un compagnon, pas une condition.
  const muet = ChoixUnite({ valeur: "unité", onChoisir: () => {} });
  boutons.length = 0; parcourir(muet);
  let erreur: unknown = null;
  try { boutons[1]?.props.onClick?.(); } catch (e) { erreur = e; }
  ok(erreur === null, "sans `dire`, la sélection fonctionne sans parler");
}

console.log("\n[3] CONTRAT D'INTÉGRATION — la caisse pose ce choix sur l'article libre (ROUGE tant que POSCaisse n'est pas câblé)");
{
  const src = readFileSync(fileURLToPath(new URL("./POSCaisse.tsx", import.meta.url)), "utf8");
  // Le code réel, pas ce que les commentaires racontent.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  // Le corps de `ajouterMontantLibre` : de sa déclaration à la première
  // ligne `  };` qui la ferme (indentation de niveau composant).
  const debut = code.indexOf("const ajouterMontantLibre");
  const fin = debut === -1 ? -1 : code.indexOf("\n  };", debut);
  const corps = debut !== -1 && fin !== -1 ? code.slice(debut, fin) : "";
  ok(corps.length > 0, "le chemin « montant libre » (ajouterMontantLibre) existe toujours dans POSCaisse");
  ok(corps.length > 0 && !/unite:\s*'unit[ée]'/.test(corps),
    "il n'enregistre PLUS `unite: 'unite'` en dur : l'unité vient de ce qu'elle a choisi");
  ok(/import\s*\{[^}]*\bChoixUnite\b[^}]*\}\s*from\s*'\.\/ChoixUnite'/.test(code),
    "POSCaisse importe ChoixUnite");
  ok(/<ChoixUnite\b/.test(code),
    "et le pose dans la feuille « Autre article »");
}

console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
if (failures > 0) process.exit(1);
