import { MOT_INDISPONIBLE } from '../../services/etatLectureBO';

/**
 * À la place d'un graphique dont les données n'existent pas : le mot
 * « Indisponible » et la raison. Jamais une courbe inventée, jamais des zéros.
 */
export function GraphiqueIndisponible({ raison, hauteur }: { raison: string; hauteur: number }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-1" style={{ minHeight: hauteur }}>
      <p className="font-bold text-gray-700">{MOT_INDISPONIBLE}</p>
      <p className="text-sm text-gray-500">{raison.charAt(0).toUpperCase() + raison.slice(1)}.</p>
    </div>
  );
}
