/**
 * Test de COHÉRENCE DES TOKENS de couleur (contraste v2 — inclusion §2.4).
 * Lancer : npm run test:tokens   (tsx, scan statique, sans DOM)
 *
 * Garanties :
 * 1. Tout token `--encre*` / `--trait*` référencé dans le code (var(--…))
 *    est bien DÉFINI dans styles/tokens.css (:root) — pas de token fantôme
 *    qui laisserait un texte sans couleur.
 * 2. Le bloc `html.soleil` ne surcharge QUE des tokens définis dans :root
 *    (pas de faute de frappe silencieuse).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RACINE = join(process.cwd(), 'src', 'app');
const TOKENS_CSS = join(process.cwd(), 'src', 'styles', 'tokens.css');
const PREFIXES = ['--encre', '--trait'];

function listerFichiers(dir: string): string[] {
  const out: string[] = [];
  for (const nom of readdirSync(dir)) {
    const chemin = join(dir, nom);
    const st = statSync(chemin);
    if (st.isDirectory()) out.push(...listerFichiers(chemin));
    else if (/\.(ts|tsx)$/.test(nom) && !/\.test\.mts$/.test(nom)) out.push(chemin);
  }
  return out;
}

function extraireBloc(css: string, selecteur: string): string {
  const i = css.indexOf(selecteur);
  if (i < 0) return '';
  const debut = css.indexOf('{', i);
  const fin = css.indexOf('}', debut);
  return css.slice(debut + 1, fin);
}

function nomsDefinis(bloc: string): Set<string> {
  return new Set([...bloc.matchAll(/(--[a-z0-9-]+)\s*:/g)].map(m => m[1]));
}

function main() {
  const css = readFileSync(TOKENS_CSS, 'utf8');
  const racineTokens = nomsDefinis(extraireBloc(css, ':root'));
  const soleilTokens = nomsDefinis(extraireBloc(css, 'html.soleil'));

  let echecs = 0;
  const ok = (cond: boolean, label: string) => {
    console.log(cond ? `  ✅ ${label}` : `  ❌ ${label}`);
    if (!cond) echecs++;
  };

  console.log(`\n[1] tokens.css : ${racineTokens.size} tokens :root, ${soleilTokens.size} surcharges soleil`);
  ok(racineTokens.size > 0, ':root définit des tokens');
  for (const t of soleilTokens) {
    ok(racineTokens.has(t), `surcharge soleil « ${t} » existe dans :root`);
  }

  console.log('\n[2] Tout var(--encre*/--trait*) du code est défini');
  const fichiers = listerFichiers(RACINE);
  const inconnus: Array<{ fichier: string; token: string }> = [];
  let usages = 0;
  for (const f of fichiers) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
      const token = m[1];
      if (!PREFIXES.some(p => token.startsWith(p))) continue;
      usages++;
      if (!racineTokens.has(token)) inconnus.push({ fichier: relative(process.cwd(), f), token });
    }
  }
  ok(usages > 0, `${usages} usages de tokens dans ${fichiers.length} fichiers balayés`);
  for (const u of inconnus) console.log(`  ❌ ${u.fichier} référence « ${u.token} » non défini dans tokens.css`);
  ok(inconnus.length === 0, 'aucun token fantôme');

  console.log(echecs === 0 ? '\nTous les tests sont verts ✅\n' : `\n${echecs} échec(s) ❌\n`);
  if (echecs > 0) process.exit(1);
}

main();
