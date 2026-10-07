import React from 'react';
import { CloudOff } from 'lucide-react';
import { ROLE_COLORS } from '../../config/roleConfig';

/**
 * Une donnée sans source pour le profil institution se DIT indisponible :
 * jamais un zéro ni une courbe inventée, qui se liraient comme de vrais chiffres.
 */
export function DonneeIndisponible({ titre, raison }: { titre: string; raison: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center text-center gap-2 py-8 px-4 rounded-2xl border-2 border-dashed"
      style={{ borderColor: `${ROLE_COLORS.institution}40` }}
    >
      <CloudOff className="w-10 h-10" style={{ color: ROLE_COLORS.institution }} aria-hidden />
      <p className="font-bold text-gray-900">{titre}</p>
      <p className="text-sm text-gray-500 max-w-xs">{raison}</p>
    </div>
  );
}
