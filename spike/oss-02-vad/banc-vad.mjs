/**
 * OSS-02 — BANC DE COMPARAISON : MIC-01 (maison) vs SHERPA VAD.
 *
 * SPIKE SEUL. Aucun fichier de production n'est touché, rien n'est remplacé.
 *
 * CE QUI EST COMPARÉ, et pourquoi c'est comparable : les DEUX détecteurs
 * reçoivent EXACTEMENT les mêmes échantillons, lus du même WAV 16 kHz mono.
 *
 * MIC-01 EST REJOUÉ, PAS RÉÉCRIT. Les seuils viennent de
 * `frontend_src/src/app/services/ecouteCaisse.ts` :
 *     NIVEAU_PAROLE 12 · SILENCE_FIN_MS 1500 · ECOUTE_MAX_MS 12000
 *     AVANT_PREMIER_MOT_MS 6000
 * et la décision est la transcription littérale de `finDEcoute`.
 *
 * LE NIVEAU EST LE PLUS DÉLICAT, et sans lui on ne comparerait rien. Dans
 * l'application il vient d'un `AnalyserNode` du navigateur :
 *     fftSize 512 · getByteFrequencyData · moyenne des 256 bins · ×2,5 · max 100
 * On reproduit ici la spec Web Audio de `getByteFrequencyData` — fenêtre de
 * Blackman, FFT, lissage temporel 0,8, conversion en dB, clamp [-100, -30] et
 * mise à l'échelle sur 0-255. Approcher ce niveau « à la louche » reviendrait à
 * comparer Sherpa à une invention, pas à MIC-01.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import sherpa from 'sherpa-onnx-node';

// ── Lecture WAV 16 bits mono ────────────────────────────────────────────────
function lireWav(chemin) {
  const b = readFileSync(chemin);
  let p = 12, taux = 16000, bits = 16, canaux = 1, data = null;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4), taille = b.readUInt32LE(p + 4);
    if (id === 'fmt ') { canaux = b.readUInt16LE(p + 10); taux = b.readUInt32LE(p + 12); bits = b.readUInt16LE(p + 22); }
    else if (id === 'data') { data = b.subarray(p + 8, p + 8 + taille); break; }
    p += 8 + taille + (taille % 2);
  }
  if (!data || bits !== 16) throw new Error(`WAV non géré : ${chemin} (${bits} bits)`);
  const n = Math.floor(data.length / 2 / canaux);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = data.readInt16LE(i * 2 * canaux) / 32768;
  return { x, taux };
}

// ── FFT réelle (Cooley-Tukey), suffisante pour 512 points ───────────────────
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

/** `getByteFrequencyData` du navigateur, à la lettre de la spec Web Audio. */
function creerAnalyser(fftSize = 512, lissage = 0.8, minDb = -100, maxDb = -30) {
  const bins = fftSize / 2;
  const lisse = new Float32Array(bins);
  // Fenêtre de Blackman, celle que la spec impose.
  const w = new Float32Array(fftSize);
  const a = 0.16;
  for (let i = 0; i < fftSize; i++) {
    w[i] = (1 - a) / 2 - 0.5 * Math.cos((2 * Math.PI * i) / fftSize) + (a / 2) * Math.cos((4 * Math.PI * i) / fftSize);
  }
  return (tranche) => {
    const re = new Float64Array(fftSize), im = new Float64Array(fftSize);
    for (let i = 0; i < fftSize; i++) re[i] = (tranche[i] ?? 0) * w[i];
    fft(re, im);
    const out = new Uint8Array(bins);
    for (let k = 0; k < bins; k++) {
      const mag = Math.hypot(re[k], im[k]) / fftSize;
      lisse[k] = lissage * lisse[k] + (1 - lissage) * mag;
      const db = 20 * Math.log10(lisse[k] || 1e-12);
      const v = Math.round((255 * (db - minDb)) / (maxDb - minDb));
      out[k] = Math.max(0, Math.min(255, v));
    }
    return out;
  };
}

// ── MIC-01, tel que le dépôt le décide ──────────────────────────────────────
const NIVEAU_PAROLE = 12, SILENCE_FIN_MS = 1500, ECOUTE_MAX_MS = 12000, AVANT_PREMIER_MOT_MS = 6000;
const parleMaintenant = (n) => Number.isFinite(n) && n >= NIVEAU_PAROLE;
function finDEcoute(f) {
  if (!f.ecoute) return { cesser: false };
  if (f.msDepuisOuverture >= ECOUTE_MAX_MS) return { cesser: true, raison: 'trop-long' };
  if (!f.aParle) return f.msDepuisOuverture >= AVANT_PREMIER_MOT_MS ? { cesser: true, raison: 'rien-dit' } : { cesser: false };
  return f.msDepuisDernierMot >= SILENCE_FIN_MS ? { cesser: true, raison: 'silence' } : { cesser: false };
}

function jouerMic01({ x, taux }) {
  const analyse = creerAnalyser(512);
  const PAS = 512;                       // une tranche d'analyse
  const SONDE_MS = 250;                  // MicroVenteCaisse relit toutes les 250 ms
  let aParle = false, debut = null, dernierSon = 0, prochaineSonde = SONDE_MS, fin = null, raison = null;
  const niveaux = [];
  for (let i = 0; i + PAS <= x.length; i += PAS) {
    const tMs = (i / taux) * 1000;
    const spectre = analyse(x.subarray(i, i + PAS));
    let s = 0; for (const v of spectre) s += v;
    const niveau = Math.min(100, Math.round((s / spectre.length) * 2.5));
    niveaux.push({ t: +(tMs / 1000).toFixed(3), niveau });
    if (parleMaintenant(niveau)) { if (debut === null) debut = tMs; aParle = true; dernierSon = tMs; }
    if (tMs >= prochaineSonde) {
      prochaineSonde += SONDE_MS;
      const d = finDEcoute({ ecoute: true, aParle, msDepuisOuverture: tMs, msDepuisDernierMot: tMs - dernierSon });
      if (d.cesser) { fin = tMs; raison = d.raison; break; }
    }
  }
  return { debut: debut === null ? null : debut / 1000, fin: fin === null ? null : fin / 1000, raison, niveauMax: Math.max(...niveaux.map((n) => n.niveau)), niveaux };
}

// ── Sherpa VAD ──────────────────────────────────────────────────────────────
function jouerSherpa({ x, taux }, seuil = 0.5) {
  const vad = new sherpa.Vad({
    sileroVad: { model: './silero_vad.onnx', threshold: seuil, minSilenceDuration: 0.5, minSpeechDuration: 0.25, maxSpeechDuration: 12, windowSize: 512 },
    sampleRate: taux, debug: false, numThreads: 1,
  }, 60);
  const PAS = 512;
  const segments = [];
  for (let i = 0; i + PAS <= x.length; i += PAS) {
    vad.acceptWaveform(x.subarray(i, i + PAS));
    while (!vad.isEmpty()) {
      const s = vad.front();
      segments.push({ debut: +(s.start / taux).toFixed(3), fin: +((s.start + s.samples.length) / taux).toFixed(3) });
      vad.pop();
    }
  }
  vad.flush();
  while (!vad.isEmpty()) {
    const s = vad.front();
    segments.push({ debut: +(s.start / taux).toFixed(3), fin: +((s.start + s.samples.length) / taux).toFixed(3) });
    vad.pop();
  }
  return { segments };
}

// ── Exécution ───────────────────────────────────────────────────────────────
// TOLÉRANCE DE DÉBUT : au-delà, le détecteur n'a pas trouvé la parole, il a
// trouvé autre chose — c'est le cas de MIC-01 sur « bruit + parole ».
const DEBUT_TOLERE = 0.5;
const verite = JSON.parse(readFileSync('./cas/verite.json', 'utf8'));
const resultats = [];
for (const nom of Object.keys(verite)) {
  const audio = lireWav(`./cas/${nom}.wav`);
  const v = verite[nom];
  const attenduDebut = v.parole.length ? v.parole[0][0] : null;
  const attenduFin = v.parole.length ? v.parole[v.parole.length - 1][1] : null;

  const m = jouerMic01(audio);
  const s = jouerSherpa(audio);
  const sDebut = s.segments.length ? s.segments[0].debut : null;
  const sFin = s.segments.length ? s.segments[s.segments.length - 1].fin : null;

  const ecart = (a, b) => (a === null || b === null ? null : +(a - b).toFixed(2));
  resultats.push({
    cas: nom,
    attendu: { debut: attenduDebut, fin: attenduFin, note: v.note ?? '' },
    mic01: {
      debut: m.debut === null ? null : +m.debut.toFixed(2),
      fin: m.fin === null ? null : +m.fin.toFixed(2),
      raison: m.raison,
      dureeCaptee: m.debut !== null && m.fin !== null ? +(m.fin - m.debut).toFixed(2) : null,
      niveauMax: m.niveauMax,
      fauxPositif: attenduDebut === null && m.debut !== null,
      coupurePrematuree: attenduFin !== null && m.fin !== null && m.fin < attenduFin,
      latenceFin: ecart(m.fin, attenduFin),
      ecartDebut: ecart(m.debut, attenduDebut),
    },
    sherpa: {
      debut: sDebut, fin: sFin, segments: s.segments.length,
      dureeCaptee: sDebut !== null && sFin !== null ? +(sFin - sDebut).toFixed(2) : null,
      fauxPositif: attenduDebut === null && sDebut !== null,
      coupurePrematuree: attenduFin !== null && sFin !== null && sFin < attenduFin - 0.3,
      latenceFin: ecart(sFin, attenduFin),
      ecartDebut: ecart(sDebut, attenduDebut),
      detail: s.segments,
    },
  });
}
writeFileSync('./resultats.json', JSON.stringify(resultats, null, 2));

// ── Tableau ─────────────────────────────────────────────────────────────────
const f = (x, u = 's') => (x === null || x === undefined ? '—' : `${x}${u}`);
console.log('\nOSS-02 — MIC-01 (maison) vs Sherpa VAD · 8 cas, vraie voix FR, 16 kHz mono\n');
console.log('cas                   | attendu      | MIC-01                          | Sherpa VAD                      | meilleur');
console.log('----------------------|--------------|---------------------------------|---------------------------------|----------');
for (const r of resultats) {
  const att = r.attendu.debut === null ? 'aucune parole' : `${r.attendu.debut}→${r.attendu.fin}s`;
  const m = `${f(r.mic01.debut)}→${f(r.mic01.fin)} ${r.mic01.raison ?? '—'}${r.mic01.fauxPositif ? ' FP!' : ''}${r.mic01.coupurePrematuree ? ' COUPÉ!' : ''}`;
  const s = `${f(r.sherpa.debut)}→${f(r.sherpa.fin)} (${r.sherpa.segments} seg)${r.sherpa.fauxPositif ? ' FP!' : ''}${r.sherpa.coupurePrematuree ? ' COUPÉ!' : ''}`;
  // Le meilleur est celui qui ne se trompe pas ; à égalité, celui qui finit le plus vite après la parole.
  // TROIS DÉFAUTS QUE MON PREMIER SCORE NE VOYAIT PAS, et qui le rendaient faux :
  //  · `fin === null` n'est PAS un succès — c'est « jamais détecté la fin », et
  //    sur le cas 3 ça faisait passer MIC-01 pour meilleur alors que c'est le
  //    FICHIER qui s'était terminé avant lui ;
  //  · un début décalé de plus d'une demi-seconde est un défaut, même quand il
  //    y a bien de la parole quelque part (MIC-01 démarre à 0 s sur le bruit) ;
  //  · un faux positif de début ne se limite pas aux cas « aucune parole ».
  const defauts = (d, att) => (d.fauxPositif ? 2 : 0) + (d.coupurePrematuree ? 2 : 0)
    + (d.debut === null && att.debut !== null ? 2 : 0)
    + (att.debut !== null && d.debut !== null && Math.abs(d.debut - att.debut) > DEBUT_TOLERE ? 2 : 0)
    + (att.fin !== null && d.fin === null ? 2 : 0);
  const noteM = defauts(r.mic01, r.attendu);
  const noteS = defauts(r.sherpa, r.attendu);
  let best = noteM < noteS ? 'MIC-01' : noteS < noteM ? 'Sherpa' : '=';
  if (best === '=' && r.mic01.latenceFin !== null && r.sherpa.latenceFin !== null) {
    best = Math.abs(r.sherpa.latenceFin) < Math.abs(r.mic01.latenceFin) ? 'Sherpa' : Math.abs(r.mic01.latenceFin) < Math.abs(r.sherpa.latenceFin) ? 'MIC-01' : '=';
  }
  console.log(`${r.cas.padEnd(21)} | ${att.padEnd(12)} | ${m.padEnd(31)} | ${s.padEnd(31)} | ${best}`);
}
console.log('\npreuve complète : resultats.json (niveaux, segments, écarts)\n');
