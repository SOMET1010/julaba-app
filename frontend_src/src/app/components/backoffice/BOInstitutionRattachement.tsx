import React, { useEffect } from 'react';
import { AlertCircle, UserCheck, UserX } from 'lucide-react';
import { useBackOffice, InstitutionBO } from '../../contexts/BackOfficeContext';
import { useComptesInstitution } from '../../hooks/useComptesInstitution';

// Rattachement d'une fiche institution : le COMPTE responsable (rôle
// institution) et la ZONE supervisée. Les deux sont exigés par la garde
// serveur `/institution/*` : sans eux, le compte institution reçoit 403.

export interface Rattachement {
  responsable_id: string;
  zone_id: string;
}

export const SANS_RATTACHEMENT: Rattachement = { responsable_id: '', zone_id: '' };

/** Champ vide = aucun lien (null côté serveur), jamais une chaîne vide en base. */
export function versServeur(r: Rattachement): { responsable_id: string | null; zone_id: string | null } {
  return { responsable_id: r.responsable_id || null, zone_id: r.zone_id || null };
}

/** Les appels BO ne rendent que le code HTTP : on le traduit en phrase. */
export function messageServeur(err: unknown, parDefaut: string): string {
  const code = err instanceof Error ? err.message : '';
  if (code === '409') return 'Ce compte est déjà responsable d\'une autre institution.';
  if (code === '400') return 'Le responsable doit être un compte existant de rôle institution.';
  return parDefaut;
}

const selectCls = 'w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#712864] transition-all bg-white';

export function ChampsRattachement({
  valeur, onChange, institutionId,
}: {
  valeur: Rattachement;
  onChange: (v: Rattachement) => void;
  /** Fiche en cours de modification : son propre responsable reste choisissable. */
  institutionId?: string;
}) {
  const { institutions, zones, refreshZones } = useBackOffice();
  const { comptes, erreur, chargement } = useComptesInstitution();
  useEffect(() => { void refreshZones(); }, [refreshZones]);

  const prisPar = new Map(
    institutions
      .filter((i: InstitutionBO) => i.responsable_id && i.id !== institutionId)
      .map((i: InstitutionBO) => [i.responsable_id as string, i.nom ?? '']),
  );

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Compte responsable (rôle institution)</label>
        <select
          value={valeur.responsable_id}
          onChange={e => onChange({ ...valeur, responsable_id: e.target.value })}
          className={selectCls}
          disabled={chargement}
        >
          <option value="">{chargement ? 'Chargement…' : 'Aucun compte rattaché'}</option>
          {comptes.map(c => (
            <option key={c.id} value={c.id} disabled={prisPar.has(c.id)}>
              {c.nom} · {c.telephone}{prisPar.has(c.id) ? ` — déjà responsable de « ${prisPar.get(c.id)} »` : ''}
            </option>
          ))}
        </select>
        {erreur && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{erreur}</p>}
        {!chargement && !erreur && comptes.length === 0 && (
          <p className="text-xs text-amber-700 mt-1">Aucun compte de rôle institution. Créez-le d'abord dans Utilisateurs.</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">Zone supervisée</label>
        <select value={valeur.zone_id} onChange={e => onChange({ ...valeur, zone_id: e.target.value })} className={selectCls}>
          <option value="">Aucune zone</option>
          {zones.filter(z => z.id).map(z => (
            <option key={z.id} value={z.id}>{z.nom ?? z.id}{z.region ? ` — ${z.region}` : ''}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** Ligne de la carte : qui se connecte pour cette institution, ou alerte s'il n'y a personne. */
export function ResponsableRattache({ inst }: { inst: InstitutionBO }) {
  if (!inst.responsable) {
    return (
      <div className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 border-2 border-amber-200 rounded-2xl px-3 py-2 mt-2">
        <UserX className="w-4 h-4 flex-shrink-0" />
        Aucun compte rattaché : personne ne peut se connecter pour cette institution.
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 border-2 border-green-200 rounded-2xl px-3 py-2 mt-2">
      <UserCheck className="w-4 h-4 flex-shrink-0" />
      {inst.responsable.nom} · {inst.responsable.telephone}
    </div>
  );
}
