/**
 * LE CLAVIER D'UNE QUANTITÉ — chiffres, effacer, zéro, ✓.
 *
 * Extrait d'`AjoutProduitGuide` (STK-04) pour servir aux DEUX questions de
 * quantité du parcours : « Tu en as combien ? » (produit neuf) et « Combien
 * tu ajoutes ? » (A1, produit qu'elle a déjà). Un seul clavier, pas deux copies.
 */
import { Check } from 'lucide-react';

const ORANGE = 'var(--commerce-action)';
const VERT = 'var(--color-green-700)';
const CIBLE = 44;
const CHIFFRES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const TOUCHE = { minHeight: CIBLE + 8, borderRadius: 12, border: '1.5px solid var(--trait)', background: 'white', fontSize: 20, fontWeight: 800, color: 'var(--encre)', cursor: 'pointer', fontFamily: 'inherit' } as const;

interface Props {
  /** Ce qu'elle a tapé, en chiffres ; vide = rien dit. */
  valeur: string;
  onChange: (v: string) => void;
  onValider: () => void;
  enCours: boolean;
}

export function ClavierQuantite({ valeur, onChange, onValider, enCours }: Props) {
  const taper = (d: string) => onChange((valeur + d).slice(0, 6));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {CHIFFRES.map(d => (
        <button key={d} type="button" onClick={() => taper(d)} style={TOUCHE}>{d}</button>
      ))}
      <button type="button" onClick={() => onChange(valeur.slice(0, -1))} aria-label="Effacer un chiffre"
        style={{ ...TOUCHE, color: ORANGE }}>⌫</button>
      <button type="button" onClick={() => taper('0')} style={TOUCHE}>0</button>
      <button type="button" onClick={onValider} disabled={enCours} aria-label="Enregistrer"
        style={{ ...TOUCHE, border: 'none', background: VERT, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Check size={22} />
      </button>
    </div>
  );
}
