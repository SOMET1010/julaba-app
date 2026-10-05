/**
 * OSS-02 — EXPÉRIENCE #2, LA DERNIÈRE. Cadre de Patrick, 02/10/2026.
 *
 * LA QUESTION : le seuil FIXE `NIVEAU_PAROLE = 12` contre un seuil ADAPTATIF
 * (plancher de bruit mesuré + marge), sur les 8 cas existants, avec la MÊME
 * vérité terrain mesurée.
 *
 * POURQUOI ELLE EXISTE. Le spike #1 a montré Sherpa VAD meilleur sur 7 cas.
 * Mais en relisant le code de production, deux des trois défauts de MIC-01
 * viennent du SEUIL FIXE, pas de l'absence de VAD :
 *   · le bruit DÉCLENCHE la parole (faux positif) — le bruit rose dépasse 12 ;
 *   · le bruit MASQUE le vrai début — le niveau est déjà au-dessus de 12.
 * Le troisième — l'hésitation COUPE la phrase — n'est pas un défaut de
 * détection : c'est `SILENCE_FIN_MS` qui est plus court que l'hésitation. Aucun
 * VAD ne corrige un nombre.
 *
 * AUCUN CHANGEMENT DE PRODUCTION. Ce fichier ne touche rien : il rejoue, en
 * Node, la chaîne exacte de `useVoiceCore` + `ecouteCaisse`, comme `banc-vad.mjs`.
 * Il n'importe PAS sherpa : la colonne Sherpa est relue de `resultats.json`,
 * mesurée au spike #1 sur les MÊMES fichiers.
 */
import { readFileSync, writeFileSync } from 'node:fs';

// ── La chaîne de production, reproduite (identique à banc-vad.mjs) ──────────
function lireWav(chemin) {
  const b = readFileSync(chemin);
  let p = 12, taux = 16000, canaux = 1, data = null;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4), taille = b.readUInt32LE(p + 4);
    if (id === 'fmt ') { canaux = b.readUInt16LE(p + 10); taux = b.readUInt32LE(p + 12); }
    if (id === 'data') { data = b.subarray(p + 8, p + 8 + taille); break; }
    p += 8 + taille + (taille % 2);
  }
  const n = Math.floor(data.length / 2 / canaux);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = data.readInt16LE(i * 2 * canaux) / 32768;
  return { x, taux };
}

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

function creerAnalyser(fftSize = 512, lissage = 0.8, minDb = -100, maxDb = -30) {
  const bins = fftSize / 2;
  const lisse = new Float32Array(bins);
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

// ── Les règles du dépôt ─────────────────────────────────────────────────────
const NIVEAU_PAROLE = 12, ECOUTE_MAX_MS = 12000, AVANT_PREMIER_MOT_MS = 6000;

function finDEcoute(f, silenceFinMs) {
  if (f.msDepuisOuverture >= ECOUTE_MAX_MS) return { cesser: true, raison: 'trop-long' };
  if (!f.aParle) return f.msDepuisOuverture >= AVANT_PREMIER_MOT_MS ? { cesser: true, raison: 'rien-dit' } : { cesser: false };
  return f.msDepuisDernierMot >= silenceFinMs ? { cesser: true, raison: 'silence' } : { cesser: false };
}

/**
 * LE SEUIL ADAPTATIF. Le plancher de bruit est la MÉDIANE des niveaux relevés
 * pendant `ECOUTE_PLANCHER_MS` au tout début — avant qu'elle ait parlé. Une
 * médiane, pas une moyenne : un claquement isolé ne doit pas relever le
 * plancher de toute la session.
 *
 * `MARGE` est ce qu'une voix doit dépasser le fond pour compter. En pièce
 * calme le plancher est ~0 et le seuil tombe donc SOUS 12 — c'est ce qui
 * rattrape la voix faible. En marché bruyant il monte avec le fond — c'est ce
 * qui doit supprimer le faux positif.
 */
const ECOUTE_PLANCHER_MS = 400;
function mediane(v) { const t = [...v].sort((a, b) => a - b); return t.length ? t[Math.floor(t.length / 2)] : 0; }

function jouer({ x, taux }, { adaptatif, marge, silenceFinMs }) {
  const analyse = creerAnalyser(512);
  const PAS = 512, SONDE_MS = 250;
  let aParle = false, debut = null, dernierSon = 0, prochaineSonde = SONDE_MS, fin = null, raison = null;
  let plancher = null, seuil = NIVEAU_PAROLE;
  const echantillonsPlancher = [];
  const niveaux = [];
  for (let i = 0; i + PAS <= x.length; i += PAS) {
    const tMs = (i / taux) * 1000;
    const spectre = analyse(x.subarray(i, i + PAS));
    let s = 0; for (const v of spectre) s += v;
    const niveau = Math.min(100, Math.round((s / spectre.length) * 2.5));
    niveaux.push(niveau);

    if (adaptatif) {
      if (tMs < ECOUTE_PLANCHER_MS) { echantillonsPlancher.push(niveau); }
      else if (plancher === null) { plancher = mediane(echantillonsPlancher); seuil = plancher + marge; }
      // Tant que le plancher n'est pas établi, on n'ouvre pas la parole : on
      // écoute le fond. 400 ms, c'est le temps qu'elle met à approcher la bouche.
      if (plancher === null) { if (tMs >= prochaineSonde) prochaineSonde += SONDE_MS; continue; }
    }

    if (niveau >= seuil) { if (debut === null) debut = tMs; aParle = true; dernierSon = tMs; }
    if (tMs >= prochaineSonde) {
      prochaineSonde += SONDE_MS;
      const d = finDEcoute({ aParle, msDepuisOuverture: tMs, msDepuisDernierMot: tMs - dernierSon }, silenceFinMs);
      if (d.cesser) { fin = tMs; raison = d.raison; break; }
    }
  }
  return {
    debut: debut === null ? null : +(debut / 1000).toFixed(2),
    fin: fin === null ? null : +(fin / 1000).toFixed(2),
    raison, plancher, seuil,
    niveauMax: Math.max(...niveaux),
  };
}

// ── Scoring, identique au spike #1 ──────────────────────────────────────────
function noter(r, att) {
  const attDebut = att.parole.length ? att.parole[0][0] : null;
  const attFin = att.parole.length ? att.parole[att.parole.length - 1][1] : null;
  const fauxPositif = attDebut === null && r.debut !== null;
  const coupure = attFin !== null && r.fin !== null && r.fin < attFin;
  const jamaisFini = attFin !== null && r.fin === null;
  const ecartDebut = attDebut !== null && r.debut !== null ? +(r.debut - attDebut).toFixed(2) : null;
  const latenceFin = attFin !== null && r.fin !== null ? +(r.fin - attFin).toFixed(2) : null;
  const manque = attDebut !== null && r.debut === null;
  const defauts = (fauxPositif ? 2 : 0) + (coupure ? 2 : 0) + (jamaisFini ? 2 : 0) + (manque ? 3 : 0)
    + (ecartDebut !== null ? Math.min(2, Math.abs(ecartDebut)) : 0);
  return { ...r, fauxPositif, coupure, jamaisFini, manque, ecartDebut, latenceFin, defauts: +defauts.toFixed(2) };
}

const verite = JSON.parse(readFileSync('cas/verite.json', 'utf8'));
const spike1 = JSON.parse(readFileSync('resultats.json', 'utf8'));
const MARGES = [4, 6, 8, 10];
const SILENCE = Number(process.argv[2] ?? 1500);

// ── Calibration de la marge : une seule passe, pas d'itération ──────────────
const parMarge = MARGES.map((marge) => {
  let total = 0;
  for (const [cas, att] of Object.entries(verite)) {
    const s = lireWav(`cas/${cas}.wav`);
    total += noter(jouer(s, { adaptatif: true, marge, silenceFinMs: SILENCE }), att).defauts;
  }
  return { marge, defauts: +total.toFixed(2) };
});
const meilleure = parMarge.reduce((a, b) => (b.defauts < a.defauts ? b : a));

console.log(`\nOSS-02 — EXPÉRIENCE #2   (SILENCE_FIN_MS = ${SILENCE})\n`);
console.log('Calibration de la marge (total des défauts, plus bas = mieux) :');
for (const m of parMarge) console.log(`   marge ${String(m.marge).padStart(2)} → ${m.defauts}${m.marge === meilleure.marge ? '   ← retenue' : ''}`);
console.log();

const lignes = [];
for (const [cas, att] of Object.entries(verite)) {
  const s = lireWav(`cas/${cas}.wav`);
  const fixe = noter(jouer(s, { adaptatif: false, silenceFinMs: SILENCE }), att);
  const adapt = noter(jouer(s, { adaptatif: true, marge: meilleure.marge, silenceFinMs: SILENCE }), att);
  const sh = spike1.find((r) => r.cas === cas)?.sherpa ?? null;
  lignes.push({ cas, attendu: att, fixe, adaptatif: adapt, sherpa: sh });
}

const f = (v) => (v === null || v === undefined ? '—' : typeof v === 'number' ? v.toFixed(2) : String(v));
const marque = (d) => `${d.fauxPositif ? ' FP!' : ''}${d.coupure ? ' COUPÉ!' : ''}${d.jamaisFini ? ' SANS-FIN!' : ''}${d.manque ? ' RATÉ!' : ''}`;

console.log('cas                     | attendu        | seuil FIXE (12)          | seuil ADAPTATIF          | Sherpa            | meilleur');
console.log('-'.repeat(130));
let gainFixe = 0, gainAdapt = 0;
for (const l of lignes) {
  const att = l.attendu.parole.length
    ? `${f(l.attendu.parole[0][0])}→${f(l.attendu.parole.at(-1)[1])}`
    : 'aucune parole';
  const colF = `${f(l.fixe.debut)}→${f(l.fixe.fin)} ${l.fixe.raison ?? '—'}${marque(l.fixe)}`;
  const colA = `${f(l.adaptatif.debut)}→${f(l.adaptatif.fin)} ${l.adaptatif.raison ?? '—'}${marque(l.adaptatif)}`;
  const colS = l.sherpa ? `${f(l.sherpa.debut)}→${f(l.sherpa.fin)} (${l.sherpa.segments} seg)` : '—';
  const best = l.adaptatif.defauts < l.fixe.defauts ? 'ADAPTATIF'
    : l.fixe.defauts < l.adaptatif.defauts ? 'fixe' : '=';
  if (best === 'ADAPTATIF') gainAdapt++; else if (best === 'fixe') gainFixe++;
  console.log(`${l.cas.padEnd(23)} | ${att.padEnd(14)} | ${colF.padEnd(24)} | ${colA.padEnd(24)} | ${colS.padEnd(17)} | ${best}`);
}
console.log('-'.repeat(130));
console.log(`\nAdaptatif meilleur sur ${gainAdapt} cas · fixe meilleur sur ${gainFixe} · égalité sur ${lignes.length - gainAdapt - gainFixe}`);
console.log(`Défauts cumulés — fixe : ${lignes.reduce((s, l) => s + l.fixe.defauts, 0).toFixed(2)} · adaptatif : ${lignes.reduce((s, l) => s + l.adaptatif.defauts, 0).toFixed(2)}`);
writeFileSync(`resultats-adaptatif-${SILENCE}.json`, JSON.stringify({ silenceFinMs: SILENCE, margeRetenue: meilleure.marge, parMarge, lignes }, null, 2));
console.log(`\n→ resultats-adaptatif-${SILENCE}.json`);
