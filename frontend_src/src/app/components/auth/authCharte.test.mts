/**
 * Garde-fou de source — UNE SEULE CHARTE POUR L'AUTH (AUTH-08, audit UI auth
 * 05/10/2026). Lancer : npm run test:auth-charte   (tsx, sans DOM)
 *
 * CE QU'ON FERME. L'audit avait compté ~70 couleurs hexadécimales écrites en
 * dur dans les écrans d'authentification, sans aucun garde équivalent à
 * `caisseCharte` : rien n'empêchait un correctif d'en ajouter une 71ᵉ, ni un
 * écran de diverger des autres. Ce fichier rend le défaut BRUYANT.
 *
 * LA CHARTE EST FERMÉE. Chaque valeur ci-dessous est nommée, avec son rôle.
 * Une couleur ABSENTE de cette table fait échouer la garde — il faudra la
 * nommer ici (et donc la montrer), ou la remplacer par un jeton. Ce n'est pas
 * de la bureaucratie : c'est la règle « ne jamais donner deux sens à la même
 * donnée » appliquée aux teintes.
 *
 * LES JETONS D'ABORD. Les valeurs qui EXISTAIENT comme jetons sont migrées
 * (AUTH-08/16) : `--commerce-action`, `--commerce-surface`, `--commerce-paper`,
 * `--commerce-apricot`. Les surfaces ne portent plus de blanc pur en dur — le
 * mode sombre surcharge proprement les jetons, jamais des littéraux.
 *
 * LES BUDGETS SONT FIGÉS. Chaque fichier a un nombre maximal d'occurrences hex
 * (l'état mesuré à la clôture du lot). En réduire est un progrès — baisser le
 * budget le même commit. En ajouter sans baisser ailleurs échoue : une couleur
 * qui se multiplie est une charte qui se dilue.
 *
 * CE QU'IL NE DIT PAS : que l'écran RESSEMBLE à la maquette (ça se juge sur
 * captures), ni que les contrastes passent (règle §2.4 d'inclusion, vérifiée
 * à part). Il prouve que les valeurs vivent à UN SEUL endroit par rôle et que
 * rien de neuf n'entre en cachette.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const lire = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
// Sans les commentaires : ces fichiers RACONTENT les défauts qu'on retire, et
// une phrase de commentaire ne doit ni faire passer ni faire échouer la garde.
const sansCommentaires = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const commerceCss = lire("../../../styles/commerce.css");
const tokensCss = lire("../../../styles/tokens.css");

const FICHIERS = [
  "LoginPassword.tsx",
  "ChangePasswordScreen.tsx",
  "PropositionReconnaissance.tsx",
  "ActivationScreen.tsx",
  "UnregisteredPhone.tsx",
  "Welcome.tsx",
  "OnboardingSlides.tsx",
  "EntryGate.tsx",
  "BanniereErreur.tsx",
  "PaveSaisie.tsx",
] as const;

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}

// ── LA CHARTE AUTH (fermée) ────────────────────────────────────────────────
// Chaque entrée : la valeur exacte, et le rôle qu'elle joue. C'est la LISTE
// des couleurs autorisées — pas un inventaire décoratif.
const CHARTE: Record<string, string> = {
  // Blanc inverse : texte (et icônes) posé SUR l'action commerce. Ce n'est
  // pas une surface — une surface lira un jeton (voir [5]).
  "#FFFFFF": "blanc inverse — texte sur fond action (jamais une surface)",
  // La famille commerce : dégradé de l'action, textes bruns sur papier.
  "#EE8E3C": "action claire — borne haute du dégradé du geste principal",
  "#A85108": "action foncée — borne basse du dégradé (écran non enregistré)",
  // L'action commerce elle-même n'est ici QUE pour les classes Tailwind
  // arbitraires de l'écran « numéro non enregistré » (from-/text-/hover-).
  // À tokeniser en suivant (text-(--commerce-action)) — le budget fige l'état.
  "#B74725": "action commerce — usages Tailwind arbitraires (non enregistré)",
  "#FFF7EF": "ivoire — fond du bouton écoute de la modale reconnaissance",
  "#8A5A34": "brun texte — liens et labels posés sur papier clair",
  "#7A4A24": "brun fort — texte du bouton Rapport de test",
  "#7C6250": "taupe — outils développeur (jamais vus de la marchande)",
  "#3D1A08": "brun encre — numéro affiché dans la carte de confirmation",
  "#DB7A2C": "orange actif — bascule clavier OUVERTE (état engagé)",
  "#F0E0CD": "sable — liseré du plateau du pavé numéro",
  "#D9A87A": "sable foncé — liseré du bouton Rapport de test",
  "#CBB9A8": "taupe clair — action « Oui, je veux » pendant l'enrôlement",
  // La famille erreur (rouge Tailwind, palette « alerte » de l'auth) :
  "#DC2626": "erreur — texte et icône des bannières role=alert",
  "#B91C1C": "erreur forte — texte d'erreur du changement de code",
  "#FEF2F2": "erreur — fond des bannières role=alert",
  "#FECACA": "erreur — liseré des bannières role=alert",
  // La famille succès (coche du numéro confirmé) :
  "#2E8B57": "succès — coche « numéro confirmé »",
  "#E8F5E9": "succès — pastille fond derrière la coche",
  // Les verts de progression du pavé (points « chiffres entendus ») :
  "#2F8F63": "progression — point rempli (chiffre entendu)",
  "#EDE0CE": "progression — point vide (chiffre à venir)",
  // La famille « Tata propose de s'adapter » (bleu question, hors charte
  // assumée — la charte Jùlaba n'a pas de bleu, c'est le seul écran concerné) :
  "#2563EB": "adaptation — bouton « Oui, adapte » (institution: primaire aussi)",
  "#1E3A8A": "adaptation — texte de la question sur fond bleu pâle",
  "#C7D8FF": "adaptation — liserés du panneau et du bouton Non",
  "#EEF4FF": "adaptation — fond du panneau de proposition",
  // Palettes par RÔLE (ChangePasswordScreen) — les rôles hors commerce :
  "#4CAF50": "rôle producteur — primaire",
  "#2E7D32": "rôle coopérateur — primaire",
  "#8B5CF6": "rôle identificateur — primaire",
  "#1F2937": "rôles admin/super_admin — primaire (et chiffres du pavé)",
  "#374151": "rôles admin/super_admin — variante primaire",
  // Ombre d'encre : la couleur d'ombre des grands boutons d'action (alpha 0C
  // porté par le littéral 8 chiffres — c'est une OMBRE, pas une surface).
  "#3325330C": "ombre — halo des grands boutons d'action (encre à 5 %)",
};

// Normalisation : 3 chiffres → 6, casse uniforme.
const normaliser = (hex: string) => {
  const h = hex.toUpperCase().slice(1);
  return h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
};

// Les occURRENCES hex par fichier, sur le code sans commentaires.
const parFichier: Record<string, string[]> = {};
for (const f of FICHIERS) {
  const code = sansCommentaires(lire(`./${f}`));
  parFichier[f] = code.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
}

console.log("\n[1] La charte auth est fermée : chaque hex est nommé, avec son rôle");
const cleConnue = (h: string) => Object.keys(CHARTE).some((k) => normaliser(k) === h);
for (const [f, hexs] of Object.entries(parFichier)) {
  const mauvais = [...new Set(hexs.map(normaliser))].filter((h) => !cleConnue(h));
  ok(mauvais.length === 0, `${f} : toutes ses couleurs sont dans la charte (${mauvais.length ? "inconnues : #" + mauvais.join(", #") : "toutes"})`);
}

console.log("\n[2] Les budgets sont figés — une couleur qui se multiplie dilue la charte");
// État mesuré à la clôture AUTH-08 (05/10/2026, après migration jetons).
// BAISSER est un progrès : baissez la même ligne. Monter échoue.
const BUDGETS: Record<string, number> = {
  "LoginPassword.tsx": 26,
  "ChangePasswordScreen.tsx": 13,
  "PropositionReconnaissance.tsx": 9,
  "ActivationScreen.tsx": 0,
  "UnregisteredPhone.tsx": 7,
  "Welcome.tsx": 0,
  "OnboardingSlides.tsx": 1,
  "EntryGate.tsx": 0,
  "BanniereErreur.tsx": 4,
  "PaveSaisie.tsx": 0,
};
for (const f of FICHIERS) {
  const n = parFichier[f].length;
  ok(n <= BUDGETS[f], `${f} : ${n} hex (budget ${BUDGETS[f]})`);
}

console.log("\n[3] Les jetons consommés par l'auth existent vraiment");
const declares = new Set([
  ...([...commerceCss.matchAll(/(--commerce-[a-z0-9-]+)\s*:/g)].map((m) => m[1])),
  ...([...tokensCss.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1])),
]);
const tous = FICHIERS.map((f) => sansCommentaires(lire(`./${f}`))).join("\n");
const jetonsLus = [...new Set((tous.match(/var\((--[a-z0-9-]+)\)/g) || []).map((m) => m.slice(4, -1)))];
const fantomes = jetonsLus.filter((t) => !declares.has(t));
ok(fantomes.length === 0, `aucun jeton fantôme (${fantomes.length ? fantomes.join(", ") : "tous déclarés"})`);

console.log("\n[4] Les migrations AUTH-08/16 sont consommées — le jeton, plus la copie");
ok(/var\(--commerce-action\)/.test(sansCommentaires(lire("./LoginPassword.tsx"))), "LoginPassword lit var(--commerce-action) (empreinte, effacement)");
ok(/var\(--commerce-apricot\)/.test(sansCommentaires(lire("./LoginPassword.tsx"))), "LoginPassword lit var(--commerce-apricot) (bascule, rapport dev)");
ok(/var\(--commerce-surface\)/.test(sansCommentaires(lire("./LoginPassword.tsx"))), "LoginPassword lit var(--commerce-surface) (feuilles, ex-#fff)");
ok(/var\(--commerce-paper\)/.test(sansCommentaires(lire("./LoginPassword.tsx"))), "LoginPassword lit var(--commerce-paper) (plateau du pavé, ex-#FFF9F2)");
ok(/var\(--commerce-action\)/.test(sansCommentaires(lire("./ChangePasswordScreen.tsx"))), "ChangePasswordScreen lit var(--commerce-action) (rôle marchand)");
ok(/var\(--commerce-action\)/.test(sansCommentaires(lire("./PropositionReconnaissance.tsx"))), "PropositionReconnaissance lit var(--commerce-action)");
ok(/var\(--encre-3\)/.test(sansCommentaires(lire("./LoginPassword.tsx"))), "LoginPassword lit var(--encre-3) (sous-libellés)");
ok(!/#FFF9F2/i.test(sansCommentaires(lire("./LoginPassword.tsx"))), "plus d'ivoire en dur #FFF9F2 (→ --commerce-paper)");

console.log("\n[5] Les surfaces ne portent plus de blanc pur SANS jeton");
// Le blanc PUR (#FFFFFF) n'est légitime que comme texte INVERSE — sur fond
// action — ou comme la feuille de la modale (toujours claire à dessein : ses
// textes sont des bruns littéraux ; voir le commentaire dans le TSX).
ok(!/background:\s*['"]#fff['"]/i.test(sansCommentaires(lire("./LoginPassword.tsx"))), "LoginPassword : plus aucune surface background '#fff'");

console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
if (failures > 0) process.exit(1);
