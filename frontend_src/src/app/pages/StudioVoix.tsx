/**
 * Studio Voix — les DEUX étapes du pipeline voix, sur la même route
 * /studio-voix, en deux onglets :
 *
 *   1. « Enregistrement » (ci-dessous) : console interne pour capter la voix
 *      de Tata — d'abord le SCRIPT prioritaire (accueil/connexion + chiffres +
 *      pipeline vocal, services/loginVoiceScript.ts), une phrase à la fois
 *      (pensé téléphone : la personne qui accompagne Tata lit la phrase à
 *      voix haute, puis lance l'enregistrement pour qu'elle la redise), avec
 *      réécoute, refaire, validation explicite, et reprise après fermeture de
 *      l'onglet (IndexedDB, services/studioVoixDB.ts). Puis, repliés par
 *      défaut, les clips d'intro manquants et les 137 clips déjà embarqués
 *      (ré-enregistrables). Export final : UN ZIP (MP3 + manifeste), prêt à
 *      déposer dans public/voix/tata/. 100% LOCAL au navigateur : rien n'est
 *      envoyé nulle part. Aucun chemin d'argent, aucune écriture serveur.
 *      Onglet ouvert à toute l'équipe.
 *
 *   2. « Clonage » (StudioVoixClonage.tsx) : configuration d'un fournisseur
 *      TTS cloud (ADMIN-ONLY, contrôle d'accès dans le composant).
 *
 * Distinct de /collecte-voix : cet outil capte LA voix de Tata (sortie parlée
 * de l'appli) ; /collecte-voix capte des échantillons de LOCUTEURS pour
 * entraîner la reconnaissance vocale (l'écoute) — deux pipelines séparés.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { INTRO_CLIPS } from '../services/onboardingVoix';
import { TATA_CLIPS } from '../services/tataVoice';
import { SCRIPT_TATA, LABEL_CATEGORIE, type PhraseScript } from '../services/loginVoiceScript';
import { versMp3 } from '../services/mp3Encoder';
import { encoderWav } from '../services/studioWav';
import { defaultStudioVoixStore, type PriseStudio } from '../services/studioVoixDB';
import StudioVoixClonage from './StudioVoixClonage';

// ── Lignes des groupes "historiques" (intros manquantes + 137 clips) ───────

interface LigneStudio {
  key: string;
  texte: string;
  nomFichier: string; // nom réel attendu par l'appli (basename du champ `file`)
  groupe: string;
  dejaEmbarque: boolean;
}

function basename(chemin: string): string {
  return chemin.split('/').pop() || chemin;
}

const GROUPE_INTROS = 'Intros onboarding (clips manquants)';
const GROUPE_INTERFACE = 'Interface — 137 clips déjà existants (ré-enregistrable)';

const LIGNES_HISTORIQUES: LigneStudio[] = [
  ...Object.entries(INTRO_CLIPS).map(([k, c]) => ({
    key: `intro_${k}`,
    texte: c.texte,
    nomFichier: basename(c.file),
    groupe: GROUPE_INTROS,
    dejaEmbarque: false,
  })),
  ...Object.entries(TATA_CLIPS).map(([k, c]) => ({
    key: k,
    texte: c.texte,
    nomFichier: basename(c.file),
    groupe: GROUPE_INTERFACE,
    dejaEmbarque: true,
  })),
];

/** Nom de fichier final pour une phrase du script prioritaire. */
function nomFichierScript(id: string): string {
  if (id.startsWith('AUTH_')) return `login-${id.slice(5).padStart(2, '0')}.mp3`;
  if (id.startsWith('NUM_')) return `chiffre-${id.slice(4)}.mp3`;
  return `${id.toLowerCase().replace(/_/g, '-')}.mp3`;
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
type StatutPrise = 'a_faire' | 'a_verifier' | 'valide';

function statutDe(prise: PriseStudio | undefined): StatutPrise {
  if (!prise) return 'a_faire';
  return prise.validee ? 'valide' : 'a_verifier';
}

const COULEUR_STATUT: Record<StatutPrise, string> = {
  a_faire: '#ddd',
  a_verifier: '#DB7A2C',
  valide: '#1e6b40',
};

export default function StudioVoix() {
  const [onglet, setOnglet] = useState<OngletStudio>('enregistrement');
  const [prises, setPrises] = useState<Record<string, PriseStudio>>({});
  const [urls, setUrls] = useState<Record<string, string>>({}); // ObjectURL de réécoute, dérivé des blobs
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string>('');
  const [zipEnCours, setZipEnCours] = useState(false);
  const [zipProgres, setZipProgres] = useState('');
  const [scriptIndex, setScriptIndex] = useState(0);
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Charge les prises persistées (IndexedDB) au montage — c'est ce qui permet
  // de reprendre plus tard : fermer l'onglet ne perd rien de ce qui a déjà
  // été enregistré (ni les brouillons, ni les prises validées).
  useEffect(() => {
    void (async () => {
      const store = defaultStudioVoixStore();
      const tout = await store.tout();
      setPrises(tout);
      const u: Record<string, string> = {};
      for (const [cle, p] of Object.entries(tout)) u[cle] = URL.createObjectURL(p.blob);
      setUrls(u);
      // Reprendre là où on s'était arrêté : la première phrase du script pas
      // encore validée (une prise "à vérifier" compte comme non terminée).
      const premierNonValide = SCRIPT_TATA.findIndex((p) => !tout[p.id]?.validee);
      setScriptIndex(premierNonValide === -1 ? 0 : premierNonValide);
      setChargement(false);
    })();
  }, []);

  // Libère les ObjectURL au démontage.
  useEffect(() => () => { for (const u of Object.values(urls)) URL.revokeObjectURL(u); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const demarrer = async (cle: string) => {
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
        const prise: PriseStudio = { cle, blob, validee: false, maj: Date.now() };
        setPrises((p) => ({ ...p, [cle]: prise }));
        setUrls((u) => {
          if (u[cle]) URL.revokeObjectURL(u[cle]);
          return { ...u, [cle]: URL.createObjectURL(blob) };
        });
        void defaultStudioVoixStore().sauver(prise); // persiste tout de suite — brouillon, pas encore validé
        setEnCours(null);
      };
      recorderRef.current = rec;
      rec.start();
      setEnCours(cle);
    } catch {
      setErreur('Micro introuvable ou refusé. Autorise le micro puis réessaie.');
      setEnCours(null);
    }
  };

  const arreter = () => { try { recorderRef.current?.stop(); } catch { setEnCours(null); } };

  const valider = (cle: string) => {
    setPrises((p) => {
      const prise = p[cle];
      if (!prise) return p;
      const maj = { ...prise, validee: true, maj: Date.now() };
      void defaultStudioVoixStore().sauver(maj);
      return { ...p, [cle]: maj };
    });
  };

  const exporterWav = async (cle: string) => {
    const prise = prises[cle];
    if (!prise) return;
    const wav = await versWav48kMono(prise.blob).catch(() => null);
    if (!wav) { setErreur("Impossible de préparer le WAV pour ce clip — réenregistre-le."); return; }
    telecharger(`${cle}.wav`, wav, 'audio/wav');
  };

  // ── Progression du script prioritaire ───────────────────────────────────
  const compteurs = useMemo(() => {
    let valides = 0, brouillons = 0;
    for (const p of SCRIPT_TATA) {
      const s = statutDe(prises[p.id]);
      if (s === 'valide') valides++; else if (s === 'a_verifier') brouillons++;
    }
    return { valides, brouillons, total: SCRIPT_TATA.length };
  }, [prises]);

  const phraseActuelle: PhraseScript = SCRIPT_TATA[scriptIndex];
  const priseActuelle = prises[phraseActuelle.id];
  const statutActuel = statutDe(priseActuelle);

  // ── Export ZIP complet (script + historique enregistré) ────────────────
  const clesAExporter = [
    ...SCRIPT_TATA.map((p) => ({ key: p.id, texte: p.texteFr, groupe: LABEL_CATEGORIE[p.categorie], nomFichier: nomFichierScript(p.id) })),
    ...LIGNES_HISTORIQUES.map((l) => ({ key: l.key, texte: l.texte, groupe: l.groupe, nomFichier: l.nomFichier })),
  ].filter((l) => prises[l.key]);

  const exporterZip = async () => {
    if (clesAExporter.length === 0) return;
    setZipEnCours(true);
    setErreur('');
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const manifeste: Array<{ fichier: string; cle: string; texte: string; groupe: string; valide: boolean }> = [];
      let i = 0;
      for (const l of clesAExporter) {
        i++;
        setZipProgres(`Conversion en MP3… ${i}/${clesAExporter.length} (${l.nomFichier})`);
        const prise = prises[l.key];
        try {
          const mp3 = await versMp3(prise.blob);
          zip.file(l.nomFichier, mp3);
          manifeste.push({ fichier: l.nomFichier, cle: l.key, texte: l.texte, groupe: l.groupe, valide: prise.validee });
        } catch {
          setErreur((e) => e || `Échec de conversion pour ${l.nomFichier} — clip ignoré dans le zip, réenregistre-le.`);
        }
      }
      zip.file('manifeste.json', JSON.stringify(manifeste, null, 2));
      const lignesLisez = manifeste.map((m) => `${m.fichier}${m.valide ? '' : '  [BROUILLON — non validé]'}  —  ${m.groupe}\n    « ${m.texte} »`).join('\n\n');
      zip.file('LISEZ-MOI.txt',
        `Pack voix Tantie Nanti Lou — export du studio d'enregistrement\n` +
        `${manifeste.length} fichier(s) MP3 mono, ~96 kb/s (aligné sur les clips existants).\n` +
        `Déposer les fichiers dans frontend_src/public/voix/tata/ puis les raccorder\n` +
        `dans le code (tataUiClips.ts / onboardingVoix.ts selon le cas).\n\n${lignesLisez}\n`
      );
      setZipProgres('Compression du zip…');
      const contenu = await zip.generateAsync({ type: 'blob' });
      telecharger('pack-voix-tata.zip', contenu, 'application/zip');
    } finally {
      setZipEnCours(false);
      setZipProgres('');
    }
  };

  const groupesHistoriques = [...new Set(LIGNES_HISTORIQUES.map((l) => l.groupe))];

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
      ) : chargement ? (
        <p>Chargement des prises déjà enregistrées…</p>
      ) : (
        <>
          {erreur && (
            <p role="alert" style={{ background: '#fdecea', color: '#a52f22', padding: '10px 14px', borderRadius: 8 }}>{erreur}</p>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, margin: '4px 0 18px', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e6b40' }}>
              {compteurs.valides} / {compteurs.total} validées
              {compteurs.brouillons > 0 && <span style={{ color: '#DB7A2C', fontWeight: 600 }}> · {compteurs.brouillons} à vérifier</span>}
            </p>
            <button onClick={() => void exporterZip()} disabled={zipEnCours || clesAExporter.length === 0}
              style={{ padding: '12px 18px', borderRadius: 10, border: 'none', fontWeight: 700, minHeight: 44,
                background: zipEnCours || clesAExporter.length === 0 ? '#ccc' : '#1e6b40', color: '#fff' }}>
              {zipEnCours ? (zipProgres || 'Préparation…') : `⬇ Télécharger le pack (.zip, ${clesAExporter.length})`}
            </button>
          </div>

          {/* ── Grille de navigation : sauter à n'importe quelle phrase, statut visible ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {SCRIPT_TATA.map((p, i) => (
              <button key={p.id} onClick={() => setScriptIndex(i)} title={`${p.moment} — ${p.texteFr}`}
                style={{
                  width: 38, height: 38, borderRadius: 8, border: i === scriptIndex ? '2px solid #3d1a08' : '1px solid #ccc',
                  background: COULEUR_STATUT[statutDe(prises[p.id])], color: statutDe(prises[p.id]) === 'a_faire' ? '#555' : '#fff',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>
                {i + 1}
              </button>
            ))}
          </div>

          {/* ── Phrase courante, une à la fois (pensé téléphone) ────────────────── */}
          <div style={{ border: '1px solid #ddd', borderRadius: 14, padding: '18px 16px', background: '#fff', marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#8A5A34', margin: 0 }}>
              {LABEL_CATEGORIE[phraseActuelle.categorie]} · {phraseActuelle.moment}
            </p>
            <p style={{ fontSize: 22, fontWeight: 600, color: '#3d1a08', margin: '10px 0 16px', lineHeight: 1.4 }}>
              « {phraseActuelle.texteFr} »
            </p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {enCours === phraseActuelle.id ? (
                <button onClick={arreter}
                  style={{ minHeight: 56, minWidth: 140, padding: '10px 20px', borderRadius: 12, border: 'none', background: '#a52f22', color: '#fff', fontWeight: 700, fontSize: 16 }}>
                  ■ Arrêter
                </button>
              ) : (
                <button onClick={() => void demarrer(phraseActuelle.id)} disabled={enCours !== null}
                  style={{ minHeight: 56, minWidth: 140, padding: '10px 20px', borderRadius: 12, border: 'none',
                    background: enCours ? '#ccc' : '#c65a11', color: '#fff', fontWeight: 700, fontSize: 16 }}>
                  ● {priseActuelle ? 'Refaire' : 'Enregistrer'}
                </button>
              )}
              {priseActuelle && (
                <>
                  <audio controls src={urls[phraseActuelle.id]} style={{ height: 44 }} />
                  {statutActuel !== 'valide' && (
                    <button onClick={() => valider(phraseActuelle.id)}
                      style={{ minHeight: 44, padding: '10px 16px', borderRadius: 10, border: 'none', background: '#1e6b40', color: '#fff', fontWeight: 700 }}>
                      ✓ Valider cette prise
                    </button>
                  )}
                  {statutActuel === 'valide' && <span style={{ color: '#1e6b40', fontWeight: 700 }}>✓ Validée</span>}
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
              <button onClick={() => setScriptIndex((i) => Math.max(0, i - 1))} disabled={scriptIndex === 0}
                style={{ minHeight: 44, padding: '10px 18px', borderRadius: 10, border: '1px solid #ccc', background: '#fff', fontWeight: 700, opacity: scriptIndex === 0 ? 0.5 : 1 }}>
                ← Précédent
              </button>
              <button onClick={() => setScriptIndex((i) => Math.min(SCRIPT_TATA.length - 1, i + 1))} disabled={scriptIndex === SCRIPT_TATA.length - 1}
                style={{ minHeight: 44, padding: '10px 18px', borderRadius: 10, border: '1px solid #ccc', background: '#fff', fontWeight: 700, opacity: scriptIndex === SCRIPT_TATA.length - 1 ? 0.5 : 1 }}>
                Suivant →
              </button>
            </div>
          </div>

          {/* ── Groupes historiques : repliés par défaut ────────────────────────── */}
          <details open={historiqueOuvert} onToggle={(e) => setHistoriqueOuvert((e.target as HTMLDetailsElement).open)}>
            <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#555', padding: '8px 0' }}>
              Autres clips (intros onboarding + interface existante, {LIGNES_HISTORIQUES.length} au total)
            </summary>
            <p style={{ color: '#555', fontSize: 13 }}>
              Enregistre chaque phrase EXACTEMENT comme écrite, réécoute, exporte le WAV
              master si besoin d'archive. Ces clips sont aussi inclus dans le zip ci-dessus
              dès qu'ils ont une prise.
            </p>
            {groupesHistoriques.map((groupe) => (
              <section key={groupe} style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 15, borderBottom: '2px solid #1e6b40', paddingBottom: 6 }}>{groupe}</h2>
                {LIGNES_HISTORIQUES.filter((l) => l.groupe === groupe).map((l) => {
                  const prise = prises[l.key];
                  const actif = enCours === l.key;
                  return (
                    <article key={l.key} data-cle={l.key}
                      style={{ border: '1px solid #ddd', borderRadius: 10, padding: '12px 14px', marginTop: 12, background: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <code style={{ fontSize: 12, fontWeight: 700 }}>{l.nomFichier}</code>
                        <span style={{ fontSize: 12, fontWeight: 600, color: prise?.validee ? '#1e6b40' : prise ? '#DB7A2C' : l.dejaEmbarque ? '#8a6d1f' : '#a52f22' }}>
                          {prise?.validee ? '✓ validé' : prise ? '● à vérifier' : l.dejaEmbarque ? '○ clip embarqué existant' : '● manquant'}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, margin: '8px 0' }}>{l.texte}</p>
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
                            <audio controls src={urls[l.key]} style={{ height: 44 }} />
                            {!prise.validee && (
                              <button onClick={() => valider(l.key)}
                                style={{ minHeight: 44, padding: '10px 16px', borderRadius: 10, border: 'none', background: '#1e6b40', color: '#fff', fontWeight: 700 }}>
                                ✓ Valider
                              </button>
                            )}
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
          </details>
        </>
      )}
    </div>
  );
}
