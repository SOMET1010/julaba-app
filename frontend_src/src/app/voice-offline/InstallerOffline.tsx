import { useState, useEffect, useRef } from 'react';
import { ensureOfflineModel, offlineModelReady } from './offlineStt';

// Bouton autonome « Installer le mode hors-ligne ».
// Télécharge le modèle vocal (~40 Mo) UNE fois (en ligne), puis mis en cache par
// le navigateur -> la voix marche ensuite sans réseau. Loader vivant en nouchi
// pendant le téléchargement (long et silencieux sinon). Styles Tailwind standard
// (aucune dépendance au thème Julaba).

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

type Etat = 'absent' | 'chargement' | 'pret' | 'erreur';

export function InstallerOffline() {
  const [etat, setEtat] = useState<Etat>(() => (offlineModelReady() ? 'pret' : 'absent'));
  const [erreur, setErreur] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [sec, setSec] = useState(0);
  const timers = useRef<Array<ReturnType<typeof setInterval>>>([]);

  useEffect(() => {
    if (etat !== 'chargement') return;
    const rot = setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 2600);
    const chrono = setInterval(() => setSec((s) => s + 1), 1000);
    timers.current = [rot, chrono];
    return () => { clearInterval(rot); clearInterval(chrono); };
  }, [etat]);

  const installer = async () => {
    setErreur(null);
    setSec(0);
    setEtat('chargement');
    try {
      await ensureOfflineModel();
      setEtat('pret');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
      setEtat('erreur');
    }
  };

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

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={installer}
        className="flex items-center gap-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-xl transition"
      >
        ⬇️ Installer le mode hors-ligne (~40 Mo)
      </button>
      <p className="text-[11px] text-gray-400 text-center max-w-xs">
        Une seule fois, avec du réseau. Ensuite la voix marche sans connexion.
      </p>
      {etat === 'erreur' && erreur && (
        <p className="text-[11px] text-red-500 text-center max-w-xs">Échec : {erreur}. Réessaie avec du réseau.</p>
      )}
    </div>
  );
}
