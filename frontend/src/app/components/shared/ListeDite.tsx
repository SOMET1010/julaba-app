/**
 * UNE LISTE QUI SE DIT — commune et marché du profil (retour terrain PIE, 07/10).
 *
 * Une liste native : sous Android elle s'ouvre en plein écran, grandes lignes.
 * `surOuverture` porte la consigne parlée (l'écran parent la dit) ; le choix
 * fait est rendu par `onChange`, que le parent fait aussi entendre.
 *
 * SANS LISTE, ON N'EMPÊCHE PAS DE RÉPONDRE. Hors réseau ou si le référentiel
 * ne répond pas, `options` est vide : le champ redevient la saisie libre
 * d'avant, plutôt qu'une liste vide qui bloquerait la fiche.
 */
import React from 'react';

interface ListeDiteProps {
  valeur: string;
  options: readonly string[];
  placeholder: string;
  surOuverture: () => void;
  onChange: (valeur: string) => void;
}

export function ListeDite({ valeur, options, placeholder, surOuverture, onChange }: ListeDiteProps) {
  if (options.length === 0) {
    return (
      <input type="text" className="julaba-field-input" placeholder={placeholder} value={valeur}
        onChange={e => onChange(e.target.value)} />
    );
  }
  return (
    <select className="julaba-field-input" aria-label={placeholder} value={valeur.trim()}
      style={{ minHeight: 44 }} onFocus={surOuverture} onChange={e => onChange(e.target.value)}>
      {valeur.trim() === '' && <option value="" disabled>{placeholder}</option>}
      {options.map(nom => <option key={nom} value={nom}>{nom}</option>)}
    </select>
  );
}
