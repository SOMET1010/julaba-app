import { useState, useEffect, useRef } from 'react';
import { ensureOfflineModel, offlineModelReady, offlineModelInstalled } from './offlineStt';

// Bouton autonome « Installer le mode hors-ligne ».
// Télécharge le modèle vocal (~40 Mo) UNE fois (en ligne), puis mis en cache par
// le navigateur -> la voix marche ensuite sans réseau.
//
// RÈGLE PRODUIT : on ne BLOQUE JAMAIS ce choix (« on ne sait jamais » : une
// marchande peut vouloir installer même en données mobiles). Mais 40 Mo, c'est
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
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = 'fr-FR';
    u.rate = 0.95;
    synth.speak(u);
  } catch { /* ignore */ }
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

export function InstallerOffline({ onReady }: { onReady?: () => void } = {}) {
  // « prêt » si le modèle est chargé en mémoire OU déjà installé sur l'appareil
  // (il se ré-active tout seul en tâche de fond, inutile de re-télécharger 40 Mo).
  const [etat, setEtat] = useState<Etat>(() => (offlineModelReady() || offlineModelInstalled() ? 'pret' : 'absent'));
  const [erreur, setErreur] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [sec, setSec] = useState(0);
  const timers = useRef<Array<ReturnType<typeof setInterval>>>([]);
  const chere = connexionChere();

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
      : 'On va télécharger la voix, environ quarante mégas. Tu veux continuer ?');
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
    setEtat('chargement');
    dire('D\'accord, on télécharge. Ne ferme pas.');
    try {
      await ensureOfflineModel();
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
          {sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}min ${sec % 60}s`} · téléchargement (~40 Mo), ne ferme pas
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
          {chere ? 'Attention : c\'est ~40 Mo, ça coûte CHER en internet mobile.' : 'Ça télécharge ~40 Mo.'}
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
        ⬇️ Installer le mode hors-ligne (~40 Mo)
      </button>
      <p className="text-[11px] text-gray-400 text-center max-w-xs">
        Une seule fois, avec du réseau. Mieux en Wi-Fi (gratuit). Ensuite la voix marche sans connexion.
      </p>
      {etat === 'erreur' && erreur && (
        <p className="text-[11px] text-red-500 text-center max-w-xs">Échec : {erreur}. Réessaie avec du réseau.</p>
      )}
    </div>
  );
}
