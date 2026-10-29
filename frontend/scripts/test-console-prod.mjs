/**
 * A11Y-007 — la console du build livré se tait, et le robinet reste branché.
 * Lancer : npm run test:console-prod   (node, lecture du source vite.config)
 *
 * LE DÉFAUT QU'ON FERME. 1750 appels `console.*` (1410 `log`) partaient
 * dans le bundle livré : du bruit en production, de la taille morte dans
 * l'APK, et un indice pour qui sonde le téléphone d'une marchande. Le
 * robinet vit désormais dans vite.config.ts — `esbuild.pure` sous la
 * condition `command === "build"` — et le build de preuve du 29/10 a
 * montré 0 console.log/info/debug dans dist (347 warn/error conservés,
 * diagnostics légitimes).
 *
 * CE QUE CETTE GARDE VÉRIFIE. Que le robinet N'A PAS ÉTÉ DÉBRANCHÉ :
 *   1. la condition `command === "build"` est présente (le dev garde tout
 *      — si quelqu'un supprime la condition, esbuild purge aussi la
 *      console de développement : régression de diagnostic interdite) ;
 *   2. la liste `pure` couvre log, info ET debug (une méthode oubliée
 *      revient dans le bundle en silence) ;
 *   3. le commentaire A11Y-007 existe encore (un robinet sans étiquette
 *      est un robinet qu'on croit décoratif).
 *
 * CE QU'ELLE NE VÉRIFIE PAS. Le contenu du bundle : c'est le travail du
 * build lui-même (preuve réelle du 29/10, à refaire à chaque doute) — un
 * `vite build` dans un banc de verify ralentirait la chaîne pour une
 * vérification que la config rend mécanique.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const CONFIG = readFileSync(join(ICI, '..', 'vite.config.ts'), 'utf8');

let echecs = 0;
const verifier = (ok, quoi, pourquoi) => {
  if (ok) console.log(`  ✓ ${quoi}`);
  else { echecs++; console.log(`  ✗ ${quoi}`); if (pourquoi) console.log(`      ${pourquoi}`); }
};

console.log("\nLa console du build livré se tait (A11Y-007)\n");

verifier(
  /command\s*===\s*["']build["']/.test(CONFIG),
  'le robinet est sous la condition `command === "build"`',
  'sans elle, la console de développement serait purgée aussi — le diagnostic dev est interdit à sacrifier.'
);

verifier(
  /pure:\s*\[\s*["']console\.log["']\s*,\s*["']console\.info["']\s*,\s*["']console\.debug["']\s*\]/.test(CONFIG),
  'la liste pure couvre console.log, console.info et console.debug',
  'une méthode oubliée revient dans le bundle en silence.'
);

verifier(
  /A11Y-007/.test(CONFIG),
  "l'étiquette A11Y-007 est encore sur le robinet",
  'un garde sans référence à son registre devient une ligne magique quon finit par « nettoyer ».'
);

// Le même bloc doit bien passer par `esbuild:` — pas un duplicata perdu
// ailleurs dans un plugin.
verifier(
  /esbuild:\s*command\s*===\s*["']build["']/.test(CONFIG),
  'le robinet est bien monté sur la clé esbuild de la config',
  'une liste pure hors `esbuild:` ne serait lue par personne.'
);

console.log(echecs === 0
  ? '\n✅ le robinet est branché : le build livré reste silencieux\n'
  : `\n❌ ${echecs} garde(s) enfreinte(s) — le robinet a bougé : relis vite.config.ts.\n`);
process.exit(echecs === 0 ? 0 : 1);
