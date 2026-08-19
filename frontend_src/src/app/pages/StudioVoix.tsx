/**
 * Studio Voix — les DEUX étapes du pipeline voix, sur la même route
 * /studio-voix, en deux onglets :
 *
 *   1. « Enregistrement » (ci-dessous, v0 historique) : console interne pour
 *      capter la voix de la comédienne — la liste des clips à enregistrer
 *      (les 9 intros manquantes + les clips d'interface), le texte EXACT à
 *      dire, un bouton enregistrer/réécouter par clip, l'export du master
 *      WAV 48 kHz mono (format d'archive, docs/PACKS_VOIX.md) et le
 *      manifeste prêt à téléverser. 100% LOCAL au navigateur : rien n'est
 *      envoyé nulle part — les fichiers sont téléchargés sur le poste, la
 *      publication (transcodage MP3 + téléversement + manifeste) suit la
 *      checklist de docs/PACKS_VOIX.md. Aucun chemin d'argent, aucune
 *      écriture serveur. Onglet ouvert à toute l'équipe.
 *
 *   2. « Clonage » (StudioVoixClonage.tsx) : utilise les enregistrements
 *      captés à l'étape 1 pour entraîner/servir une voix clonée via un
 *      fournisseur TTS cloud (ElevenLabs ou Azure AI Speech / Speech
 *      Studio) — configuration de la clé API (chiffrée en base côté
 *      serveur), test avant activation, bascule du fournisseur actif.
 *      Onglet ADMIN-ONLY (contrôle d'accès À L'INTÉRIEUR du composant,
 *      voir StudioVoixClonage.tsx — pas de route back-office séparée : la
 *      config du clonage reste rattachée au même écran Studio que la prise
 *      de son qu'elle exploite).
 */
import { useEffect, useRef, useState } from 'react';
import { INTRO_CLIPS } from '../services/onboardingVoix';
import { TATA_CLIPS } from '../services/tataVoice';
import { encoderWav, genererManifesteStudio, type ClipStudio } from '../services/studioWav';
import StudioVoixClonage from './StudioVoixClonage';

interface LigneStudio extends ClipStudio {
  groupe: 'Intros (à enregistrer — clips manquants)' | 'Interface (ré-enregistrable)';
  dejaEmbarque: boolean;
}

const LIGNES: LigneStudio[] = [
  ...Object.entries(INTRO_CLIPS).map(([k, c]) => ({
    key: `intro_${k}`,
    texte: c.texte,
    groupe: 'Intros (à enregistrer — clips manquants)' as const,
    dejaEmbarque: false, // les intro-*.mp3 n'existent pas encore (raison d'être du studio)
  })),
  ...Object.entries(TATA_CLIPS).map(([k, c]) => ({
    key: k,
    texte: c.texte,
    groupe: 'Interface (ré-enregistrable)' as const,
    dejaEmbarque: true,
  })),
];

interface Prise {
  blob: Blob;        // enregistrement natif (webm/mp4) pour la réécoute
  url: string;       // ObjectURL de réécoute
  wav?: ArrayBuffer; // master WAV 48 kHz mono (préparé à l'export)
}

async function versWav48kMono(blob: Blob): Promise<ArrayBuffer> {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  try {
    const decode = await ctx.decodeAudioData(await blob.arrayBuffer());
    const offline = new OfflineAudioContext(1, Math.ceil(decode.duration * 48000), 48000);
    const src = offline.createBufferSource();
    src.buffer = decode;
    src.connect(offline.destination);
    src.start();
    const rendu = await offline.startRendering();
    return encoderWav(rendu.getChannelData(0), 48000);
  } finally {
    void ctx.close().catch(() => {});
  }
}

function telecharger(nom: string, contenu: BlobPart, type: string): void {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = nom;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

type OngletStudio = 'enregistrement' | 'clonage';

export default function StudioVoix() {
  const [onglet, setOnglet] = useState<OngletStudio>('enregistrement');
  const [prises, setPrises] = useState<Record<string, Prise>>({});
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string>('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const prisesRef = useRef(prises);
  prisesRef.current = prises;

  // Libérer les ObjectURL au démontage (pas pendant l'usage).
  useEffect(() => () => {
    for (const p of Object.values(prisesRef.current)) URL.revokeObjectURL(p.url);
  }, []);

  const demarrer = async (key: string) => {
    setErreur('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        setPrises((p) => {
          const ancienne = p[key];
          if (ancienne) URL.revokeObjectURL(ancienne.url);
          return { ...p, [key]: { blob, url: URL.createObjectURL(blob) } };
        });
        // Master WAV préparé en arrière-plan (l'export est alors instantané).
        versWav48kMono(blob)
          .then((wav) => setPrises((p) => (p[key] ? { ...p, [key]: { ...p[key], wav } } : p)))
          .catch(() => { /* la réécoute reste possible ; l'export retentera */ });
        setEnCours(null);
      };
      recorderRef.current = rec;
      rec.start();
      setEnCours(key);
    } catch {
      setErreur('Micro introuvable ou refusé. Autorise le micro puis réessaie.');
      setEnCours(null);
    }
  };

  const arreter = () => { try { recorderRef.current?.stop(); } catch { setEnCours(null); } };

  const exporterWav = async (key: string) => {
    const prise = prises[key];
    if (!prise) return;
    const wav = prise.wav ?? await versWav48kMono(prise.blob).catch(() => null);
    if (!wav) { setErreur("Impossible de préparer le WAV pour ce clip — réenregistre-le."); return; }
    telecharger(`${key}.wav`, wav, 'audio/wav');
  };

  const clesEnregistrees = LIGNES.filter((l) => prises[l.key]);
  const exporterManifeste = () => {
    const manifeste = genererManifesteStudio(
      clesEnregistrees.map(({ key, texte }) => ({ key, texte })),
      'https://A-REMPLACER/voix/fr/tata_v2/1',
      1,
    );
    telecharger('manifest.json', JSON.stringify(manifeste, null, 2), 'application/json');
  };

  const groupes = [...new Set(LIGNES.map((l) => l.groupe))];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 96px', fontFamily: 'inherit' }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Studio Voix</h1>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0 16px', borderBottom: '2px solid #eee' }}>
        <button onClick={() => setOnglet('enregistrement')}
          style={{ padding: '10px 16px', minHeight: 44, fontWeight: 700, border: 'none', background: 'transparent', cursor: 'pointer',
            color: onglet === 'enregistrement' ? '#1e6b40' : '#777',
            borderBottom: onglet === 'enregistrement' ? '3px solid #1e6b40' : '3px solid transparent', marginBottom: -2 }}>
          Enregistrement
        </button>
        <button onClick={() => setOnglet('clonage')}
          style={{ padding: '10px 16px', minHeight: 44, fontWeight: 700, border: 'none', background: 'transparent', cursor: 'pointer',
            color: onglet === 'clonage' ? '#1e6b40' : '#777',
            borderBottom: onglet === 'clonage' ? '3px solid #1e6b40' : '3px solid transparent', marginBottom: -2 }}>
          Clonage
        </button>
      </div>

      {onglet === 'clonage' ? (
        <StudioVoixClonage />
      ) : (
        <>
          <p style={{ color: '#555', fontSize: 14, marginTop: 0 }}>
            Outil interne. Enregistre chaque phrase EXACTEMENT comme écrite, réécoute, puis exporte
            le WAV (master) et le manifeste. Publication : voir docs/PACKS_VOIX.md
            (transcodage MP3 + téléversement + base_url à remplacer dans le manifeste).
          </p>
          {erreur && (
            <p role="alert" style={{ background: '#fdecea', color: '#a52f22', padding: '10px 14px', borderRadius: 8 }}>{erreur}</p>
          )}

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '12px 0 20px' }}>
            <button
              onClick={exporterManifeste}
              disabled={clesEnregistrees.length === 0}
              style={{ padding: '12px 18px', borderRadius: 10, border: 'none', fontWeight: 700,
                background: clesEnregistrees.length ? '#1e6b40' : '#ccc', color: '#fff', minHeight: 44 }}>
              Télécharger le manifeste ({clesEnregistrees.length} clip{clesEnregistrees.length > 1 ? 's' : ''})
            </button>
          </div>

          {groupes.map((groupe) => (
            <section key={groupe} style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 17, borderBottom: '2px solid #1e6b40', paddingBottom: 6 }}>{groupe}</h2>
              {LIGNES.filter((l) => l.groupe === groupe).map((l) => {
                const prise = prises[l.key];
                const actif = enCours === l.key;
                return (
                  <article key={l.key} data-cle={l.key}
                    style={{ border: '1px solid #ddd', borderRadius: 10, padding: '12px 14px', marginTop: 12, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <code style={{ fontSize: 13, fontWeight: 700 }}>{l.key}</code>
                      <span style={{ fontSize: 12, fontWeight: 600,
                        color: prise ? '#1e6b40' : l.dejaEmbarque ? '#8a6d1f' : '#a52f22' }}>
                        {prise ? '● enregistré (cette session)' : l.dejaEmbarque ? '○ clip embarqué existant' : '● manquant'}
                      </span>
                    </div>
                    <p style={{ fontSize: 15, margin: '8px 0' }}>{l.texte}</p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      {actif ? (
                        <button onClick={arreter}
                          style={{ minHeight: 44, padding: '10px 16px', borderRadius: 10, border: 'none', background: '#a52f22', color: '#fff', fontWeight: 700 }}>
                          ■ Arrêter
                        </button>
                      ) : (
                        <button onClick={() => void demarrer(l.key)} disabled={enCours !== null}
                          style={{ minHeight: 44, padding: '10px 16px', borderRadius: 10, border: 'none',
                            background: enCours ? '#ccc' : '#c65a11', color: '#fff', fontWeight: 700 }}>
                          ● {prise ? 'Réenregistrer' : 'Enregistrer'}
                        </button>
                      )}
                      {prise && (
                        <>
                          <audio controls src={prise.url} style={{ height: 44 }} />
                          <button onClick={() => void exporterWav(l.key)}
                            style={{ minHeight: 44, padding: '10px 16px', borderRadius: 10, border: '1px solid #1e6b40', background: '#fff', color: '#1e6b40', fontWeight: 700 }}>
                            ⬇ WAV
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
