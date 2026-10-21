/**
 * VOICE-01 — journal de voix en anneau + rapport de test.
 * Lancer : npm run test:voix-trace
 *
 * CE QU'ON VÉROUILLE, ET POURQUOI. Sur le terrain, deux observations n'ont
 * jamais pu être diagnostiquées : « deux voix différentes au démarrage » et
 * « cinq tomates » compris autrement. Personne n'a vu le transcript brut, le
 * moteur STT qui a tourné, ni l'intention retenue. Ce test prouve que :
 *   1. le journal en anneau est borné (200), ordonné, et garde le contenu utile
 *      (texte dit, moteur/voix, transcript BRUT, moteur STT, durée, intention) ;
 *   2. il survit dans localStorage (le rapport peut être envoyé après un
 *      redémarrage de l'appli) ;
 *   3. le rendu texte du « Rapport de test » (vlogDump) contient le transcript
 *      brut, le moteur STT et l'intention — lisible, une ligne par événement.
 *
 * Sur 3917bb7, le module n'existe pas et vlogDump ne contient ni moteur STT
 * ni intention : le test est ROUGE — c'est la reproduction du défaut.
 */

// localStorage factice : Node n'en a pas. On vérifie la persistance dessus.
const memoire = new Map<string, string>();
const faussesStorage = {
  getItem: (k: string) => (memoire.has(k) ? memoire.get(k)! : null),
  setItem: (k: string, v: string) => { memoire.set(k, String(v)); },
  removeItem: (k: string) => { memoire.delete(k); },
  clear: () => memoire.clear(),
  key: (i: number) => Array.from(memoire.keys())[i] ?? null,
  get length() { return memoire.size; },
};
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: faussesStorage });

const vtrace = await import('./voiceTrace.ts');
const { vlogDump, vlogStart } = await import('./voiceDebug.ts');

let echecs = 0;
let total = 0;
function verifier(nom: string, condition: boolean, detail?: string): void {
  total++;
  if (condition) { console.log(`  ✓ ${nom}`); return; }
  echecs++;
  console.log(`  ✗ ${nom}`);
  if (detail) console.log(`      ${detail}`);
}

// ── 1. Bornage et ordre ─────────────────────────────────────────────────────
console.log('\nJournal en anneau : bornage, ordre');
vtrace.__reinitialiserPourTests();
for (let i = 0; i < 250; i++) vtrace.tracer('INFO', { i });
{
  const e = vtrace.entrees();
  verifier('borné à 200 entrées', e.length === 200, `reçu ${e.length}`);
  verifier('les plus ANCIENNES sont évincées (la première restante porte i=50)',
    (e[0]?.d as { i?: number } | undefined)?.i === 50);
  verifier('la dernière est la plus récente (i=249)',
    (e[e.length - 1]?.d as { i?: number } | undefined)?.i === 249);
  verifier('horodatage non décroissant', e.every((x, k) => k === 0 || x.t >= e[k - 1].t));
}

// ── 2. Contenu des événements clés ──────────────────────────────────────────
console.log('\nJournal en anneau : contenu');
vtrace.__reinitialiserPourTests();
vtrace.ecran('/marchand/caisse');
vtrace.ttsAppel('AppContext.speak', 'Que voulez-vous vendre ?', { role: 'marchand' });
vtrace.ttsDemande('audioManager.speak', 'Que voulez-vous vendre ?', { priority: 'user' });
vtrace.ttsMoteur('navigateur', { chunk: 'Que voulez-vous vendre ?' });
vtrace.ttsVoixNavigateur('Google français', 'fr-FR', 0.98, 1.1);
const idLecture = vtrace.ttsDebut();
vtrace.ttsFin(idLecture, 'ended');
vtrace.ttsAppel('useVoiceCore.ttsSpeak', "J'ai compris", { lang: 'french', clip: 'bien_recu' });
vtrace.ttsChoix('useVoiceCore.ttsSpeak', "J'ai compris", 'clip', '/voix/tata/ui-057.mp3');
vtrace.ttsMoteur('clip', { url: '/voix/tata/ui-057.mp3' });
vtrace.ecoute('debut', 'useVoiceCore', { mime: 'audio/webm' });
vtrace.ecoute('fin', 'useVoiceCore');
const t0 = vtrace.top();
vtrace.sttFin('useVoiceCore.processAudio', 'sherpa-native', 'cinq tomates', t0, { octets: 12345 });
vtrace.intention('useVoiceCore.processAudio', 'cinq tomates', null);
vtrace.intention('useVoiceCore.processAudio', 'vendu cinq tomates', {
  intent: 'vendre', action: { type: 'vendre', produit: 'tomates', quantite: 5 }, response: '', needsConfirmation: false,
});
vtrace.ttsCoupee();
vtrace.ttsIgnoree('audioManager', 'Bravo', 'anti-repetition');
vtrace.erreur('useVoiceCore.startRecording', 'Accès au micro refusé.');
{
  const e = vtrace.entrees();
  const par = (ev: string) => e.filter((x) => x.ev === ev);
  verifier('ECRAN garde le chemin', (par('ECRAN')[0]?.d as { chemin?: string })?.chemin === '/marchand/caisse');
  verifier('TTS_APPEL garde source + texte',
    (par('TTS_APPEL')[0]?.d as { source?: string; texte?: string })?.source === 'AppContext.speak'
    && (par('TTS_APPEL')[0]?.d as { texte?: string })?.texte === 'Que voulez-vous vendre ?');
  verifier('TTS_DEMANDE porte une pile courte (appelant)', typeof (par('TTS_DEMANDE')[0]?.d as { pile?: string })?.pile === 'string');
  verifier('TTS_MOTEUR distingue navigateur / clip',
    (par('TTS_MOTEUR')[0]?.d as { moteur?: string })?.moteur === 'navigateur'
    && (par('TTS_MOTEUR')[1]?.d as { moteur?: string })?.moteur === 'clip');
  verifier('TTS_VOIX_NAVIGATEUR garde le nom et la langue de la voix native',
    (par('TTS_VOIX_NAVIGATEUR')[0]?.d as { nom?: string; lang?: string })?.nom === 'Google français'
    && (par('TTS_VOIX_NAVIGATEUR')[0]?.d as { lang?: string })?.lang === 'fr-FR');
  verifier('TTS_FIN porte le résultat et une durée', (par('TTS_FIN')[0]?.d as { resultat?: string })?.resultat === 'ended'
    && typeof (par('TTS_FIN')[0]?.d as { dureeMs?: number })?.dureeMs === 'number');
  verifier('TTS_CHOIX expose le mode retenu (clip / text_only)', (par('TTS_CHOIX')[0]?.d as { mode?: string })?.mode === 'clip');
  verifier('ECOUTE_DEBUT / ECOUTE_FIN présents', par('ECOUTE_DEBUT').length === 1 && par('ECOUTE_FIN').length === 1);
  const stt = par('STT_FIN')[0]?.d as { transcript?: string; moteur?: string; dureeMs?: number } | undefined;
  verifier('STT_FIN garde le transcript BRUT, le moteur et la durée',
    stt?.transcript === 'cinq tomates' && stt?.moteur === 'sherpa-native' && typeof stt?.dureeMs === 'number');
  const i0 = par('INTENTION')[0]?.d as { compris?: boolean; intent?: string } | undefined;
  const i1 = par('INTENTION')[1]?.d as { compris?: boolean; intent?: string; action?: string; quantite?: number } | undefined;
  verifier('INTENTION null → « pas compris »', i0?.compris === false && i0?.intent === 'pas_compris');
  verifier('INTENTION reconnue → intent + action (dérivés de la phrase)',
    i1?.compris === true && i1?.intent === 'vendre' && i1?.action === 'vendre' && i1?.quantite === 5);
  verifier('TTS_COUPEE (interruption) enregistrée', par('TTS_COUPEE').length === 1);
  verifier('TTS_IGNOREE garde la raison', (par('TTS_IGNOREE')[0]?.d as { raison?: string })?.raison === 'anti-repetition');
  verifier('ERREUR gardée avec sa source', (par('ERREUR')[0]?.d as { source?: string })?.source === 'useVoiceCore.startRecording');
  verifier('dernierTranscript() = le dernier transcript brut', vtrace.dernierTranscript() === 'cinq tomates');
  verifier('derniereVoix() = la dernière voix/moteur utilisé',
    (vtrace.derniereVoix() as { moteur?: string } | null)?.moteur === 'clip');
}

// ── 3. Persistance localStorage ─────────────────────────────────────────────
console.log('\nPersistance');
{
  const brut = faussesStorage.getItem('julaba_journal_voix');
  let n = -1;
  try { n = brut ? (JSON.parse(brut) as unknown[]).length : -1; } catch { n = -2; }
  verifier('le journal est écrit dans localStorage', n === vtrace.entrees().length, `stockées : ${n}`);
  vtrace.__rechargerDepuisStockagePourTests();
  verifier('rechargé depuis localStorage au démarrage (survit à un redémarrage)',
    vtrace.dernierTranscript() === 'cinq tomates');
}

// ── 4. Rendu texte ──────────────────────────────────────────────────────────
console.log('\nRendu texte (une ligne par événement)');
{
  const r = vtrace.rendu();
  const lignes = r.split('\n');
  verifier('une ligne par événement', lignes.length === vtrace.entrees().length, `${lignes.length} lignes / ${vtrace.entrees().length} entrées`);
  verifier('chaque ligne porte le nom de l\'événement', lignes.every((l) => /\b[A-Z_]{4,}\b/.test(l)));
  verifier('les écarts (+Δms) sont rendus', lignes.slice(1).every((l) => /\+\s*\d+ms/.test(l)));
  verifier('le transcript brut est lisible tel quel', r.includes('cinq tomates'));
}

// ── 5. Rapport de test (vlogDump) ───────────────────────────────────────────
console.log('\nRapport de test (vlogDump)');
{
  vlogStart('login');
  const d = vlogDump();
  verifier('garde la section historique « JOURNAL DICTÉE »', d.includes('=== JOURNAL DICTÉE JULABA ==='));
  verifier('contient le contexte appareil/version (CONTEXTE)', d.includes('=== CONTEXTE ==='));
  verifier('contient la voix retenue et le moteur (VOIX RETENUE)', d.includes('=== VOIX RETENUE ==='));
  verifier('contient le journal de voix en anneau (JOURNAL VOIX)', d.includes('=== JOURNAL VOIX'));
  verifier('met en évidence le DERNIER TRANSCRIPT BRUT', d.includes('=== DERNIER TRANSCRIPT BRUT ===') && d.includes('« cinq tomates »'));
  verifier('le rapport dit quel moteur STT a tourné', d.includes('sherpa-native'));
  verifier('le rapport dit quelle intention est sortie', d.includes('INTENTION') && d.includes('pas_compris') && d.includes('vendre'));
  verifier('vlogStart n\'efface PAS le journal en anneau', vtrace.entrees().some((x) => x.ev === 'STT_FIN'));
}

console.log(`\n${total - echecs}/${total} vérifications passées`);
process.exit(echecs ? 1 : 0);
