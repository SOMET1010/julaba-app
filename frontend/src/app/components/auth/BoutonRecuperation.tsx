/**
 * « TU AS PERDU TON ACCÈS ? » — la porte de la récupération (LOT-RECOVERY).
 *
 * LE PARALLÈLE AVEC BoutonCodeAgent, ET POURQUOI IL FALLAIT UN SECOND BOUTON.
 * Le code d'activation couvre la première fois ; il ne couvre pas le jour où
 * le téléphone a disparu avec l'identifiant WebAuthn. Ce jour-là, /recuperation
 * existe côté serveur (recuperation.controller.ts) — sans ce bouton, elle
 * n'était joignable par AUCUN écran : exactement le défaut UX-02 que
 * BoutonCodeAgent a fermé pour /activation.
 *
 * POSITION ET FORME, multi-canal (SPEC-AUTH-CIBLE §0.1.5) : juste sous « J'ai
 * un code de mon agent », même largeur, contour pointillé (forme distincte),
 * icône crochets, libellé dit par le moteur d'avant connexion.
 */
import React from 'react';
import { useNavigate } from 'react-router';
import { HelpCircle } from 'lucide-react';
import { tParle } from '../../i18n/voice/runtime';
import { parlerAvantConnexion } from '../../services/paroleEntree';

export function direConsigneRecuperation(): Promise<boolean> {
  return parlerAvantConnexion('connexion', tParle('RECOUV_ENTREE'));
}

export function BoutonRecuperation({ disabled }: { disabled?: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => navigate('/recuperation')}
      aria-label="Tu as perdu ton accès — récupérer ton compte"
      style={{
        width: '100%', minHeight: 52, marginTop: 8, padding: '10px 16px', borderRadius: 16,
        border: '2px dashed var(--commerce-action)', background: 'transparent',
        color: 'var(--commerce-action)', fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer',
      }}
    >
      <HelpCircle aria-hidden="true" size={22} />
      Tu as perdu ton accès&nbsp;?
    </button>
  );
}
