/**
 * AUCUN MICRO NE REPART NU — MIC-01.
 * Lancer : npm run test:micro-contraint   (tsx, sans DOM ni navigateur)
 *
 * LE DÉFAUT QU'ON FERME. Trois chemins ouvraient le micro par
 * `getUserMedia({ audio: true })` : `BoutonDirePrix`, `BoutonDireProduit`,
 * `LoginPassword`. Ce sont exactement les trois endroits où l'oreille s'ouvre
 * JUSTE APRÈS une phrase dite par l'application. Sans `echoCancellation`, le
 * micro du téléphone entend son propre haut-parleur : la queue de la voix de
 * Tantie entre dans le tampon de `startLiveDictation` et part au moteur comme
 * si la marchande avait parlé. Un chiffre venu de la question peut ainsi se
 * poser dans un prix ou dans un numéro de téléphone — et rien, à l'écran, ne
 * distingue ce chiffre-là de celui qu'elle a dit.
 *
 * CE QUE CE BANC INTERDIT, ET POURQUOI IL LIT LA SOURCE. Le défaut ne vit pas
 * dans une fonction qu'on pourrait appeler ici : il vit dans l'ARGUMENT passé
 * au navigateur, à l'endroit de l'appel. Seule la lecture de la source le voit
 * — même méthode que `components/marchand/venteVocaleSansPrix.test.mts`.
 *
 *   1. le réglage est UNIQUE (`services/contraintesMicro`), jamais recopié :
 *      recopié, il dérive, et le même geste serait entendu de deux façons
 *      selon l'écran — « ne jamais donner deux sens à la même donnée » ;
 *   2. tout chemin qui DICTE (`startLiveDictation`) ouvre son micro avec ce
 *      réglage — règle générale, pas liste de trois fichiers : un quatrième
 *      écran de dictée tombera dessus le jour où il sera écrit ;
 *   3. plus aucun `getUserMedia` audio nu dans le dépôt, sauf des exemptions
 *      dont ce banc VÉRIFIE lui-même le motif. Une exemption qui ne serait
 *      qu'une ligne de liste serait un trou avec un nom.
 *
 * CE QU'IL NE PROUVE PAS : que le matériel honore les contraintes. Elles sont
 * des souhaits (valeurs nues, jamais `{ exact }`) : un appareil qui ne sait pas
 * annuler l'écho rend quand même un flux, et la dictée marche comme avant.
 * Jamais de micro mort pour un réglage de confort.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONTRAINTES_MICRO_DICTEE } from './contraintesMicro.js';

let echecs = 0;
const ok = (cond: boolean, quoi: string) => {
  if (cond) console.log('  ✅', quoi);
  else { console.log('  ❌', quoi); echecs++; }
};

/** Racine des sources (rejouable sur un autre état du dépôt : la passer en argument). */
const SRC = process.argv[2] ?? fileURLToPath(new URL('..', import.meta.url));

/** Code sans commentaires : on cherche du CODE, pas les récits d'incident. */
const sansCommentaires = (src: string) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

function fichiersSource(dossier: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dossier, { withFileTypes: true })) {
    const p = join(dossier, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') fichiersSource(p, acc); continue; }
    if (!/\.(ts|tsx)$/.test(e.name)) continue;
    if (/\.test\.|\.d\.ts$/.test(e.name)) continue; // les harnais simulent des micros : ce n'en sont pas
    acc.push(p);
  }
  return acc;
}

const chemin = (abs: string) => relative(SRC, abs).split(sep).join('/');
const lire = (abs: string) => sansCommentaires(readFileSync(abs, 'utf8'));

/** L'argument (parenthèses équilibrées) de chaque `getUserMedia(...)` du fichier. */
function appelsMicro(code: string): string[] {
  const out: string[] = [];
  const re = /getUserMedia\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    let i = m.index + m[0].length, prof = 1;
    while (i < code.length && prof > 0) {
      const c = code[i];
      if (c === '(') prof++; else if (c === ')') prof--;
      i++;
    }
    out.push(code.slice(m.index + m[0].length, i - 1).replace(/\s+/g, ' ').trim());
  }
  return out;
}

const SOURCES = fichiersSource(SRC);

// ── 1. Le réglage lui-même ──────────────────────────────────────────────────
console.log('\n[1] Le réglage unique porte bien l’anti-écho');
{
  const a = CONTRAINTES_MICRO_DICTEE.audio;
  const audio = (typeof a === 'object' && a !== null ? a : {}) as MediaTrackConstraints & Record<string, unknown>;
  ok(typeof a === 'object' && a !== null, "`audio` est un objet de contraintes, pas `true` (obtenu " + JSON.stringify(a) + ')');
  ok(audio.echoCancellation === true, "`echoCancellation` : le micro ne reprend pas la voix de Tantie — c'est la raison d'être du module");
  ok(audio.noiseSuppression === true, '`noiseSuppression` : le marché à midi n’a pas à être transcrit');
  ok(audio.autoGainControl === true, '`autoGainControl` : personne ne lui écrira jamais à quelle distance tenir le téléphone');
  ok(audio.channelCount === 1, '`channelCount: 1` : `startLiveDictation` ne lit que getChannelData(0)');
  // ARBITRAGE FIGÉ ICI, SUR PREUVE. `startLiveDictation` ne lit JAMAIS le taux
  // de la piste : il crée son AudioContext sans options, le
  // MediaStreamAudioSourceNode rééchantillonne vers `ctx.sampleRate` (journal
  // terrain : 48 000, et la dictée marche), et c'est CE taux-là qui part au
  // moteur, qui rééchantillonne lui-même à 16 kHz. Forcer 16 000 sur la piste
  // ne changerait rien en aval et exposerait à un `OverconstrainedError` sur un
  // appareil qui ne sert pas ce taux : un risque pour un gain prouvé nul.
  ok(!('sampleRate' in audio), '`sampleRate` n’est PAS forcé : gain nul sur ce pipeline, risque réel (voir l’en-tête du module)');
}
{
  const src = readFileSync(join(SRC, 'services/contraintesMicro.ts'), 'utf8');
  ok(/ctx\.sampleRate/.test(src) && /OverconstrainedError/.test(src),
     'et le module ÉCRIT pourquoi : un lecteur pressé ne doit pas le prendre pour un oubli');
}

// ── 2. Une seule source : le réglage n'est pas recopié ──────────────────────
console.log('\n[2] Une seule source — la liste n’est écrite qu’une fois');
{
  // `hooks/useVoiceCore.ts` est figé par VOICE-01 (empreinte de source) : sa
  // liste en dur lui est antérieure et ce lot n'a pas le droit d'y toucher.
  const PORTEURS_LEGITIMES = new Set(['services/contraintesMicro.ts', 'hooks/useVoiceCore.ts']);
  const recopies = SOURCES.filter(f => /echoCancellation/.test(lire(f)) && !PORTEURS_LEGITIMES.has(chemin(f))).map(chemin);
  ok(recopies.length === 0, `aucun fichier ne réécrit les contraintes à la main (trouvés : ${JSON.stringify(recopies)})`);
}

// ── 3. Tout chemin qui DICTE ouvre son micro avec ce réglage ────────────────
console.log('\n[3] Qui dicte ouvre le micro avec le réglage commun (règle, pas liste)');
{
  // Le producteur de la dictée est exclu : il REÇOIT le flux, il ne l'ouvre pas.
  const dicteurs = SOURCES.filter(f => /startLiveDictation\(/.test(lire(f)) && chemin(f) !== 'voice-offline/offlineStt.ts');
  ok(dicteurs.length >= 3, `au moins les trois chemins connus dictent (trouvés ${dicteurs.length} : ${JSON.stringify(dicteurs.map(chemin))})`);
  for (const f of dicteurs) {
    const code = lire(f);
    const rel = chemin(f);
    if (!/getUserMedia\(/.test(code)) continue; // dicte à partir d'un flux reçu d'ailleurs
    ok(/CONTRAINTES_MICRO_DICTEE/.test(code) && /services\/contraintesMicro/.test(code),
       `${rel} importe et utilise CONTRAINTES_MICRO_DICTEE`);
    for (const arg of appelsMicro(code)) {
      ok(arg === 'CONTRAINTES_MICRO_DICTEE',
         `${rel} : le micro de dictée s’ouvre avec le réglage commun (obtenu « ${arg} »)`);
    }
  }
  // Les trois chemins du terrain, nommément : ce sont eux qu'on a vus nus.
  for (const rel of ['components/marchand/BoutonDirePrix.tsx', 'components/marchand/BoutonDireProduit.tsx', 'components/auth/LoginPassword.tsx']) {
    const code = lire(join(SRC, rel));
    ok(!/getUserMedia\(\s*\{\s*audio:\s*true\s*\}\s*\)/.test(code), `${rel} n’ouvre plus le micro nu`);
  }
}

// ── 4. Le balayage : plus aucun micro nu ailleurs dans le dépôt ─────────────
//
// EXEMPTIONS — chacune porte un motif que ce banc VÉRIFIE. Une exemption
// simplement déclarée serait un trou avec un nom ; elle tombe d'elle-même le
// jour où son motif cesse d'être vrai.
const EXEMPTES: Record<string, { pourquoi: string; verifier: (code: string) => boolean }> = {
  // Figé par VOICE-01 (empreinte de source) : ce lot n'a pas le droit d'y
  // toucher. Il porte DÉJÀ l'anti-écho en dur — et on le vérifie, pour que
  // l'exemption ne survive pas à sa disparition.
  'hooks/useVoiceCore.ts': {
    pourquoi: 'figé VOICE-01, porte déjà les contraintes en dur',
    verifier: (c) => /echoCancellation:\s*true/.test(c) && /noiseSuppression:\s*true/.test(c) && /autoGainControl:\s*true/.test(c),
  },
  // Studio de voix et collecte de corpus : on ENREGISTRE un signal pour le
  // garder, on ne le donne pas à un moteur. L'anti-écho, l'anti-bruit et le
  // gain automatique RETOUCHENT ce signal — appliqués ici, ils abîmeraient la
  // matière même qu'on vient capturer. Et aucun haut-parleur ne parle pendant
  // la prise : le défaut MIC-01 n'existe pas sur ce chemin. L'exemption tient
  // tant que ces écrans enregistrent (MediaRecorder) sans dicter.
  'pages/StudioVoix.tsx': {
    pourquoi: 'prise de voix pour le corpus : le signal doit rester brut',
    verifier: (c) => /new MediaRecorder\(/.test(c) && !/startLiveDictation\(/.test(c),
  },
  'pages/CollecteVoix.tsx': {
    pourquoi: 'collecte de corpus : le signal doit rester brut',
    verifier: (c) => /new MediaRecorder\(/.test(c) && !/startLiveDictation\(/.test(c),
  },
};

console.log('\n[4] Balayage du dépôt : aucun `getUserMedia` audio nu');
{
  const nus: string[] = [];
  for (const f of SOURCES) {
    const code = lire(f);
    const rel = chemin(f);
    for (const arg of appelsMicro(code)) {
      if (/MediaStreamConstraints/.test(arg)) continue;          // signature de type, pas un appel
      if (/CONTRAINTES_MICRO_DICTEE/.test(arg)) continue;        // le réglage commun
      if (/video/.test(arg) && !/audio/.test(arg)) continue;     // caméra (scan de QR) : hors sujet
      if (rel in EXEMPTES) continue;                             // motif vérifié juste après
      nus.push(`${rel} → getUserMedia(${arg})`);
    }
  }
  ok(nus.length === 0, `aucun micro ne s’ouvre hors du réglage commun (trouvés : ${JSON.stringify(nus)})`);
}

console.log('\n[5] Et chaque exemption doit encore mériter son motif');
for (const [rel, { pourquoi, verifier }] of Object.entries(EXEMPTES)) {
  let code = '';
  try { code = lire(join(SRC, rel)); } catch { /* fichier disparu : échec ci-dessous */ }
  ok(code !== '' && verifier(code), `${rel} — ${pourquoi}`);
}

console.log(echecs === 0 ? '\n✅ Tout est vert\n' : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
