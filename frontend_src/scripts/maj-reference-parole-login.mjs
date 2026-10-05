/**
 * ONE-SHOT (05/10/2026, lot P1 audit auth) — mise à jour CHIRURGICALE de la
 * référence voix-trace : SEULE l'entrée `appels['components/auth/LoginPassword.tsx']`
 * est recalculée. Les empreintes des autres fichiers (dont les 4 rouges
 * VOICE-01 réservées à Patrick) ne sont PAS touchées — un `--regenerer`
 * complet aurait re-figé des divergences non relues.
 *
 * Justification de l'évolution VOULUE (audit AUTH-03/04) :
 *   - parle(message) [verrou + avertissement] → parle(ENTREE_VOICE_CLIPS.*.texte)
 *   - parle(chiffresEpeles(phone)) supprimé → relecture VISUELLE (AUTH-04)
 *   - parleSuite(relecture, ...) → parleSuite(...) sans le segment muet
 * Usage : node scripts/maj-reference-parole-login.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ICI = dirname(fileURLToPath(import.meta.url));
const SRC = join(ICI, '..', 'src', 'app');
const FIXTURE = join(ICI, 'fixtures', 'parole-3917bb7.json');
const FICHIER = 'components/auth/LoginPassword.tsx';
const APPELS = /\b(speak|speakAuto|managerSpeak|ttsSpeak|ttsPlayBase64|speakClipOrText|playClip|speakDynamic|speakBrowser|parle|parleSuite|direIntro)\(/g;

const sha = (s) => createHash('sha256').update(s).digest('hex');

function sansCommentaires(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
}

function inventaire(src) {
  const code = sansCommentaires(src);
  const out = [];
  let m;
  APPELS.lastIndex = 0;
  while ((m = APPELS.exec(code)) !== null) {
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

const ref = JSON.parse(readFileSync(FIXTURE, 'utf8'));
const nouveau = inventaire(readFileSync(join(SRC, FICHIER), 'utf8'));

console.log(`Référence ${ref.reference} — mise à jour de ${FICHIER} :`);
const avant = ref.appels[FICHIER] || [];
const maxL = Math.max(avant.length, nouveau.length);
for (let i = 0; i < maxL; i++) {
  const a = avant[i] ?? '(absent)';
  const b = nouveau[i] ?? '(absent)';
  if (a !== b) console.log(`  #${i}\n    avant : ${a}\n    après : ${b}`);
}
console.log(`  total : ${avant.length} → ${nouveau.length} appels`);

ref.appels[FICHIER] = nouveau;
writeFileSync(FIXTURE, JSON.stringify(ref, null, 2) + '\n');
console.log('Référence mise à jour (empreintes et autres fichiers inchangés).');
