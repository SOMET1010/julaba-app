#!/usr/bin/env node
/**
 * INGÉRER UN LOT DE MASTERS .WAV — VOIX-ING-01.
 *
 * Usage :
 *   node scripts/voix/ingerer-clips.mjs <dossier-wav> [--csv <textes.csv>] [--ecrire]
 *
 * Sans `--ecrire`, le script ne fait que MESURER et rendre compte : rien n'est
 * converti, rien n'est déposé, rien n'est modifié. C'est le mode par défaut,
 * parce qu'un lot de voix se contrôle avant de s'installer.
 *
 * POURQUOI CE SCRIPT EXISTE. Le lot arrive d'un tiers, par un pont manuel. À
 * l'arrivée, cinq choses peuvent être fausses sans que personne le voie :
 *   1. un fichier manquant ou en trop ;
 *   2. un format qui n'est pas celui demandé (fréquence, canaux, profondeur) ;
 *   3. un niveau hors tolérance — on l'entend comme une rupture au milieu
 *      d'une phrase enchaînée avec un clip humain ;
 *   4. un silence de tête qui fait un trou à l'enchaînement ;
 *   5. et surtout : un TEXTE qui ne correspond pas à ce que l'application dit,
 *      auquel cas le clip ne sera JAMAIS joué, sans erreur ni trace.
 *
 * Le cinquième est le seul qui soit invisible à l'écoute. C'est pour lui que le
 * CSV `fichier,texte_exact_prononce` est exigé du fournisseur.
 *
 * CE QUE LE SCRIPT NE FAIT PAS : dire si un clip sonne juste. Ça s'écoute.
 */
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, basename } from 'node:path';

const RACINE = process.cwd();
const LOT = join(RACINE, 'docs/voix/LOT-A-ENREGISTRER.csv');
const SORTIE_DEFAUT = join(RACINE, 'frontend_src/public/voix/tata');

// Tolérances. Elles viennent des 128 clips humains déjà en place, mesurés.
const CIBLE_LUFS = -16, TOLERANCE_LUFS = 1.0;
const CIBLE_HZ = 24000, SILENCE_MAX_S = 0.10;

const args = process.argv.slice(2);
const dossier = args.find((a) => !a.startsWith('--'));
const ecrire = args.includes('--ecrire');
const csvTextes = args[args.indexOf('--csv') + 1];
// `--sortie` permet d'éprouver la chaîne complète sans rien déposer dans le
// dépôt. Un essai à blanc qui écrit au bon endroit n'est plus un essai.
const SORTIE = args.includes('--sortie') ? args[args.indexOf('--sortie') + 1] : SORTIE_DEFAUT;
if (!dossier || !existsSync(dossier)) {
  console.error('Usage : node scripts/voix/ingerer-clips.mjs <dossier-wav> [--csv <textes.csv>] [--ecrire]');
  process.exit(2);
}

const G = '"';
function lireCsv(chemin) {
  const t = readFileSync(chemin, 'utf8').replace(/^\uFEFF/, '');
  const L = []; let c = '', cur = [], q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === G) { if (t[i + 1] === G) { c += G; i++; } else q = false; } else c += ch; }
    else if (ch === G) q = true;
    else if (ch === ',') { cur.push(c); c = ''; }
    else if (ch === '\n') { cur.push(c); c = ''; L.push(cur); cur = []; }
    else if (ch !== '\r') c += ch;
  }
  if (c || cur.length) { cur.push(c); L.push(cur); }
  return L;
}
const normClip = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const ff = (bin, a) => execFileSync(bin, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });

/**
 * LIRE CE QUE FFMPEG DIT, MÊME QUAND IL RÉUSSIT.
 *
 * Le piège, trouvé à l'essai à blanc : `ebur128` et `silencedetect` écrivent
 * leurs mesures sur STDERR, y compris quand la commande se termine bien. Une
 * première version ne lisait stderr que dans le `catch` — donc, sur un fichier
 * parfaitement lisible, elle ne récoltait RIEN, et le script annonçait « tous
 * conformes » sur un lot contenant un clip à -6,3 LUFS et un autre avec une
 * demi-seconde de silence en tête.
 *
 * Un contrôle qui ne voit rien répond comme un contrôle qui ne trouve rien.
 * C'est la panne la plus dangereuse pour un outil de vérification.
 */
const ffmpegSortie = (a) => {
  const r = spawnSync('ffmpeg', a, { encoding: 'utf8', maxBuffer: 1 << 26 });
  return String(r.stderr || '') + String(r.stdout || '');
};

function sonde(f) {
  const j = JSON.parse(ff('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', f]));
  const s = (j.streams || []).find((x) => x.codec_type === 'audio') || {};
  const brut = ffmpegSortie(['-hide_banner', '-nostats', '-i', f, '-af', 'ebur128=framelog=quiet,astats=metadata=1', '-f', 'null', '-']);
  const lufs = parseFloat((brut.match(/I:\s+(-?[\d.]+) LUFS/) || [])[1]);
  const peak = parseFloat((brut.match(/Peak:\s+(-?[\d.]+) dBFS/) || [])[1]);
  // silences de tête et de queue, au seuil -50 dB
  const det = ffmpegSortie(['-hide_banner', '-nostats', '-i', f, '-af', 'silencedetect=noise=-50dB:d=0.05', '-f', 'null', '-']);
  const debuts = [...det.matchAll(/silence_start:\s*(-?[\d.]+)/g)].map((m) => parseFloat(m[1]));
  const fins = [...det.matchAll(/silence_end:\s*([\d.]+)/g)].map((m) => parseFloat(m[1]));
  const duree = parseFloat(j.format?.duration || s.duration || 0);
  const teteS = debuts.length && debuts[0] <= 0.01 && fins.length ? fins[0] : 0;
  const queueS = debuts.length && debuts[debuts.length - 1] > 0 && fins.length < debuts.length
    ? duree - debuts[debuts.length - 1] : 0;
  return {
    hz: +s.sample_rate || 0, canaux: +s.channels || 0, codec: s.codec_name,
    bits: +(s.bits_per_sample || s.bits_per_raw_sample) || 0,
    duree, lufs, peak, teteS, queueS,
  };
}

// ── 1. ce qui est attendu
const lot = lireCsv(LOT).slice(1).filter((l) => l.length >= 2);
const attendu = new Map(lot.map((l) => [l[0].replace(/\.wav$/i, ''), l[1]]));

// ── 2. ce qui est arrivé
const livres = readdirSync(dossier).filter((f) => /\.wav$/i.test(f)).sort();
const nomsLivres = new Set(livres.map((f) => f.replace(/\.wav$/i, '')));

console.log(`\n── LOT ATTENDU : ${attendu.size} · REÇU : ${livres.length} ──\n`);
let dur = 0;
const manquants = [...attendu.keys()].filter((n) => !nomsLivres.has(n));
const enTrop = [...nomsLivres].filter((n) => !attendu.has(n));
if (manquants.length) { dur++; console.log(`❌ ${manquants.length} manquant(s) : ${manquants.join(', ')}`); }
if (enTrop.length)   { dur++; console.log(`❌ ${enTrop.length} en trop : ${enTrop.join(', ')}`); }
if (!manquants.length && !enTrop.length) console.log('✅ la liste correspond exactement');

// ── 3. les textes réellement prononcés
let prononce = null;
if (csvTextes && existsSync(csvTextes)) {
  const rows = lireCsv(csvTextes).slice(1).filter((l) => l.length >= 2);
  prononce = new Map(rows.map((l) => [l[0].replace(/\.wav$/i, ''), l[1]]));
  console.log(`\n── TEXTES : ${prononce.size} ligne(s) lue(s) ──`);
  let ecarts = 0;
  for (const [nom, attenduTxt] of attendu) {
    const dit = prononce.get(nom);
    if (dit === undefined) { console.log(`  ·  ${nom} — aucun texte fourni`); continue; }
    if (normClip(dit) !== normClip(attenduTxt)) {
      ecarts++;
      console.log(`  ⚠ ${nom}\n      attendu : « ${attenduTxt} »\n      prononcé: « ${dit} »`);
    }
  }
  console.log(ecarts === 0
    ? '✅ chaque clip dit exactement ce que l\'application dira'
    : `⚠ ${ecarts} écart(s) — à trancher un par un : accepté, ou prise à refaire`);
} else {
  console.log('\n⚠ AUCUN CSV DE TEXTES. C\'est le seul défaut qu\'on n\'entend pas :');
  console.log('  un texte qui diverge fait un clip jamais joué, sans erreur ni trace.');
}

// ── 4. mesure fichier par fichier
console.log('\n── FORMAT ET NIVEAU ──');
const anomalies = [];
for (const f of livres) {
  const nom = f.replace(/\.wav$/i, '');
  const m = sonde(join(dossier, f));
  const pb = [];
  if (m.hz < CIBLE_HZ) pb.push(`${m.hz} Hz — SOUS la cible, on ne remonte pas`);
  if (m.canaux !== 1) pb.push(`${m.canaux} canaux`);
  if (Number.isFinite(m.lufs) && Math.abs(m.lufs - CIBLE_LUFS) > TOLERANCE_LUFS) pb.push(`${m.lufs} LUFS`);
  if (Number.isFinite(m.peak) && m.peak > -1) pb.push(`crête ${m.peak} dBFS`);
  if (m.teteS > SILENCE_MAX_S) pb.push(`${m.teteS.toFixed(2)} s de silence en tête`);
  if (m.queueS > SILENCE_MAX_S) pb.push(`${m.queueS.toFixed(2)} s en queue`);
  if (pb.length) { anomalies.push({ nom, pb }); console.log(`  ⚠ ${nom.padEnd(14)} ${pb.join(' · ')}`); }
}
console.log(anomalies.length === 0
  ? '✅ tous conformes'
  : `⚠ ${anomalies.length} fichier(s) hors tolérance — la conversion corrige niveau et silences, pas la fréquence`);

// ── 5. conversion (seulement avec --ecrire)
if (!ecrire) {
  console.log('\nMode mesure. Rien n\'a été écrit. Ajoute --ecrire pour convertir et déposer.\n');
  process.exit(dur ? 1 : 0);
}
if (dur) { console.error('\nListe incorrecte : on ne convertit pas un lot dont on ne sait pas ce qu\'il contient.\n'); process.exit(1); }

/**
 * UN FICHIER SOUS-ÉCHANTILLONNÉ NE DEVIENT PAS CONFORME EN LE RÉ-ÉCHANTILLONNANT.
 *
 * Trouvé à l'essai à blanc : un master livré en 16 kHz ressortait en MP3
 * « 24 kHz » après conversion, et plus rien ensuite ne disait qu'il n'avait
 * jamais eu ces aigus. ffmpeg fait ce qu'on lui demande, en silence. C'est
 * exactement la faute qu'on refuse partout ailleurs : une donnée qui change de
 * sens en aval, sans que personne ne l'ait décidé.
 *
 * On refuse donc le lot entier. Le fichier fautif se re-livre ; il ne se
 * répare pas.
 */
const sousEchantillonnes = anomalies.filter((a) => a.pb.some((p) => /SOUS la cible/.test(p)));
if (sousEchantillonnes.length) {
  console.error(`\n❌ ${sousEchantillonnes.length} master(s) sous la fréquence cible : ${sousEchantillonnes.map((a) => a.nom).join(', ')}`);
  console.error('   Les remonter à 24 kHz inventerait des aigus qui n\'ont pas été enregistrés.');
  console.error('   À faire re-livrer. Rien n\'a été converti.\n');
  process.exit(1);
}

mkdirSync(SORTIE, { recursive: true });
console.log('\n── CONVERSION → MP3 96 kbps / 24 kHz / mono, -16 LUFS en deux passes ──');
const entrees = [];
for (const f of livres) {
  const nom = f.replace(/\.wav$/i, '');
  const src = join(dossier, f), dst = join(SORTIE, nom + '.mp3');
  const coupe = 'silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB:detection=peak,'
              + 'areverse,silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB:detection=peak,areverse';
  // passe 1 : mesurer
  const sortie1 = ffmpegSortie(['-hide_banner', '-nostats', '-i', src,
    '-af', `${coupe},loudnorm=I=-16:TP=-1:LRA=11:print_format=json`, '-f', 'null', '-']);
  const bloc = sortie1.slice(sortie1.lastIndexOf('{'));
  let mesure = null;
  try { mesure = JSON.parse(bloc); } catch { /* passe simple en repli */ }
  const ln = mesure
    ? `loudnorm=I=-16:TP=-1:LRA=11:measured_I=${mesure.input_i}:measured_TP=${mesure.input_tp}`
      + `:measured_LRA=${mesure.input_lra}:measured_thresh=${mesure.input_thresh}:offset=${mesure.target_offset}:linear=true`
    : 'loudnorm=I=-16:TP=-1:LRA=11';
  ff('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src,
    '-af', `${coupe},${ln}`, '-ac', '1', '-ar', String(CIBLE_HZ),
    '-codec:a', 'libmp3lame', '-b:a', '96k', dst]);
  entrees.push({ file: `/voix/tata/${nom}.mp3`, text: attendu.get(nom) });
  process.stdout.write('.');
}
console.log(`\n✅ ${entrees.length} fichier(s) déposé(s) dans ${SORTIE}`);

// ── 6. les lignes à coller dans TATA_UI_CLIPS
const lignes = entrees
  .map((e) => `  { file: ${JSON.stringify(e.file)}, text: ${JSON.stringify(e.text)} },`)
  .join('\n');
writeFileSync(join(RACINE, 'docs/voix/ENTREES-TATA-UI-CLIPS.txt'),
  `// ${entrees.length} entrées à insérer dans services/tataUiClips.ts (TATA_UI_CLIPS)\n${lignes}\n`);
console.log('✅ docs/voix/ENTREES-TATA-UI-CLIPS.txt écrit — à insérer dans TATA_UI_CLIPS.\n');
