// ──────────────────────────────────────────────────────────────────────────
// EngineBadge — petit indicateur du moteur vocal hors-ligne actif.
//
// Vert = prêt à transcrire sur l'appareil (sherpa-onnx WASM, Vosk, ou plugin
// natif Android). Gris = modèle pas encore installé (InstallerOffline gère le
// téléchargement). Parle à une non-lectrice : court, icône + couleur.
//
// Se met à jour tout seul quand le moteur passe à « prêt » (installation ou
// ré-échauffement au boot) grâce à subscribeModelReady().
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import {
  offlineModelReady,
  offlineModelInstalled,
  sttEngine,
  subscribeModelReady,
} from './offlineStt';
import { nativeStt } from './nativeStt';

function Pill({ dot, text }: { dot: string; text: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{ background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: dot }} />
      <span className="text-[10.5px] font-bold" style={{ color: '#6B7280', letterSpacing: '0.04em' }}>
        {text}
      </span>
    </span>
  );
}

export function EngineBadge() {
  const [natif, setNatif] = useState(false);
  const [ready, setReady] = useState(() => offlineModelReady());
  const [installed, setInstalled] = useState(() => offlineModelInstalled());

  useEffect(() => {
    let cancelled = false;
    nativeStt.isAvailable()
      .then((ok) => { if (!cancelled) setNatif(ok); })
      .catch(() => { if (!cancelled) setNatif(false); });
    const unsub = subscribeModelReady(() => {
      if (cancelled) return;
      setReady(offlineModelReady());
      setInstalled(offlineModelInstalled());
    });
    return () => { cancelled = true; unsub(); };
  }, []);

  if (natif) {
    return <Pill dot="#16A34A" text="Voix native (Android)" />;
  }
  if (ready) {
    const moteur = sttEngine();
    return (
      <Pill
        dot="#16A34A"
        text={`Hors-ligne prêt · ${moteur === 'sherpa' ? 'sherpa' : 'Vosk'}`}
      />
    );
  }
  if (installed) {
    return <Pill dot="#F59E0B" text="Voix hors-ligne…" />;
  }
  return <Pill dot="#9CA3AF" text="Voix à installer" />;
}
