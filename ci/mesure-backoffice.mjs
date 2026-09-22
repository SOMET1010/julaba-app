/**
 * MESURE DU BACK-OFFICE — l'état des lieux, avant toute correction.
 *
 * Lancer : node ci/mesure-backoffice.mjs [--json <fichier>]
 *
 * POURQUOI UNE MESURE STATIQUE, ET PAS LE BANC TERRAIN. Le banc ouvre un vrai
 * navigateur et juge ce qu'une marchande voit. Le back-office ne se visite pas
 * sans un compte d'administration, et il n'y en a AUCUN sur le déploiement :
 * `SEED_DEMO_BO_PASSWORD` n'est pas renseignée, et c'est délibéré (un accès
 * d'administration ne doit jamais exister avec un mot de passe connu). Tant que
 * Patrick ne la pose pas au tableau de bord Render, le banc ne peut pas entrer.
 *
 * Ce qui se mesure QUAND MÊME, et qui est la moitié la plus grave :
 *
 *   LE FAUX ZÉRO. « 0 acteur », « Aucun dossier », « 0 F » — affichés alors que
 *   la lecture a ÉCHOUÉ ou n'a pas eu lieu. C'est la faute fermée cinq fois de
 *   suite côté marchande (ACC-02, CAI-01, HIS-01, DEP-02, STK-01). Ici elle est
 *   PIRE : une institution décide sur ces chiffres. « 0 marchande active dans
 *   cette zone » ne veut pas dire la même chose selon qu'on l'a compté ou qu'on
 *   n'a pas pu le lire, et personne ne peut faire la différence à l'écran.
 *
 *   L'ERREUR AVALÉE. `catch (e) { console.error(...) }` : la console d'un
 *   navigateur n'est pas une interface. L'écran reste vide, l'agent croit que
 *   c'est vide.
 *
 * Ce rapport ne corrige RIEN. Il compte, il nomme, il se rejoue.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..');
const BO = join(RACINE, 'frontend_src/src/app/components/backoffice');
const CONTEXTE = join(RACINE, 'frontend_src/src/app/contexts/BackOfficeContext.tsx');

const sansCommentaires = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => (/^\s*(\/\/|\*)/.test(l) ? '' : l)).join('\n');

const lignesDe = (src) => src.split('\n');

/** Les fichiers d'ÉCRAN : ceux que le routeur monte, pas les briques. */
function ecransBackOffice() {
  return readdirSync(BO)
    .filter(f => /^BO[A-Z].*\.tsx$/.test(f) || /^(NouvelActeurPage|FicheIdentificationDynamiqueBO|EventMonitor)\.tsx$/.test(f))
    .filter(f => !/^(BOLayout|BOProgressBar|BORoot|BOShortcutsModal)\.tsx$/.test(f))
    .sort();
}

// ── Les trois sondes ────────────────────────────────────────────────────────

/**
 * UN REPLI QUI FABRIQUE UN VIDE. `Array.isArray(x) ? x : []`, `x || []`,
 * `x ?? []` : la donnée non lue devient une liste vide, et `liste.length`
 * devient un zéro affirmé.
 */
const RE_VIDE_FABRIQUE = /(?:\?\?|\|\|)\s*\[\]|Array\.isArray\([^)]+\)\s*\?\s*[^:]+:\s*\[\]/g;

/**
 * UN ZÉRO FABRIQUÉ. `x || 0`, `x ?? 0` : en plus du faux zéro, `|| 0` écrase
 * un VRAI zéro venu du serveur — les deux fautes dans le même opérateur.
 */
const RE_ZERO_FABRIQUE = /(?:\?\?|\|\|)\s*0\b/g;

/** UNE ERREUR AVALÉE : un `catch` dont le corps ne fait que journaliser. */
function catchsAvales(src) {
  const out = [];
  const re = /catch\s*\(([^)]*)\)\s*\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(src))) {
    const corps = m[2];
    const journaliseSeulement = /console\.(error|warn|log)/.test(corps) || corps.trim() === '';
    const remonte = /setError|setErreur|toast|throw|setMessage|notifi/i.test(corps);
    if (journaliseSeulement && !remonte) {
      out.push({ ligne: src.slice(0, m.index).split('\n').length, corps: corps.trim().slice(0, 70) });
    }
  }
  return out;
}

/** L'écran distingue-t-il « pas encore lu » et « erreur » de « vide » ? */
function distingue(src) {
  return {
    loading: /\b(loading|Loading|chargement|isLoading)\b/.test(src),
    erreur: /\b(error|erreur|Error)\b/.test(src),
    // Le vrai critère : l'écran LIT-IL cet état pour changer ce qu'il affiche ?
    erreurAffichee: /\{\s*(error|erreur)[^}]*&&|\bif\s*\(\s*(error|erreur)\b/.test(src),
  };
}

function compter(re, src) {
  const m = src.match(re);
  return m ? m.length : 0;
}

// ── Mesure ──────────────────────────────────────────────────────────────────

const ecrans = ecransBackOffice().map((f) => {
  const brut = readFileSync(join(BO, f), 'utf8');
  const src = sansCommentaires(brut);
  const avales = catchsAvales(src);
  const d = distingue(src);
  return {
    fichier: f,
    lignes: lignesDe(brut).length,
    videsFabriques: compter(RE_VIDE_FABRIQUE, src),
    zerosFabriques: compter(RE_ZERO_FABRIQUE, src),
    erreursAvalees: avales.length,
    detailErreursAvalees: avales,
    ...d,
  };
});

const ctxBrut = readFileSync(CONTEXTE, 'utf8');
const ctx = sansCommentaires(ctxBrut);
const contexte = {
  fichier: relative(RACINE, CONTEXTE),
  lignes: lignesDe(ctxBrut).length,
  listesVides: (ctx.match(/useState<[^>]*\[\]>\(\[\]\)|useState<any\[\]>\(\[\]\)/g) || []).length,
  erreursAvalees: catchsAvales(ctx).length,
  unSeulError: (ctx.match(/const \[error, setError\]/g) || []).length === 1,
};

// ── Rapport ─────────────────────────────────────────────────────────────────

const total = (k) => ecrans.reduce((s, e) => s + e[k], 0);
const l = (s = '') => console.log(s);

l();
l('MESURE DU BACK-OFFICE — état des lieux, aucune correction');
l('═'.repeat(72));
l();
l(`  ${ecrans.length} écrans · ${ecrans.reduce((s, e) => s + e.lignes, 0)} lignes`);
l();
l('  LE FAUX ZÉRO — une lecture ratée qui devient un chiffre affirmé');
l(`    replis qui fabriquent une LISTE VIDE .... ${total('videsFabriques')}`);
l(`    replis qui fabriquent un ZÉRO ........... ${total('zerosFabriques')}`);
l(`    erreurs AVALÉES (console seulement) ..... ${total('erreursAvalees')} dans les écrans`);
l(`                                              ${contexte.erreursAvalees} dans BackOfficeContext`);
l();
l('  CE QUE L\'ÉCRAN SAIT DIRE');
const sansErreur = ecrans.filter(e => !e.erreurAffichee);
l(`    écrans qui n'affichent JAMAIS une erreur . ${sansErreur.length} / ${ecrans.length}`);
l();
l('  ÉCRAN PAR ÉCRAN (les dix plus exposés)');
l(`    ${'fichier'.padEnd(34)} ${'[]'.padStart(4)} ${'0'.padStart(4)} ${'avalées'.padStart(8)}  erreur affichée`);
for (const e of [...ecrans].sort((a, b) =>
  (b.videsFabriques + b.zerosFabriques + b.erreursAvalees * 2) -
  (a.videsFabriques + a.zerosFabriques + a.erreursAvalees * 2)).slice(0, 10)) {
  l(`    ${e.fichier.padEnd(34)} ${String(e.videsFabriques).padStart(4)} ${String(e.zerosFabriques).padStart(4)} ${String(e.erreursAvalees).padStart(8)}  ${e.erreurAffichee ? 'oui' : 'NON'}`);
}
l();
l('  LA SOURCE COMMUNE — BackOfficeContext');
l(`    listes initialisées à [] ................ ${contexte.listesVides}`);
l(`    erreurs avalées ......................... ${contexte.erreursAvalees}`);
l(`    un SEUL champ « error » pour tout le BO . ${contexte.unSeulError ? 'oui' : 'non'}`);
l();

const i = process.argv.indexOf('--json');
if (i !== -1 && process.argv[i + 1]) {
  writeFileSync(process.argv[i + 1], JSON.stringify({ ecrans, contexte }, null, 2));
  l(`  Rapport : ${process.argv[i + 1]}`);
  l();
}
