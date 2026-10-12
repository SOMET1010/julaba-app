/**
 * A1 — ELLE L'A DÉJÀ : COMBIEN ELLE EN AJOUTE (retour terrain PIE, 07/10).
 *
 * Affiché par `AjoutProduitGuide` quand le nom qu'elle donne est déjà sur son
 * étal. On ne lui fait pas reposer le produit : on lui demande combien elle en
 * ajoute. La question est DITE par le parcours (STOCK_055) ; ici, on la montre.
 * Cet écran ne décide rien et n'écrit rien : `onValider` remonte ce qu'elle a
 * tapé, le parent complète (ou dit qu'il n'a rien changé).
 */
import { useState } from 'react';
import type { ProduitSurEtal } from '../../services/premierProduit';
import { ClavierQuantite } from './ClavierQuantite';

interface Props {
  existant: Pick<ProduitSurEtal, 'nom' | 'unite'>;
  enCours: boolean;
  onValider: (ajout: string) => void;
  /** Ce n'est pas le même produit (autre façon de le vendre). */
  onAutre: () => void;
}

export function ComplementEtal({ existant, enCours, onValider, onAutre }: Props) {
  const [ajout, setAjout] = useState('');
  return (
    <>
      <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--encre)', margin: 0 }}>
        {existant.nom}, tu en as déjà. Combien de {existant.unite} tu ajoutes ?
      </p>
      <div aria-live="polite" style={{ minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: `2px solid ${ajout ? 'var(--color-green-700)' : 'var(--commerce-gray-100)'}`, borderRadius: 14, fontSize: 26, fontWeight: 800, color: 'var(--encre)' }}>
        {ajout ? `+ ${Number(ajout).toLocaleString('fr-FR')} ${existant.unite}` : '—'}
      </div>
      <ClavierQuantite valeur={ajout} onChange={setAjout} enCours={enCours} onValider={() => onValider(ajout)} />
      <button type="button" onClick={onAutre}
        style={{ minHeight: 44, background: 'none', border: 'none', color: 'var(--commerce-action)', fontSize: 14, fontWeight: 800, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>
        C'est un autre
      </button>
    </>
  );
}
