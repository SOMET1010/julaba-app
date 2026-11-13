/**
 * Garde-fou de source — CAI-08 : UN SEUL « COMPRIS » PAR PHRASE DITE.
 * Lancer : npm run test:cai08-un-seul-compris   (tsx, sans DOM)
 *
 * LE DÉFAUT, vu en recette le 13/11/2026. La marchande dicte « cinq tomates »
 * sur sa caisse — la phrase EXACTE pour laquelle `intentLocalCaisse` existe
 * (localIntent.ts, « CINQ TOMATES EST UNE VENTE »). Le moteur GLOBAL
 * (`intentLocal`, lu par `useVoiceCore.processAudio`) la jette à juste titre :
 * sans verbe, elle ne veut pas dire la même chose ailleurs. Le filet final de
 * `processAudio` disait alors « Je n'ai pas bien compris. Redis-moi ça
 * autrement. » PENDANT que l'effet de relecture de `MicroVenteCaisse`
 * (déclenché par `transcript`) posait la MÊME phrase au panier : la vente
 * entrait, et la voix la niait. Deux messages contradictoires sur une seule
 * phrase — le pire des deux étant le faux. « Quand je veux enregistrer une
 * vente, il ne comprend pas » (Patrick, 13/11/2026).
 *
 * CE QUI EST FERMÉ ICI. La porte `lireLocal` (option de `useVoiceCore`) : la
 * surface répond « cette phrase est à moi » en RENDANT la vente, et le moteur
 * la traite par le flux commun — un seul « compris », dit par le moteur, avant
 * que son filet « pas compris » ait pu mentir. La caisse passe le lecteur ;
 * les autres surfaces (l'assistante générique, qui n'a pas de panier) gardent
 * leur « pas compris » intact.
 *
 * POURQUOI LIRE LE SOURCE. Le danger est un double retour : quelqu'un
 * rebranche le « pas compris » AVANT la consultation du lecteur, ou un jour
 * le lecteur d'une surface écrit de l'argent lui-même (il n'a pas le droit —
 * il rend la vente, le moteur dispose). On fige donc la forme du câblage :
 * l'option existe, `processAudio` consulte le lecteur APRÈS `intentLocal`
 * (jamais par-dessus le moteur), AVANT son filet final, et après la branche
 * de confirmation en attente ; le lecteur de la caisse relit sa grammaire et
 * son catalogue, et n'écrit rien.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const lire = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const sansCommentaires = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const coeur = sansCommentaires(lire("../../hooks/useVoiceCore.ts"));
const caisse = sansCommentaires(lire("./MicroVenteCaisse.tsx"));
const assistante = sansCommentaires(lire("../assistant/TantieSagesseModal.tsx"));

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}

console.log("\n[1] useVoiceCore consulte le lecteur AVANT son filet « pas compris »");
ok(/lireLocal\?: \(texte: string\) => Partial<VoiceProcessResponse> \| null \| undefined;/.test(coeur),
  "l'option `lireLocal` existe sur VoiceCoreOptions");
ok(/lireLocalRef\.current\?\.\(texte\)/.test(coeur),
  "processAudio consulte le lecteur de la surface");
// Le moteur garde la main : sa grammaire est consultée AVANT le lecteur.
const moteur = coeur.indexOf("intentLocal(texte)");
const lecteur = coeur.indexOf("lireLocalRef.current?.(texte)");
ok(moteur > 0 && lecteur > moteur,
  "`intentLocal` est consulté AVANT le lecteur (jamais par-dessus le moteur)");
// Le filet final reste derrière : son « pas compris » ne doit pas réapparaître
// avant la consultation du lecteur.
const filet = coeur.indexOf('"Je n\'ai pas bien compris. Redis-moi ça autrement, s\'il te plaît."', lecteur);
ok(lecteur > 0 && filet > lecteur,
  "le « pas compris » du filet vient APRÈS la consultation du lecteur");
// Le lecteur ne court-circuite JAMAIS la confirmation en attente : il vit
// après la branche `pendingResponseRef.current`.
const confirmation = coeur.indexOf("if (pendingResponseRef.current)");
ok(confirmation > 0 && confirmation < lecteur,
  "la confirmation en attente garde la priorité sur le lecteur");

console.log("\n[2] Le lecteur de la caisse PROPOSE, il n'écrit pas");
ok(/lireLocal: \(texte\) => \{/.test(caisse),
  "la caisse passe `lireLocal` à useVoiceCore");
// On découpe le corps du lecteur : de son ouverture à l'option suivante
// (onAction), pour ne pas juger le reste du fichier.
const debut = caisse.indexOf("lireLocal: (texte) => {");
const fin = caisse.indexOf("onAction: async (data) => {", debut);
ok(debut > 0 && fin > debut, "le corps du lecteur est localisable");
const corps = caisse.slice(debut, fin);
ok(corps.includes("intentLocalCaisse"), "il relit la grammaire de caisse (intentLocalCaisse)");
ok(corps.includes("lireVenteAuCatalogue"), "il relit aussi son étal (lireVenteAuCatalogue)");
ok(corps.includes("if (intentLocal(dit)) return undefined;"),
  "il s'efface devant la grammaire du moteur");
// PUR côté argent : le lecteur rend la vente, il ne la pose pas lui-même.
// Ce sont les noms des seules actions qui posent une ligne ou notent quelque
// chose. (Le marqueur `venteLueParLeMoteur` est autorisé : il EFFACE une
// relecture, il n'en crée pas.)
ok(!/addToCart|enregistrerDepense|vendreUnifie|notifierAjoutPanier|demanderPrix/.test(corps),
  "le lecteur n'écrit rien (pas de addToCart / vendreUnifie / dépense)");
ok(/venteLueParLeMoteur\.current = /.test(corps),
  "il pose le marqueur anti-double (l'effet de relecture s'effacera)");

console.log("\n[3] Les surfaces sans panier gardent leur « pas compris »");
ok(!/lireLocal:/.test(assistante),
  "l'assistante générique ne revendique pas de phrases (pas de lireLocal)");

process.exit(failures ? 1 : 0);
