import { useState, useEffect } from 'react';
import { ensureOfflineModel, offlineModelReady, offlineModelInstalled } from './offlineStt';

// État du mode hors-ligne — version sherpa-onnx (moteur EMBARQUÉ dans l'APK).
//
// Avant (Vosk) : ce composant téléchargeait un modèle de ~40 Mo avec double
// validation et avertissement de coût. Depuis le retrait de Vosk
// (docs/INCLUSION.md), il n'y a PLUS RIEN à télécharger : le moteur vit dans
// l'application Android. Ce composant ne fait donc plus que constater :
// - moteur présent  → « prêt, tu peux vendre sans réseau » ;
// - moteur absent   → on est sur le web : la voix complète vit dans l'appli.

type Etat = 'verification' | 'pret' | 'indisponible';

export function InstallerOffline({ onReady }: { onReady?: () => void } = {}) {
  const [etat, setEtat] = useState<Etat>(() =>
    (offlineModelReady() || offlineModelInstalled() ? 'pret' : 'verification'));

  useEffect(() => {
    if (etat !== 'verification') return;
    let annule = false;
    (async () => {
      try {
        await ensureOfflineModel(); // simple sonde du moteur natif, aucun réseau
        if (!annule) { setEtat('pret'); try { onReady?.(); } catch { /* ignore */ } }
      } catch {
        if (!annule) setEtat('indisponible');
      }
    })();
    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat]);

  if (etat === 'pret') {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl py-2.5 px-4">
        <span className="w-2 h-2 rounded-full bg-green-500" /> Mode hors-ligne prêt — tu peux vendre sans réseau
      </div>
    );
  }

  if (etat === 'verification') {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl py-2.5 px-4">
        <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" /> Vérification de la voix…
      </div>
    );
  }

  // Web (navigateur) : pas de moteur natif — on le dit simplement, sans jargon.
  return (
    <div className="flex items-center justify-center gap-2 text-[13px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl py-2.5 px-4 text-center">
      La voix marche dans l'application Julaba installée sur le téléphone. Ici, tu peux taper.
    </div>
  );
}
