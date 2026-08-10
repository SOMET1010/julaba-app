import { useState, useEffect, useRef } from 'react';
import { ensureOfflineModel, offlineModelReady, offlineModelInstalled, sttEngine, sherpaSupported, clearSherpaUnavailable } from './offlineStt';
import { SHERPA_TOTAL_MO } from './sherpaModel';
import {
  sherpaTtsInstalled,
  sherpaTtsReady,
  installSherpaTtsModel,
  ensureSherpaTts,
} from '../services/sherpaTts';
import { speakBrowser } from '../services/elevenlabs';

// Bouton autonome « Installer le mode hors-ligne ».
// Télécharge le modèle vocal UNE fois (en ligne), puis mis en cache par le
// navigateur -> la voix marche ensuite sans réseau.
//
// Moteur : sherpa-onnx (WASM, modèle FR int8 ~128 Mo) quand le navigateur le
// permet (origine cross-origin isolée), sinon Vosk (~40 Mo, repli historique).
//
// RÈGLE PRODUIT : on ne BLOQUE JAMAIS ce choix (« on ne sait jamais » : une
// marchande peut vouloir installer même en données mobiles). Mais le modèle est
// TRÈS CHER sur un forfait ivoirien → on prévient clairement, à voix haute, et on
// demande DEUX validations avant de lancer. Le Wi-Fi (gratuit) est mis en avant.

const MESSAGES = [
  'Ça va aller dêh, patiente un peu…',
  'On télécharge la voix, c\'est pas gâté !',
  'Doucement doucement, l\'oiseau fait son nid…',
  'C\'est pas planté, c\'est le réseau qui pousse…',
  'On charge le djassa, reste enjaillé !',
  'Ça chauffe comme l\'attiéké au feu…',
  'Encore un petit, ça vient…',
  'Une seule fois — après ça marche sans réseau.',
];

type Etat = 'absent' | 'avert1' | 'avert2' | 'chargement' | 'pret' | 'erreur';

// Voix du téléphone (hors-ligne, jamais Internet) — pour prévenir à voix haute
// une marchande qui ne lit pas. Silencieux si le navigateur ne peut pas parler.
function dire(texte: string) {
  // Voix de secours UNIQUE (speakBrowser) : même voix FR partout, jamais « Manuela ».
  try { void speakBrowser(texte); } catch { /* ignore */ }
}

// Vrai si la connexion actuelle est probablement FACTURÉE (données mobiles) ou
// inconnue → on insiste alors sur le coût. En Wi-Fi avéré, l'avertissement est
// plus léger. On ne se sert de ça QUE pour le ton, jamais pour bloquer.
function connexionChere(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (navigator as any).connection;
    if (!c) return true;                 // inconnu → on prévient fort (« on ne sait jamais »)
    if (c.saveData === true) return true; // économiseur de données activé
    if (c.type) return c.type !== 'wifi' && c.type !== 'ethernet';
    return true;
  } catch { return true; }
}

type EtatTts = 'absent' | 'avert' | 'chargement' | 'pret' | 'erreur';

// ── Section « Voix neuronale » (TTS sherpa-onnx, hors-ligne) ───────────────
// Séparée du modèle STT : on peut installer l'écoute sans la voix, et vice-versa.
// La double validation protège le forfait de la marchande (cf. InstallerOffline).
function InstallerVoixNeuronale() {
  const [etat, setEtat] = useState<EtatTts>(() => (sherpaTtsReady() || sherpaTtsInstalled() ? 'pret' : 'absent'));
  const [erreur, setErreur] = useState<string | null>(null);

  const demarrer = () => {
    setErreur(null);
    setEtat('avert');
    dire('La voix neuronale de Tata, pour qu elle te parle sans réseau. Environ quinze mégas. Tu veux continuer ?');
  };

  const installer = async () => {
    setErreur(null);
    setEtat('chargement');
    dire("D'accord, on installe la voix. Ne ferme pas.");
    try {
      const ok = await installSherpaTtsModel();
      if (ok && sherpaTtsReady()) {
        setEtat('pret');
        dire('C\'est bon. Tata te parle maintenant sans réseau.');
      } else {
        setEtat('erreur');
        setErreur("Le moteur de la voix n'est pas encore prêt sur ce serveur. Réessaie plus tard.");
      }
    } catch (e) {
      setEtat('erreur');
      setErreur(e instanceof Error ? e.message : String(e));
    }
  };

  const annuler = () => { setEtat('absent'); try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } };

  if (etat === 'pret') {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl py-2.5 px-4">
        <span className="w-2 h-2 rounded-full bg-green-500" /> Voix neuronale prête — Tata parle sans réseau
      </div>
    );
  }
  if (etat === 'chargement') {
    return (
      <div className="flex flex-col items-center text-center gap-3 bg-gray-50 rounded-xl py-4 px-4">
        <div className="flex gap-2" aria-hidden>
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-sm font-semibold text-gray-800">On installe la voix neuronale…</p>
      </div>
    );
  }
  if (etat === 'avert') {
    return (
      <div className="flex flex-col items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl py-4 px-4 text-center">
        <span className="text-3xl" aria-hidden>🗣️</span>
        <p className="text-[15px] font-extrabold text-amber-900 leading-snug">Installer la voix neuronale ?</p>
        <p className="text-[12.5px] text-amber-800 leading-snug max-w-xs">
          Une seule fois, avec du réseau. Mieux en Wi-Fi. Ensuite Tata te parle sans connexion.
        </p>
        <div className="flex gap-2.5 w-full max-w-xs mt-1">
          <button onClick={annuler}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-amber-900 bg-white border-2 border-amber-300">
            Plus tard
          </button>
          <button onClick={installer}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-amber-600">
            Installer
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={demarrer}
        className="flex items-center gap-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-xl transition"
      >
        🗣️ Installer la voix neuronale (TTS hors-ligne)
      </button>
      <p className="text-[11px] text-gray-400 text-center max-w-xs">
        La voix de Tata qui parle sans réseau. Une seule fois, avec du réseau, mieux en Wi-Fi.
      </p>
      {etat === 'erreur' && erreur && (
        <p className="text-[11px] text-red-500 text-center max-w-xs">Échec : {erreur}. Réessaie plus tard.</p>
      )}
    </div>
  );
}

export function InstallerOffline({ onReady }: { onReady?: () => void } = {}) {
  // « prêt » si le modèle est chargé en mémoire OU déjà installé sur l'appareil
  // (il se ré-active tout seul en tâche de fond, inutile de re-télécharger).
  const [etat, setEtat] = useState<Etat>(() => (offlineModelReady() || offlineModelInstalled() ? 'pret' : 'absent'));
  const [erreur, setErreur] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [sec, setSec] = useState(0);
  const [prog, setProg] = useState<number | null>(null); // 0..1 (sherpa : octets réels)
  const timers = useRef<Array<ReturnType<typeof setInterval>>>([]);
  const chere = connexionChere();
  // Taille + libellé selon le moteur effectif (sherpa si possible, sinon Vosk).
  const moteur = sttEngine();
  const MO = moteur === 'sherpa' ? SHERPA_TOTAL_MO : 40;

  useEffect(() => {
    if (etat !== 'chargement') return;
    const rot = setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 2600);
    const chrono = setInterval(() => setSec((s) => s + 1), 1000);
    timers.current = [rot, chrono];
    return () => { clearInterval(rot); clearInterval(chrono); };
  }, [etat]);

  // 1re validation : on ouvre l'avertissement + on le DIT à voix haute.
  const demander = () => {
    setErreur(null);
    setEtat('avert1');
    dire(chere
      ? 'Attention. Télécharger la voix coûte cher avec ton crédit internet. C\'est mieux avec le wifi. Tu veux continuer ?'
      : `On va télécharger la voix, environ ${MO} mégas. Tu veux continuer ?`);
  };

  // 2e validation.
  const confirmer1 = () => {
    setEtat('avert2');
    dire('Tu es sûre ? Ça va utiliser ton internet maintenant.');
  };

  // Lancement effectif après les DEUX validations.
  const installer = async () => {
    setErreur(null);
    setSec(0);
    setProg(null);
    setEtat('chargement');
    dire('D\'accord, on télécharge. Ne ferme pas.');
    try {
      await ensureOfflineModel((done, total) => setProg(total > 0 ? done / total : 1), moteur === 'sherpa');
      setEtat('pret');
      dire('C\'est bon. La voix marche maintenant sans réseau.');
      try { onReady?.(); } catch { /* ignore */ }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
      setEtat('erreur');
    }
  };

  const annuler = () => { setEtat('absent'); try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } };

  if (etat === 'pret') {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl py-2.5 px-4">
        <span className="w-2 h-2 rounded-full bg-green-500" /> Mode hors-ligne prêt — tu peux vendre sans réseau
      </div>
    );
  }

  if (etat === 'chargement') {
    return (
      <div className="flex flex-col items-center text-center gap-3 bg-gray-50 rounded-xl py-4 px-4">
        <div className="flex gap-2" aria-hidden>
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-sm font-semibold text-gray-800 min-h-[2.5rem] flex items-center px-2">{MESSAGES[i]}</p>
        <p className="text-[11px] text-gray-400 font-mono">
          {sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}min ${sec % 60}s`}
          {prog !== null ? ` · ${Math.round(prog * 100)}% de ~${MO} Mo` : ` · téléchargement (~${MO} Mo), ne ferme pas`}
        </p>
      </div>
    );
  }

  // 1re validation — avertissement clair « c'est très cher » (fort si données mobiles).
  if (etat === 'avert1') {
    return (
      <div className="flex flex-col items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl py-4 px-4 text-center">
        <span className="text-3xl" aria-hidden>💸</span>
        <p className="text-[15px] font-extrabold text-amber-900 leading-snug">
          {chere ? `Attention : c\'est ~${MO} Mo, ça coûte CHER en internet mobile.` : `Ça télécharge ~${MO} Mo.`}
        </p>
        <p className="text-[12.5px] text-amber-800 leading-snug max-w-xs">
          {chere
            ? 'Le mieux : le faire en Wi-Fi (gratuit). Mais tu peux continuer maintenant si tu veux — c\'est ton choix.'
            : 'Une seule fois. Ensuite la voix marche sans réseau.'}
        </p>
        <div className="flex gap-2.5 w-full max-w-xs mt-1">
          <button onClick={annuler}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-amber-900 bg-white border-2 border-amber-300">
            Plus tard
          </button>
          <button onClick={confirmer1}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-amber-600">
            Continuer
          </button>
        </div>
      </div>
    );
  }

  // 2e validation — dernière confirmation avant de consommer l'internet.
  if (etat === 'avert2') {
    return (
      <div className="flex flex-col items-center gap-3 bg-orange-50 border-2 border-orange-300 rounded-2xl py-4 px-4 text-center">
        <span className="text-3xl" aria-hidden>📶</span>
        <p className="text-[15px] font-extrabold text-orange-900 leading-snug">
          Tu es sûre ? Ça utilise ton internet maintenant.
        </p>
        <div className="flex gap-2.5 w-full max-w-xs mt-1">
          <button onClick={annuler}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-orange-900 bg-white border-2 border-orange-300">
            Non
          </button>
          <button onClick={installer}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-green-600">
            Oui, télécharger
          </button>
        </div>
      </div>
    );
  }

  // 'absent' (+ 'erreur') : point d'entrée.
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={demander}
        className="flex items-center gap-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-xl transition"
      >
        ⬇️ Installer le mode hors-ligne (~{MO} Mo) · {moteur === 'sherpa' ? 'sherpa' : 'Vosk'}
      </button>
      <p className="text-[11px] text-gray-400 text-center max-w-xs">
        Une seule fois, avec du réseau. Mieux en Wi-Fi (gratuit). Ensuite la voix marche sans connexion.
      </p>
      {etat === 'erreur' && erreur && (
        <p className="text-[11px] text-red-500 text-center max-w-xs">Échec : {erreur}. Réessaie avec du réseau.</p>
      )}
      {/* Un échec sherpa précédent l'a désactivé → bouton pour le réessayer. */}
      {moteur === 'vosk' && sherpaSupported() && (
        <button
          onClick={() => { clearSherpaUnavailable(); setEtat('absent'); }}
          className="text-[11px] text-orange-500 underline underline-offset-2 hover:text-orange-600 transition"
        >
          Réessayer avec la voix sherpa
        </button>
      )}
      {/* Voix neuronale TTS (sherpa-onnx) — indépendante de l'écoute STT */}
      <div className="w-full border-t border-dashed border-gray-200 pt-3 mt-2">
        <InstallerVoixNeuronale />
      </div>
    </div>
  );
}
