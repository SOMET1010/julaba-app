/**
 * « J'AI UN CODE DE MON AGENT » — l'accès à l'activation (audit UX-02).
 *
 * LE DÉFAUT QU'ON FERME. `/activation` existait (routes.tsx) mais aucun écran
 * n'y menait : dans l'APK, une marchande fraîchement enrôlée, qui n'a qu'un
 * code d'activation lu par son agent, ne pouvait pas l'utiliser.
 *
 * LE BOUTON SE DIT. L'écran du code annonce sa consigne ; quand elle est
 * finie et que rien n'est encore tapé, `direConsigneCodeAgent` dit à quoi sert
 * ce bouton. Pas de clip enregistré pour cette phrase : elle part par la seule
 * porte d'avant connexion (`parlerAvantConnexion`, moteur natif), le repli
 * prévu par l'écran pour toute consigne sans clip.
 */
import React from 'react';
import { useNavigate } from 'react-router';
import { KeyRound } from 'lucide-react';
import { tParle } from '../../i18n/voice/runtime';
import { parlerAvantConnexion } from '../../services/paroleEntree';

export function direConsigneCodeAgent(): Promise<boolean> {
  return parlerAvantConnexion('connexion', tParle('ENTREE_CODE_AGENT'));
}

export function BoutonCodeAgent({ disabled }: { disabled?: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => navigate('/activation')}
      aria-label="J'ai un code de mon agent"
      style={{
        width: '100%', minHeight: 56, marginTop: 4, padding: '12px 16px', borderRadius: 16,
        border: '2px solid var(--commerce-action)', background: 'var(--commerce-surface)',
        color: 'var(--commerce-action)', fontWeight: 800, fontSize: 15, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer',
      }}
    >
      <KeyRound aria-hidden="true" size={24} />
      J&apos;ai un code de mon agent
    </button>
  );
}
