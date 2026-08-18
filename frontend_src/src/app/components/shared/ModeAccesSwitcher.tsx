import { useState } from 'react';
import * as audioManager from '../../services/audioManager';
import { getAccessMode, setAccessMode, type AccessMode } from '../../utils/accessMode';

// ──────────────────────────────────────────────────────────────────────────
// Bascule du MODE D'ACCÈS — utilisable dans n'importe quels paramètres (marchand,
// producteur, coopérative…). Change comment Julaba s'adapte, à tout moment.
// « Si Tata peut le dire, l'écran n'a pas besoin de l'écrire » : chaque choix est
// aussi lu à voix haute (voix du téléphone, hors-ligne).
// ──────────────────────────────────────────────────────────────────────────

const OPTIONS: { m: AccessMode; emoji: string; couleur: string; titre: string; sous: string; dire: string }[] = [
  { m: 'auto',    emoji: '🔵', couleur: '#2563eb', titre: 'Automatique',        sous: 'Julaba s\'adapte à ta façon de faire',     dire: 'Automatique. Julaba s\'adapte à ta façon de faire.' },
  { m: 'lecture', emoji: '🟢', couleur: '#16a34a', titre: 'Je lis et j\'écris', sous: 'Clavier direct, peu de voix',               dire: 'Je sais lire et écrire. Clavier direct.' },
  { m: 'mixte',   emoji: '🟡', couleur: '#C46210', titre: 'Je lis un peu',      sous: 'Texte et voix, clavier ou micro',          dire: 'Je lis un peu. Texte et voix.' },
  { m: 'voix',    emoji: '🟠', couleur: '#DB7A2C', titre: 'Je préfère parler',  sous: 'Tata guide, le micro au centre',           dire: 'Je préfère parler. Tata t\'accompagne.' },
];

// Via l'audioManager (hygiène post-audit C4) : même voix FR stable que le reste
// de l'appli, créneau exclusif — plus de speechSynthesis brut qui joue sous un clip.
function dire(texte: string) {
  try { void audioManager.speak(texte); } catch { /* ignore */ }
}

export function ModeAccesSwitcher() {
  const [mode, setMode] = useState<AccessMode>(() => getAccessMode());

  const choisir = (m: AccessMode, texte: string) => {
    setMode(m);
    setAccessMode(m);      // notifie l'appli (les écrans se ré-adaptent en direct)
    dire(texte + ' C\'est fait.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 13, color: '#8A5A34', fontWeight: 600, margin: '0 0 2px' }}>
        Comment Julaba s'adapte à toi
      </p>
      {OPTIONS.map((o) => {
        const actif = mode === o.m;
        return (
          <button key={o.m} type="button" onClick={() => choisir(o.m, o.dire)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%',
              borderRadius: 16, padding: '13px 14px', cursor: 'pointer',
              border: `2px solid ${actif ? o.couleur : o.couleur + '33'}`,
              background: actif ? o.couleur + '14' : '#fff',
            }}>
            <span style={{ fontSize: 26, lineHeight: 1 }}>{o.emoji}</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 15.5, fontWeight: 800, color: '#2b1608' }}>{o.titre}</span>
              <span style={{ display: 'block', fontSize: 12.5, color: '#7a5638' }}>{o.sous}</span>
            </span>
            <span style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${actif ? o.couleur : '#d8c4ad'}`,
              background: actif ? o.couleur : 'transparent',
              display: 'grid', placeItems: 'center',
            }}>
              {actif && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
