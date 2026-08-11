import { useState, useEffect, useRef } from 'react';
import { ensureOfflineModel, offlineModelReady, offlineModelInstalled, sttEngine, sherpaSupported, clearSherpaUnavailable } from './offlineStt';
import { SHERPA_TOTAL_MO } from './sherpaModel';
import {
  sherpaTtsInstalled,
  sherpaTtsReady,
  installSherpaTtsModel,
} from '../services/sherpaTts';
import { speakBrowser } from '../services/elevenlabs';
import { Banknote, Signal, Download } from 'lucide-react';

// Bouton autonome « Installer le mode hors-ligne ».
// Télécharge le modèle vocal sherpa-onnx UNE fois (en ligne), puis mis en cache
// par le navigateur / filesDir -> la voix marche ensuite sans réseau.
//
// Moteur : sherpa-onnx — plugin NATIF sur APK Android, WASM (modèle FR int8
// ~128 Mo) sur web quand le navigateur le permet (origine cross-origin isolée,
// headers COOP/COEP). Vosk a été définitivement retiré : si sherpa est
// indisponible (navigateur non isolé), le mode hors-ligne ne peut pas
// s'installer — message clair affiché.
//
// RÈGLE PRODUIT : on ne BLOQUE JAMAIS ce choix (« on ne sait jamais » : une
// marchande peut vouloir installer même en données mobiles). Mais le modèle est
// TRÈS CHER sur un forfait ivoirien on prévient clairement, à voix haute, et on
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
// inconnue on insiste alors sur le coût. En Wi-Fi avéré, l'avertissement est
// plus léger. On ne se sert de ça QUE pour le ton, jamais pour bloquer.
function connexionChere(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (navigator as any).connection;
    if (!c) return true;                 // inconnu on prévient fort (« on ne sait jamais »)
    if (c.saveData === true) return true; // économiseur de données activé
    if (c.type) return c.type !== 'wifi' && c.type !== 'ethernet';
    return true;
  } catch { return true; }
}

export function InstallerOffline({ onReady }: { onReady?: () => void } = {}) {
  // « prêt » si les DEUX briques sont installées : l'écoute hors-ligne (modèle
  // STT chargé en mémoire ou déjà installé) ET la voix neuronale de Tata (TTS).
  const [etat, setEtat] = useState<Etat>(() =>
    (offlineModelReady() || offlineModelInstalled()) && (sherpaTtsReady() || sherpaTtsInstalled())
      ? 'pret'
      : 'absent'
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [sec, setSec] = useState(0);
  const [prog, setProg] = useState<number | null>(null); // 0..1 (sherpa : octets réels)
  const [phase, setPhase] = useState<'stt' | 'tts'>('stt');
  const timers = useRef<Array<ReturnType<typeof setInterval>>>([]);
  const chere = connexionChere();
  // Moteur effectif (sherpa si possible — le seul moteur depuis le retrait de
  // Vosk). Sert à forcer l'installation et au bouton « réessayer ».
  const moteur = sttEngine();
  const MO = SHERPA_TOTAL_MO;

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
      ? 'Attention. Télécharger la voix et l\'écoute coûte cher avec ton crédit internet. C\'est mieux avec le wifi. Tu veux continuer ?'
      : `On va télécharger l'écoute et la voix de Tata, environ ${MO} mégas. Tu veux continuer ?`);
  };

  // 2e validation.
  const confirmer1 = () => {
    setEtat('avert2');
    dire('Tu es sûre ? Ça va utiliser ton internet maintenant.');
  };

  // Lancement effectif après les DEUX validations. Une SEULE action télécharge
  // les deux briques : l'écoute (modèle STT ~MO Mo) puis la voix de Tata (TTS,
  // livrée avec l'appli — simple pré-chargement, pas de gros téléchargement).
  const installer = async () => {
    setErreur(null);
    setSec(0);
    setProg(null);
    setPhase('stt');
    setEtat('chargement');
    dire('D\'accord, on télécharge. Ne ferme pas.');
    try {
      // Garde connectivité (offline-first) : ne lance pas un téléchargement de
      // ~128 Mo si Internet n'est pas VRAIMENT joignable (navigator.onLine ment
      // sur les portails captifs / Wi-Fi sans Internet). Message clair à la
      // marchande plutôt qu'un timeout muet de 30 s.
      const { hasInternet } = await import('../utils/connectivity');
      if (!(await hasInternet())) {
        setEtat('erreur');
        setErreur('Pas de connexion Internet. Branche du Wi-Fi (gratuit) et réessaie.');
        dire('Pas de connexion Internet. Branche du Wi-Fi et réessaie.');
        return;
      }
      await ensureOfflineModel((done, total) => setProg(total > 0 ? done / total : 1), moteur === 'sherpa');

      // Voix neuronale de Tata (TTS) — best effort : si elle échoue, l'écoute
      // marche déjà et Tata parle quand même (repli voix navigateur). On ne
      // bloque jamais la fin d'installation sur cette brique livrée avec l'appli.
      if (!(sherpaTtsReady() || sherpaTtsInstalled())) {
        setPhase('tts');
        setProg(null);
        try { await installSherpaTtsModel(); } catch { /* voix navigateur en repli */ }
      }

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
        <span className="w-2 h-2 rounded-full bg-green-500" /> Mode hors-ligne prêt — tu peux vendre et parler sans réseau
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
        <p className="text-sm font-semibold text-gray-800 min-h-[2.5rem] flex items-center px-2">
          {phase === 'tts' ? 'On prépare la voix de Tata…' : MESSAGES[i]}
        </p>
        <p className="text-[11px] text-gray-400 font-mono">
          {phase === 'tts'
            ? 'presque fini…'
            : sec < 60
              ? `${sec}s`
              : `${Math.floor(sec / 60)}min ${sec % 60}s`}
          {phase !== 'tts' && prog !== null && ` · ${Math.round(prog * 100)}% de ~${MO} Mo`}
          {phase !== 'tts' && prog === null && ` · téléchargement (~${MO} Mo), ne ferme pas`}
        </p>
      </div>
    );
  }

  // 1re validation — avertissement clair « c'est très cher » (fort si données mobiles).
  if (etat === 'avert1') {
    return (
      <div className="flex flex-col items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl py-4 px-4 text-center">
        <Banknote className="w-9 h-9 text-amber-600" aria-hidden />
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
        <Signal className="w-9 h-9 text-orange-600" aria-hidden />
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
        <Download className="w-4 h-4" /> Installer le mode hors-ligne (~{MO} Mo) · {moteur === 'sherpa' ? 'sherpa' : 'indisponible'}
      </button>
      <p className="text-[11px] text-gray-400 text-center max-w-xs">
        L'écoute et la voix de Tata, en une seule fois. Avec du réseau, mieux en Wi-Fi (gratuit). Ensuite tout marche sans connexion.
      </p>
      {etat === 'erreur' && erreur && (
        <p className="text-[11px] text-red-500 text-center max-w-xs">Échec : {erreur}. Réessaie avec du réseau.</p>
      )}
      {/* Un échec sherpa précédent l'a désactivé (contexte pourtant compatible)
 bouton pour réinitialiser et réessayer. */}
      {moteur === null && sherpaSupported() && (
        <button
          onClick={() => { clearSherpaUnavailable(); setEtat('absent'); }}
          className="text-[11px] text-orange-500 underline underline-offset-2 hover:text-orange-600 transition"
        >
          Réessayer la voix hors-ligne
        </button>
      )}
      {moteur === null && !sherpaSupported() && (
        <p className="text-[11px] text-gray-400 text-center max-w-xs">
          La voix hors-ligne n'est pas disponible sur ce navigateur (il lui faut
          le mode hors-ligne sécurisé). Elle l'est sur l'appli Android.
        </p>
      )}
    </div>
  );
}
