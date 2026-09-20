#!/usr/bin/env node
/**
 * EXPORT POUR MANUS — étape 8 du lot i18n.
 * Lancer : npm run i18n:export   (écrit docs/langues/JULABA-LANG-CATALOG.csv)
 *
 * Le catalogue (src/app/i18n/voice/catalog.ts) est la source ; ce script ne
 * fait que le poser en CSV, une ligne par entrée (TTS et STT), avec les
 * colonnes demandées par Patrick. UTF-8 AVEC BOM (Excel), virgule, guillemets
 * doublés, retours à la ligne conservés dans les cellules.
 *
 * QUI REMPLIT QUOI (colonne OWNER + NOTES) :
 *   - Claude : ID, TYPE, DOMAINE, CRITIQUE_ARGENT, FR_ACTUEL, VARIABLES,
 *     STATUT_INTEGRATION (structure et code) ;
 *   - Manus  : FR_MARCHE, FR_STT_VARIANTS (variantes naturelles à proposer),
 *     toutes les colonnes de langues, STATUT_LINGUISTIQUE, AUDIO_STATUS
 *     (vide côté Claude — l'audio est à Manus de bout en bout), et ses NOTES.
 * Les colonnes non renseignées sont vides.
 *
 * Il tourne avec tsx : le catalogue est du TypeScript.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const SORTIE = join(ICI, '..', '..', 'docs', 'langues', 'JULABA-LANG-CATALOG.csv');

const { MESSAGES_TTS, INTENTIONS_STT } = await import('../src/app/i18n/voice/catalog.ts');
const { manifest } = await import('../src/app/i18n/voice/registry.ts');
const { LOCALE_REFERENCE } = await import('../src/app/i18n/voice/types.ts');

// Colonnes de langues, dans l'ordre demandé. Chaque colonne lit la locale
// correspondante si elle existe au registre (sinon vide) — ainsi une langue
// remplie par Manus apparaît d'elle-même dans l'export.
const LANGUES = [
  ['DIOULA', 'dyu-ci'], ['BAOULE', 'bci'], ['AGNI', 'any'], ['BETE', 'bete'], ['ADIOUKROU', 'adj'], ['EBRIE', 'ebr'], ['ATTIE', 'ati'],
  ['ABOURE', 'abu'], ['SENOUFO_VARIANTE', 'senoufo'], ['WE', 'we'], ['DAN', 'dan'], ['ABRON', 'abr'], ['KOULANGO', 'kou'], ['LOBI', 'lobi'],
  ['DIDA', 'dida'], ['GOURO', 'goa'], ['AVIKAM', 'avi'], ['ABIDJI', 'abi'], ['ALLADIAN', 'ald'],
];

const COLONNES = ['ID', 'TYPE', 'DOMAINE', 'CRITIQUE_ARGENT', 'OWNER', 'FR_ACTUEL', 'FR_MARCHE', 'VARIABLES', 'FR_STT_VARIANTS',
  ...LANGUES.map(([c]) => c), 'STATUT_LINGUISTIQUE', 'AUDIO_STATUS', 'STATUT_INTEGRATION', 'SOURCE', 'NOTES'];

const cellule = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const fr = manifest(LOCALE_REFERENCE);

/** Variantes STT fr-ci d'une intention, rendues lisibles (phrases, mots, motifs). */
function variantesFr(id) {
  const it = fr?.intents[id];
  if (!it) return '';
  const v = it.variantes;
  if (v.mode === 'phrase_entiere') return `[phrase entière] ${v.phrases.join(' | ')}`;
  const parts = [];
  if (v.mots?.length) parts.push(`[mots] ${v.mots.join(' | ')}`);
  if (v.motifs?.length) parts.push(`[motifs] ${v.motifs.join(' | ')}`);
  return parts.join(' ; ');
}

function traduction(code, id, type) {
  const m = manifest(code);
  if (!m) return '';
  if (type === 'tts') return m.messages[id]?.template ?? '';
  const it = m.intents[id];
  if (!it) return '';
  return it.variantes.mode === 'phrase_entiere' ? it.variantes.phrases.join(' | ') : [...(it.variantes.mots ?? []), ...(it.variantes.motifs ?? [])].join(' | ');
}

const NOTE_MANUS_TTS = 'Cellules Manus : FR_MARCHE, colonnes de langues, STATUT_LINGUISTIQUE, AUDIO_STATUS, NOTES. Garder les {variables} telles quelles ; {devise} = francs, {symboleDevise} = F.';
const NOTE_MANUS_STT = 'Cellules Manus : FR_STT_VARIANTS (propositions), colonnes de langues (variantes séparées par |), STATUT_LINGUISTIQUE, NOTES. Une variante d\'argent n\'est activée qu\'après validation explicite (finance).';

const lignes = [COLONNES.join(',')];
for (const m of MESSAGES_TTS) {
  const statutFr = fr?.messages[m.id]?.validation.linguistique ?? '';
  lignes.push([
    m.id, 'TTS_OUTPUT', m.domaine, m.critiqueArgent ? 'OUI' : 'non', m.owner, m.frActuel, m.frMarche ?? '', m.variables.join(' '), '',
    ...LANGUES.map(([, code]) => traduction(code, m.id, 'tts')),
    statutFr, '', m.statut, m.source, [m.note, NOTE_MANUS_TTS].filter(Boolean).join(' — '),
  ].map(cellule).join(','));
}
for (const i of INTENTIONS_STT) {
  const statutFr = fr?.intents[i.id]?.validation.linguistique ?? '';
  lignes.push([
    i.id, 'STT_INPUT', i.domaine, i.critiqueArgent ? 'OUI' : 'non', i.owner, i.exemplesFR.join(' | '), '', '', variantesFr(i.id),
    ...LANGUES.map(([, code]) => traduction(code, i.id, 'stt')),
    statutFr, '', `action=${i.action}`, i.source, [i.note, NOTE_MANUS_STT].filter(Boolean).join(' — '),
  ].map(cellule).join(','));
}

mkdirSync(dirname(SORTIE), { recursive: true });
writeFileSync(SORTIE, '﻿' + lignes.join('\r\n') + '\r\n', 'utf8');
console.log(`CSV écrit : ${SORTIE} — ${MESSAGES_TTS.length} messages TTS + ${INTENTIONS_STT.length} intentions STT, ${COLONNES.length} colonnes`);
