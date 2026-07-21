import { useEffect } from 'react';
import { useNavigate, useRouteError } from 'react-router';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Erreur de route. Cause la plus fréquente : un « chunk » de page qui ne se charge
// pas — soit hors-ligne (page jamais mise en cache), soit juste après un
// déploiement (l'ancien nom de fichier n'existe plus). On récupère en douceur.
function isChunkLoadError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || err || '');
  return /dynamically imported module|importing a module script failed|failed to fetch|chunkloaderror|loading chunk/i.test(msg);
}

export function ErrorFallback() {
  const navigate = useNavigate();
  const error = useRouteError();
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const chunk = isChunkLoadError(error);

  // Chunk manquant + EN LIGNE = très probablement une nouvelle version déployée :
  // on recharge UNE fois pour récupérer les bons fichiers (garde anti-boucle).
  useEffect(() => {
    if (!chunk || !online) return;
    let already = false;
    try { already = sessionStorage.getItem('julaba_chunk_reloaded') === '1'; } catch { /* ignore */ }
    if (already) return;
    try { sessionStorage.setItem('julaba_chunk_reloaded', '1'); } catch { /* ignore */ }
    window.location.reload();
  }, [chunk, online]);

  const titre = chunk && !online ? 'Cette page a besoin du réseau' : 'Oops, une erreur est survenue';
  const message = chunk && !online
    ? "Ouvre-la une fois avec du réseau, ensuite elle marchera hors-ligne."
    : 'Réessaie, ma chère.';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
      <AlertCircle className="w-16 h-16 text-orange-400 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">{titre}</h2>
      <p className="text-gray-500 text-center mb-6">{message}</p>
      {Boolean(error) && import.meta.env.DEV && (
        <p className="text-xs text-red-400 text-center mb-4 max-w-sm break-all">
          {(error as { message?: string })?.message || String(error)}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-2xl bg-orange-400 text-white font-bold inline-flex items-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Réessayer
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 font-bold"
        >
          Accueil
        </button>
      </div>
    </div>
  );
}
