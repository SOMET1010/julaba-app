/**
 * Garde-fou de source — LA RELECTURE FINANCIÈRE SE VOIT AUSSI (VOIX-01, dernier point).
 * Lancer : npm run test:caisse-relecture-affichee   (tsx, sans DOM)
 *
 * DÉCISION DE PATRICK (20/09/2026), mot pour mot : « Relecture financière :
 * conserver speak. Une interaction vocale initiée par "encaisse" doit rester
 * vocale, même en profil lecture. En revanche, afficher simultanément à
 * l'écran la même relecture financière exacte que celle prononcée, dérivée du
 * même snapshot de machine. »
 *
 * CE QU'ON FERME. Sur fe14759, la machine d'encaissement parlait (« Elle doit
 * 4 000 francs. Elle t'a donné 5 000. Tu rends 1 000. Je valide ? ») et
 * l'écran ne montrait rien de cette phrase. Une marchande qui n'a pas entendu
 * — bruit, casque, doute — ne pouvait pas vérifier CE qu'elle allait
 * confirmer avec « oui valide ». Ce test est rouge sur fe14759.
 *
 * POURQUOI LIRE LE SOURCE, ET QUOI. Le danger n'est pas qu'un encart manque :
 * c'est qu'il montre AUTRE CHOSE que ce qui a été dit — une phrase
 * reconstruite à partir de `total`/`recu` du rendu, qui peut différer du
 * snapshot relu par la machine. On exige donc UNE seule chaîne : celle de
 * `effet.texte`, dite ET affichée ; aucune autre construction de relecture
 * dans POSCaisse ; remise à null quand la machine revient au repos.
 *
 * CE QU'IL NE DIT PAS : il ne rend rien. Que l'encart soit lisible à
 * l'endroit voulu se juge à l'écran ; ici on prouve la provenance de la
 * chaîne et sa présence dans les deux dispositions.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const lire = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const sansCommentaires = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const code = sansCommentaires(lire("./POSCaisse.tsx"));

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}

console.log("\n[1] Une seule chaîne : celle que la machine a rendue, dite ET affichée");
ok(/const \[relectureAffichee, setRelectureAffichee\] = useState<string \| null>\(null\)/.test(code),
  "l'état `relectureAffichee` existe (string | null, null au départ)");
// Chaque affectation, où qu'elle soit : soit `effet.texte`, soit `null`.
// Rien d'autre — pas de gabarit, pas de `${total}`, pas de phraseRelecture.
const affectations = [...code.matchAll(/setRelectureAffichee\(([^)]*)\)/g)].map(m => m[1].trim());
ok(affectations.length >= 2, `setRelectureAffichee est appelé (${affectations.length} fois)`);
ok(affectations.every(a => a === "effet.texte" || a === "null"),
  `chaque affectation est \`effet.texte\` ou \`null\` (${[...new Set(affectations)].join(" / ")})`);
ok(affectations.includes("effet.texte") && affectations.includes("null"), "les deux formes existent : on affiche, et on efface");
// L'affichage tient dans UNE règle, `afficherRelecture` : null au repos,
// sinon la `effet.texte` d'un `dire`. Les deux endroits où la machine parle
// l'appellent, juste avant de dire la même chaîne.
const afficher = code.match(/const afficherRelecture = \(etat: EtatEncaissement, effet: EffetEncaissement\) => \{[\s\S]*?\n  \};/);
ok(afficher !== null, "`afficherRelecture(etat, effet)` porte cette règle");
ok(afficher !== null && /if \(etat\.phase === 'repos'\) setRelectureAffichee\(null\)/.test(afficher[0]),
  "null quand la machine revient au repos (paiement, annulation, panier vidé)");
ok(afficher !== null && /else if \(effet\.type === 'dire'\) setRelectureAffichee\(effet\.texte\)/.test(afficher[0]),
  "sinon la `effet.texte` du `dire` — la relecture suivante remplace la précédente");
ok(!/setRelectureAffichee\(/.test(code.replace(afficher?.[0] ?? "", "").replace(/const \[relectureAffichee, setRelectureAffichee\][^\n]*/, "")),
  "aucune autre affectation ailleurs : la règle n'existe qu'une fois");
const traiter = code.match(/const traiterIntentionEncaissement = [\s\S]*?\n  \};/);
ok(traiter !== null && /afficherRelecture\(etat, effet\)/.test(traiter[0]) && /speak\(effet\.texte\)/.test(traiter[0]),
  "traiterIntentionEncaissement affiche puis DIT la même `effet.texte`");
const effetEmpreinte = code.match(/useEffect\(\(\) => \{[\s\S]{0,600}?'etat_financier_change'[\s\S]*?\}, \[cleEmpreinte\]\)/);
ok(effetEmpreinte !== null && /afficherRelecture\(etat, effet\)/.test(effetEmpreinte[0]) && /speak\(effet\.texte\)/.test(effetEmpreinte[0]),
  "le useEffect [cleEmpreinte] (relecture spontanée) aussi : affichée puis dite");
ok(!/import \{[^}]*\bphraseRelecture\b[^}]*\} from '\.\.\/\.\.\/services\/machineEncaissement'/.test(code),
  "POSCaisse n'importe pas `phraseRelecture` de la machine : il ne reconstruit jamais la phrase");

console.log("\n[2] L'encart est là où l'œil est au moment d'encaisser, dans les DEUX dispositions");
const debutFooter = code.indexOf("const renderCartFooter = () =>");
const debutRendu = code.indexOf("<SubPageLayout");
const encart = code.indexOf("{relectureAffichee && (");
ok(encart !== -1, "l'encart est rendu sous la garde `relectureAffichee &&`");
ok(debutFooter !== -1 && encart > debutFooter && encart < debutRendu,
  "il vit dans renderCartFooter — rendu par le panneau grand écran ET la section téléphone");
const pieds = (code.match(/renderCartFooter\(\)/g) || []).length;
ok(pieds === 2, `renderCartFooter() est rendu exactement 2 fois (${pieds}) : même compte que caisseSurfaceUnique`);
const carteRecu = code.indexOf("Reçu :", encart);
const boutonPayer = code.indexOf("Payer en espèces", encart);
ok(carteRecu !== -1 && boutonPayer !== -1 && encart < carteRecu && carteRecu < boutonPayer,
  "juste au-dessus de la carte « Reçu | Monnaie », elle-même au-dessus de « Payer en espèces »");
const blocEncart = code.slice(encart, code.indexOf("\n        )}", encart));
ok(/background:'var\(--caisse-succes\)'/.test(blocEncart) && /border:'1\.5px solid var\(--caisse-vert\)'/.test(blocEncart),
  "fond succès, bordure verte — les tokens de la charte");
ok(/font:'var\(--caisse-font-texte\)'/.test(blocEncart) && /borderRadius:'var\(--caisse-rayon-\d\)'/.test(blocEncart) && /var\(--caisse-esp-\d\)/.test(blocEncart),
  "texte courant, rayon et espacements en tokens");
ok(/<Volume2 aria-hidden="true" size=\{ICONE\}/.test(blocEncart), "une icône haut-parleur de 24 px (ICONE)");
ok(/\{relectureAffichee\}/.test(blocEncart), "le texte affiché est `relectureAffichee` tel quel — « Je valide ? » compris");
// `[^>]*` ne convient pas : le `=>` de onClick contient un `>`.
const reecouter = blocEncart.match(/<button type="button" onClick=\{[^}]*\} aria-label="Réécouter la relecture"[\s\S]*?<\/button>/);
ok(reecouter !== null, "un bouton « Réécouter »");
ok(reecouter !== null && /onClick=\{\(\) => speak\(relectureAffichee\)\}/.test(reecouter[0]), "qui rejoue `speak(relectureAffichee)` — la même chaîne");
ok(reecouter !== null && /minHeight:'var\(--caisse-cible-tactile\)'/.test(reecouter[0]) && /minWidth:'var\(--caisse-cible-tactile\)'/.test(reecouter[0]),
  "et mesure au moins la cible tactile (44 px) en hauteur et en largeur");

console.log("\n[3] Rien d'autre n'a bougé sur le chemin d'argent");
ok((code.match(/\bhandlePay\(\)/g) || []).length === 1, "handlePay() n'a toujours qu'un appelant vocal");

console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
if (failures > 0) process.exit(1);
