/**
 * VALIDATEUR DES FLOWS MAESTRO — ce que je peux prouver SANS appareil.
 *
 * Un YAML valide n'est pas un flow valide : une commande mal nommée
 * (`assertVisble`) passe le parseur YAML et échoue sur le téléphone, après
 * l'installation de l'APK et le démarrage de l'émulateur. Autant le dire tout
 * de suite.
 *
 * TROIS CHOSES VÉRIFIÉES, et la troisième est la plus importante :
 *  1. chaque commande appartient au vocabulaire Maestro ;
 *  2. chaque `runFlow` pointe sur un fichier qui existe ;
 *  3. AUCUN IDENTIFIANT N'EST ÉCRIT EN DUR — ALERTE-SEC-01. 29 identifiants en
 *     clair dorment déjà dans un dépôt public ; un numéro ivoirien à 10 chiffres
 *     ou un code à 4 chiffres dans un flow serait la même faute, en pire, parce
 *     que personne ne relit un YAML de test.
 *
 * Lancer : node .maestro/valider.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// La racine est celle DE CE FICHIER, jamais le répertoire d'appel : ce
// validateur est un maillon de `verify`, qui tourne depuis `frontend_src`.
const RACINE = dirname(fileURLToPath(import.meta.url));

/** Le vocabulaire Maestro utilisé par ce banc. Volontairement une liste FERMÉE :
 *  une commande inventée doit échouer ici, pas sur le téléphone. */
const COMMANDES = new Set([
  'launchApp', 'stopApp', 'clearState', 'clearKeychain', 'runFlow', 'runScript',
  'tapOn', 'doubleTapOn', 'longPressOn', 'inputText', 'inputRandomText',
  'eraseText', 'pressKey', 'back', 'scroll', 'scrollUntilVisible', 'swipe',
  'assertVisible', 'assertNotVisible', 'assertTrue', 'extendedWaitUntil',
  'waitForAnimationToEnd', 'takeScreenshot', 'startRecording', 'stopRecording',
  'copyTextFrom', 'pasteText', 'evalScript', 'repeat', 'openLink',
  'setAirplaneMode', 'toggleAirplaneMode', 'setLocation', 'travel',
  'hideKeyboard', 'killApp', 'addMedia',
]);

let erreurs = 0;
const ko = (f, m) => { console.log(`  ✗ ${f} — ${m}`); erreurs++; };

/** Numéro ivoirien (10 chiffres consécutifs) ou code secret isolé à 4 chiffres.
 *  Les durées en millisecondes (timeout: 45000) ne doivent PAS déclencher : on
 *  ne regarde donc que les chaînes entre guillemets, jamais les nombres nus. */
function identifiantEnDur(ligne) {
  // On ignore ce qui est manifestement une variable d'environnement.
  if (/\$\{MAESTRO_/.test(ligne)) return null;
  const chaines = ligne.match(/"[^"]*"|'[^']*'/g) || [];
  for (const c of chaines) {
    if (/\b0[0-9]{9}\b/.test(c)) return `numéro à 10 chiffres en dur : ${c.slice(0, 4)}…`;
    if (/^["'][0-9]{4}["']$/.test(c)) return `code à 4 chiffres en dur : ${c.replace(/[0-9]/g, '•')}`;
  }
  return null;
}

function fichiers(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...fichiers(p));
    else if (e.name.endsWith('.yaml')) out.push(p);
  }
  return out;
}

const liste = fichiers(RACINE).sort();
console.log(`\nValidation des flows Maestro — ${liste.length} fichiers\n`);

for (const f of liste) {
  const texte = readFileSync(f, 'utf8');
  const lignes = texte.split('\n');

  // ── 3 · AUCUN IDENTIFIANT EN DUR (sur tout le fichier, commentaires compris)
  lignes.forEach((l, i) => {
    const d = identifiantEnDur(l);
    if (d) ko(f, `ligne ${i + 1} : ${d}`);
  });

  // Le corps du flow commence après le séparateur `---`.
  const sep = lignes.findIndex((l) => l.trim() === '---');
  if (sep === -1) {
    if (!f.endsWith('config.yaml')) ko(f, 'aucun séparateur `---` : ce fichier ne contient pas de commandes');
    continue;
  }

  let vues = 0;
  for (let i = sep + 1; i < lignes.length; i++) {
    const l = lignes[i];
    // Une commande de premier niveau : « - nom: … » ou « - nom ».
    const m = l.match(/^- ([A-Za-z]+)(:|$)/);
    if (!m) continue;
    vues++;
    const nom = m[1];
    // ── 1 · VOCABULAIRE
    if (!COMMANDES.has(nom)) ko(f, `ligne ${i + 1} : commande inconnue « ${nom} »`);
    // ── 2 · LES runFlow POINTENT SUR UN FICHIER EXISTANT
    if (nom === 'runFlow') {
      const sur1 = l.match(/^- runFlow:\s*(\S.*)$/);
      const cible = sur1 ? sur1[1].trim() : (lignes[i + 1] || '').match(/file:\s*(\S+)/)?.[1];
      if (cible) {
        const chemin = join(cible.startsWith('commun/') || !cible.includes('/') ? RACINE : dirname(f), cible);
        if (!existsSync(chemin)) ko(f, `ligne ${i + 1} : runFlow vers « ${cible} » — fichier absent (${chemin})`);
      }
    }
  }
  if (erreurs === 0 || true) console.log(`  ✓ ${f.padEnd(50)} ${String(vues).padStart(2)} commandes`);
}

console.log(erreurs === 0
  ? '\n✅ Flows valides : vocabulaire connu, runFlow résolus, AUCUN identifiant en dur.\n   (La validité sur appareil, elle, ne se prouve qu\'en les jouant.)\n'
  : `\n❌ ${erreurs} problème(s)\n`);
process.exit(erreurs === 0 ? 0 : 1);
