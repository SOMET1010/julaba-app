/**
 * Studio v1 — collecte terrain par élicitation (squelette, backlog V5).
 *
 * Une image + une consigne dite par Tata → on enregistre la réponse → on la
 * réécoute automatiquement → contrôle qualité côté appareil (durée, silence,
 * écrêtage) → mise en file locale (IndexedDB, hors-ligne). AUCUNE lecture
 * requise pour l'annotatrice — le principe même de l'élicitation (docs/
 * PACKS_VOIX_COLLECTE.md).
 *
 * ⚠️ Contenu placeholder (français) : le référentiel réel dioula/baoulé est
 * une dépendance humaine, pas encore écrit. Ce squelette prouve le mécanisme
 * (queue, qualité, stockage), pas le contenu de la campagne.
 * ⚠️ Pas de synchronisation serveur dans ce lot : les clips restent en file
 * locale sur l'appareil jusqu'à ce qu'un point de synchro soit conçu.
 *
 * Outil interne, local au navigateur : aucune écriture serveur, aucun chemin
 * d'argent.
 */
import { useEffect, useRef, useState } from 'react';
import { PROMPTS_PLACEHOLDER_FR, prochainPrompt, type PromptCollecte } from '../services/collecteVoixPrompts';
import { verifierQualite, type VerdictQualite } from '../services/collecteVoixQualite';
import { defaultCollecteStore, type ClipCollecte } from '../services/collecteVoixDB';
import { speakClipOrText } from '../services/audioManager';
import { tataUiClipForText } from '../services/tataUiClips';

function parle(texte: string): void {
  if (!texte) return;
  let clip: string | null = null;
  try { clip = tataUiClipForText(texte); } catch { /* ignore */ }
  try { void speakClipOrText({ clipUrl: clip ?? undefined, text: texte }); } catch { /* ignore */ }
}

function idLocuteur(): string {
  try {
    const cle = 'julaba_collecte_locuteur_id';
    let id = localStorage.getItem(cle);
    if (!id) { id = 'loc-' + Math.random().toString(36).slice(2, 10); localStorage.setItem(cle, id); }
    return id;
  } catch { return 'loc-anonyme'; }
}

async function decoderEnFloat32(blob: Blob): Promise<{ samples: Float32Array; sampleRate: number }> {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  try {
    const decode = await ctx.decodeAudioData(await blob.arrayBuffer());
    return { samples: decode.getChannelData(0), sampleRate: decode.sampleRate };
  } finally {
    void ctx.close().catch(() => {});
  }
}

type Etat = 'idle' | 'enregistrement' | 'verification' | 'rejete' | 'accepte';

export default function CollecteVoix() {
  const [prompt, setPrompt] = useState<PromptCollecte | null>(() => prochainPrompt([]));
  const [faits, setFaits] = useState<string[]>([]);
  const [etat, setEtat] = useState<Etat>('idle');
  const [verdict, setVerdict] = useState<VerdictQualite | null>(null);
  const [erreur, setErreur] = useState('');
  const [nbEnFile, setNbEnFile] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const speakerId = useRef(idLocuteur());

  const rafraichirCompteur = () => { void defaultCollecteStore().count().then(setNbEnFile); };
  useEffect(() => { rafraichirCompteur(); }, []);

  // Consigne dite au changement de prompt — l'annotatrice n'a jamais besoin de lire.
  useEffect(() => {
    if (prompt) parle(prompt.consigne);
  }, [prompt]);

  const demarrer = async () => {
    setErreur(''); setVerdict(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void traiterEnregistrement(new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' }));
      };
      recorderRef.current = rec;
      rec.start();
      setEtat('enregistrement');
    } catch {
      setErreur('Micro introuvable ou refusé. Autorise le micro puis réessaie.');
    }
  };

  const arreter = () => { try { recorderRef.current?.stop(); } catch { /* ignore */ } };

  const traiterEnregistrement = async (blob: Blob) => {
    setEtat('verification');
    if (!prompt) return;
    let v: VerdictQualite;
    try {
      const { samples, sampleRate } = await decoderEnFloat32(blob);
      v = verifierQualite(samples, sampleRate);
    } catch {
      v = { ok: false, raisons: ['lecture audio impossible'], duree_s: 0 };
    }
    setVerdict(v);
    if (!v.ok) {
      setEtat('rejete');
      parle('On refait celle-là. ' + (v.raisons[0] === 'silence (rien d\'audible détecté)' ? 'Je n\'ai rien entendu.' : 'Le son n\'est pas net.'));
      return;
    }
    const clip: ClipCollecte = {
      clip_id: 'clip-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      prompt_id: prompt.prompt_id,
      task_type: 'elicit_image',
      lang: 'fr', // placeholder — cf. en-tête du fichier
      speaker_id: speakerId.current,
      consent_version: 'v1',
      ts: Date.now(),
      duree_s: v.duree_s,
      audio: blob,
      votes_up: 0, votes_down: 0, statut: 'pending',
    };
    await defaultCollecteStore().enqueue(clip);
    rafraichirCompteur();
    setEtat('accepte');
    parle('Merci !');
  };

  const suivant = () => {
    const nouveauxFaits = prompt ? [...faits, prompt.prompt_id] : faits;
    setFaits(nouveauxFaits);
    setPrompt(prochainPrompt(nouveauxFaits, PROMPTS_PLACEHOLDER_FR));
    setEtat('idle'); setVerdict(null);
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px 96px', textAlign: 'center', fontFamily: 'inherit' }}>
      <p style={{ fontSize: 12, color: '#8A5A34', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Collecte de voix · {nbEnFile} clip{nbEnFile !== 1 ? 's' : ''} en file
      </p>

      {erreur && <p role="alert" style={{ background: '#fdecea', color: '#a52f22', padding: '10px 14px', borderRadius: 8 }}>{erreur}</p>}

      {prompt ? (
        <>
          <div style={{ fontSize: 96, margin: '24px 0' }} aria-hidden>{prompt.image}</div>
          <button onClick={() => parle(prompt.consigne)}
            style={{ background: 'none', border: 'none', color: '#8A5A34', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', marginBottom: 24 }}>
            🔊 Réécouter la consigne
          </button>

          {etat === 'idle' && (
            <button onClick={() => void demarrer()}
              style={{ width: 140, height: 140, borderRadius: '50%', border: 'none', background: '#c65a11', color: '#fff', fontSize: 44, cursor: 'pointer' }}
              aria-label="Enregistrer">●</button>
          )}
          {etat === 'enregistrement' && (
            <button onClick={arreter}
              style={{ width: 140, height: 140, borderRadius: '50%', border: 'none', background: '#a52f22', color: '#fff', fontSize: 44, cursor: 'pointer' }}
              aria-label="Arrêter">■</button>
          )}
          {etat === 'verification' && <p style={{ fontSize: 18 }}>On vérifie…</p>}

          {etat === 'rejete' && verdict && (
            <div style={{ marginTop: 16 }}>
              <p style={{ color: '#a52f22', fontWeight: 700 }}>À refaire — {verdict.raisons.join(', ')}</p>
              <button onClick={() => setEtat('idle')}
                style={{ marginTop: 8, padding: '12px 24px', borderRadius: 12, border: 'none', background: '#c65a11', color: '#fff', fontWeight: 700 }}>
                Réessayer
              </button>
            </div>
          )}
          {etat === 'accepte' && (
            <div style={{ marginTop: 16 }}>
              <p style={{ color: '#1e6b40', fontWeight: 700 }}>✓ Enregistré</p>
              <button onClick={suivant}
                style={{ marginTop: 8, padding: '14px 28px', borderRadius: 14, border: 'none', background: '#1e6b40', color: '#fff', fontWeight: 700, fontSize: 16 }}>
                Suivant →
              </button>
            </div>
          )}
        </>
      ) : (
        <p>Aucune consigne disponible.</p>
      )}
    </div>
  );
}
