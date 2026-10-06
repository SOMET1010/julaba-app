/**
 * VOICE-01 — garde-fou de SOURCE pour l'observabilité voix.
 * Lancer : npm run test:voix-trace-source
 * Régénérer la référence (après une évolution VOULUE et relue de la voix) :
 *   node scripts/test-voix-trace-source.mjs --regenerer
 *
 * DEUX PROMESSES, ET ELLES VONT ENSEMBLE.
 *
 *  A. « Chaque voix qui part et chaque dictée passent par le journal. »
 *     Sinon le Rapport de test ment par omission : une voix entendue sur le
 *     terrain et absente du journal nous renverrait deviner — exactement ce
 *     qu'on veut arrêter (« deux voix », « cinq tomates »).
 *
 *  B. « L'instrumentation ne change RIEN au comportement vocal. »
 *     Aucune phrase ajoutée/retirée/modifiée, aucune règle de choix de voix
 *     touchée, aucun ordre d'appel de speak déplacé. Ce lot est de la recette,
 *     pas du produit : l'expérience vocale appartient à un autre rail (Manus).
 *     Preuve mécanique : dans chaque fichier instrumenté, si l'on retire les
 *     lignes de journalisation (celles qui portent `vtrace.` ou `voiceTrace`),
 *     on retrouve l'empreinte du fichier à la référence (3917bb7). Et
 *     l'inventaire ordonné des appels de parole (site + arguments) est
 *     identique à la référence.
 *
 *  C. « Le bouton Rapport de test est atteignable SANS se déconnecter. »
 *     Celui de l'écran de connexion obligeait à perdre la session pour
 *     l'envoyer — un défaut d'instrumentation en soi.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ICI = dirname(fileURLToPath(import.meta.url));
const SRC = join(ICI, '..', 'src', 'app');
const FIXTURE = join(ICI, 'fixtures', 'parole-3917bb7.json');
const REGENERER = process.argv.includes('--regenerer');

const MARQUEUR = /vtrace\.|voiceTrace/;

// Fichiers où l'on N'A LE DROIT d'ajouter QUE des lignes de journal.
// (Les trois écrans du rail design — POSCaisse, MicroVenteCaisse,
// MarchandAccueilVoice — ne sont pas listés : ils appartiennent à d'autres
// lots et bougent en parallèle ; leur intégrité est prouvée par `git diff`.)
const INSTRUMENTES = [
  'services/audioManager.ts',
  'services/elevenlabs.ts',
  'hooks/useVoiceCore.ts',
  'contexts/AppContext.tsx',
  'voice-offline/offlineStt.ts',
  'voice-offline/nativeTts.ts',
  'components/layout/AppLayout.tsx',
];
// Fichiers porteurs d'une RÈGLE DE CHOIX de voix ou de phrases : intouchables
// par ce lot (empreinte brute).
const REGLES_DE_VOIX = [
  'services/tataVoice.ts',
  'services/tataUiClips.ts',
  'services/localVoiceChoice.ts',
  'services/voicePacksRuntime.ts',
  'services/onboardingVoix.ts',
  'voice-offline/nativeStt.ts',
  'contexts/ObjectifContext.tsx',
];
// Fichiers dont on inventorie les APPELS DE PAROLE (site + arguments, ordre).
const INVENTORIES = [
  ...INSTRUMENTES,
  ...REGLES_DE_VOIX,
  'components/auth/LoginPassword.tsx',
  'components/shared/UniversalParametres.tsx',
];

const APPELS = /\b(speak|speakAuto|managerSpeak|ttsSpeak|ttsPlayBase64|speakClipOrText|playClip|speakDynamic|speakBrowser|parle|parleSuite|direIntro)\(/g;

const lire = (rel) => readFileSync(join(SRC, rel), 'utf8');
const sha = (s) => createHash('sha256').update(s).digest('hex');

/** Code sans commentaires (on cherche du CODE, pas les récits d'incident). */
function sansCommentaires(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
}

/** Retire les lignes de journalisation : ce qui reste doit être le fichier d'origine. */
function sansJournal(src) {
  return src.split('\n').filter((l) => !MARQUEUR.test(l)).join('\n');
}

/** Inventaire ordonné des appels de parole : `nom(arguments)` à parenthèses équilibrées. */
function inventaire(src) {
  const code = sansCommentaires(src);
  const out = [];
  let m;
  APPELS.lastIndex = 0;
  while ((m = APPELS.exec(code)) !== null) {
    // Déclarations (`function speak(`) : on ne garde que les APPELS.
    const avant = code.slice(Math.max(0, m.index - 20), m.index);
    if (/function\s+$/.test(avant)) continue;
    let i = m.index + m[0].length;
    let prof = 1;
    while (i < code.length && prof > 0) {
      const c = code[i];
      if (c === '(') prof++;
      else if (c === ')') prof--;
      i++;
    }
    const args = code.slice(m.index + m[0].length, i - 1).replace(/\s+/g, ' ').trim();
    out.push(`${m[1]}(${args})`);
  }
  return out;
}

function calculer() {
  const empreintes = {};
  for (const f of INSTRUMENTES) empreintes[f] = sha(sansJournal(lire(f)));
  for (const f of REGLES_DE_VOIX) empreintes[f] = sha(lire(f));
  const appels = {};
  for (const f of INVENTORIES) appels[f] = inventaire(lire(f));
  return { reference: '3917bb7', empreintes, appels };
}

if (REGENERER) {
  writeFileSync(FIXTURE, JSON.stringify(calculer(), null, 2) + '\n');
  console.log(`Référence régénérée : ${FIXTURE}`);
  process.exit(0);
}

let echecs = 0;
const verifier = (quoi, ok, pourquoi) => {
  if (ok) { console.log(`  ✓ ${quoi}`); return; }
  echecs++;
  console.log(`  ✗ ${quoi}`);
  if (pourquoi) console.log(`      ${pourquoi}`);
};

/** Corps d'une fonction/const de premier niveau : de sa déclaration à la 1re ligne `}` ou `};` en colonne 0. */
function corps(src, debutRegex) {
  const m = debutRegex.exec(src);
  if (!m) return null;
  const reste = src.slice(m.index);
  const fin = reste.search(/\n\}[;]?\n/);
  return fin === -1 ? reste : reste.slice(0, fin);
}

// ── A. Tout passe par le journal ────────────────────────────────────────────
console.log('\nA. Chaque voix qui part, chaque dictée, chaque intention passent par le journal');
{
  const am = lire('services/audioManager.ts');
  verifier('audioManager importe le journal', /from ["']\.\.\/utils\/voiceTrace["']/.test(am));
  for (const fn of ['speak', 'speakAuto', 'playClip', 'speakClipOrText', 'speakDynamic']) {
    const c = corps(am, new RegExp(`^export function ${fn}\\(`, 'm'));
    verifier(`audioManager.${fn}() journalise la demande`, !!c && /vtrace\.ttsDemande\(/.test(c),
      'une voix partie sans trace : le rapport mentirait par omission');
  }
  const rst = corps(am, /^function realStartTts\(/m);
  verifier('realStartTts journalise le MOTEUR retenu par morceau (native / navigateur)', !!rst && /vtrace\.ttsMoteur\(/.test(rst));
  const rsc = corps(am, /^function realStartClip\(/m);
  verifier('realStartClip journalise le moteur « clip »', !!rsc && /vtrace\.ttsMoteur\(\s*['"]clip['"]/.test(rsc));
  const hs = corps(am, /^function hardStop\(/m);
  verifier('hardStop journalise l\'interruption (TTS_COUPEE)', !!hs && /vtrace\.ttsCoupee\(/.test(hs));
  const ph = corps(am, /^async function playHandle\(/m);
  verifier('playHandle journalise début et fin de lecture (durée)', !!ph && /vtrace\.ttsDebut\(/.test(ph) && /vtrace\.ttsFin\(/.test(ph));
  const re = corps(am, /^function runExclusive\(/m);
  verifier('runExclusive journalise les demandes IGNORÉES (muet, anti-répétition, auto en cours)',
    !!re && (re.match(/vtrace\.ttsIgnoree\(/g) || []).length >= 3);

  const el = lire('services/elevenlabs.ts');
  const sb = corps(el, /^export function speakBrowser\(/m);
  verifier('speakBrowser journalise la voix native retenue (nom, langue)', !!sb && /vtrace\.ttsVoixNavigateur\(/.test(sb));

  const vc = lire('hooks/useVoiceCore.ts');
  verifier('useVoiceCore importe le journal', /from ["']\.\.\/utils\/voiceTrace["']/.test(vc));
  const ts = corps(vc, /^async function ttsSpeak\(/m);
  verifier('useVoiceCore.ttsSpeak journalise l\'appel ET le choix clip / text_only',
    !!ts && /vtrace\.ttsAppel\(/.test(ts) && /vtrace\.ttsChoix\(/.test(ts));
  const tb = corps(vc, /^async function ttsPlayBase64\(/m);
  verifier('useVoiceCore.ttsPlayBase64 journalise l\'appel', !!tb && /vtrace\.ttsAppel\(/.test(tb));
  const lignes = sansCommentaires(vc).split('\n');
  const suiviPar = (regexSite, regexTrace, n = 3) => {
    const sites = lignes.map((l, i) => (regexSite.test(l) ? i : -1)).filter((i) => i >= 0);
    return sites.length > 0 && sites.every((i) => lignes.slice(i + 1, i + 1 + n).some((l) => regexTrace.test(l)));
  };
  verifier('chaque appel à intentLocal() est suivi d\'une trace INTENTION',
    suiviPar(/\bintentLocal\(/, /vtrace\.intention\(/));
  verifier('chaque transcribeWav() est suivi d\'une trace STT_FIN (transcript brut + moteur + durée)',
    suiviPar(/await transcribeWav\(/, /vtrace\.sttFin\(/));
  verifier('la réponse oui/non dictée est journalisée comme intention',
    suiviPar(/= interpretYesNo\(/, /vtrace\.intention\(/));
  verifier('la question « chiffres du jour » est journalisée comme intention',
    suiviPar(/const question = detecterQuestion\(/, /vtrace\.intention\(/));
  verifier('début/fin d\'écoute journalisés', /vtrace\.ecoute\(\s*['"]debut['"]/.test(vc) && /vtrace\.ecoute\(\s*['"]fin['"]/.test(vc));

  const ac = lire('contexts/AppContext.tsx');
  const sp = corps(ac, /^  const speak = async \(text: string\) =>/m);
  verifier('AppContext.speak journalise l\'appel (source des voix d\'écran)', !!sp && /vtrace\.ttsAppel\(/.test(sp));
  verifier('AppContext.speak journalise ses refus (rôle, muet)', !!sp && (sp.match(/vtrace\.ttsIgnoree\(/g) || []).length >= 2);

  const st = lire('voice-offline/offlineStt.ts');
  verifier('la dictée en direct (connexion) journalise chaque passe STT (moteur + durée)', /vtrace\.sttFin\(/.test(st));
  verifier('la sonde du moteur STT est journalisée', /STT_SONDE/.test(st));
  const nt = lire('voice-offline/nativeTts.ts');
  verifier('la sonde de la synthèse native est journalisée', /TTS_NATIF_SONDE/.test(nt));
  const al = lire('components/layout/AppLayout.tsx');
  verifier('l\'arrivée sur un écran est journalisée (ECRAN)', /vtrace\.ecran\(/.test(al));
}

// ── B. Rien d'autre n'a bougé ───────────────────────────────────────────────
console.log('\nB. L\'instrumentation ne change ni phrase, ni règle de choix de voix, ni ordre d\'appel');
{
  verifier('la référence 3917bb7 existe (scripts/fixtures/parole-3917bb7.json)', existsSync(FIXTURE));
  if (existsSync(FIXTURE)) {
    const ref = JSON.parse(readFileSync(FIXTURE, 'utf8'));
    const cur = calculer();
    for (const f of INSTRUMENTES) {
      verifier(`${f} : sans ses lignes de journal, identique à ${ref.reference}`, ref.empreintes[f] === cur.empreintes[f],
        'seules des lignes entières portant `vtrace.` / `voiceTrace` peuvent être ajoutées ici ; toute autre modification est hors lot');
    }
    for (const f of REGLES_DE_VOIX) {
      verifier(`${f} : règle de choix de voix intouchée`, ref.empreintes[f] === cur.empreintes[f]);
    }
    for (const f of INVENTORIES) {
      const a = JSON.stringify(ref.appels[f]);
      const b = JSON.stringify(cur.appels[f]);
      let detail;
      if (a !== b) {
        const ra = ref.appels[f] || [];
        const rb = cur.appels[f] || [];
        const k = ra.findIndex((x, i) => x !== rb[i]);
        detail = `1er écart #${k} : référence « ${ra[k] ?? '(absent)'} » / actuel « ${rb[k] ?? '(absent)'} »`;
      }
      verifier(`${f} : mêmes appels de parole, mêmes arguments, même ordre (${(cur.appels[f] || []).length})`, a === b, detail);
    }
  }
}

// ── C. Bouton atteignable sans se déconnecter ───────────────────────────────
console.log('\nC. « Rapport de test » atteignable connecté');
{
  const up = lire('components/shared/UniversalParametres.tsx');
  verifier('Paramètres (UniversalParametres) propose « Rapport de test »', /Rapport de test/.test(up));
  verifier('… en réutilisant vlogPartager() (un seul rapport, une seule source)', /vlogPartager\(\)/.test(up));
  const lp = lire('components/auth/LoginPassword.tsx');
  verifier('celui de l\'écran de connexion est conservé', /Rapport de test/.test(lp) && /vlogPartager\(\)/.test(lp));
}

console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est vert');
process.exit(echecs ? 1 : 0);
