import { MOT_INDISPONIBLE } from '../../services/etatLectureBO';

/**
 * À la place d'un graphique dont les données n'existent pas : le mot
 * « Indisponible » et la raison. Jamais une courbe inventée, jamais des zéros.
 * Couleurs, typographie et espacements : jetons de styles/commerce.css.
 */
export function GraphiqueIndisponible({ raison, hauteur }: { raison: string; hauteur: number }) {
  return (
    <div
      style={{
        minHeight: hauteur, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', textAlign: 'center', gap: 'var(--caisse-esp-1)',
      }}
    >
      <p style={{ font: 'var(--caisse-font-texte)', fontWeight: 700, color: 'var(--commerce-ink)' }}>{MOT_INDISPONIBLE}</p>
      <p style={{ font: 'var(--caisse-font-legende)', color: 'var(--caisse-gris-texte)' }}>
        {raison.charAt(0).toUpperCase() + raison.slice(1)}.
      </p>
    </div>
  );
}
