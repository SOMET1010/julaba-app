import { useEffect, useState } from 'react';
import { boGetActeurs, type Acteur } from '../services/backoffice-api';

export interface CompteInstitution {
  id: string;
  nom: string;
  telephone: string;
}

/**
 * Comptes de rôle `institution`, candidats au rôle de responsable d'une fiche
 * institution (BO). Source : GET /users?role=institution (route BO existante).
 */
export function useComptesInstitution() {
  const [comptes, setComptes] = useState<CompteInstitution[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let actif = true;
    boGetActeurs({ role: 'institution', limit: 100 })
      .then(({ data }) => {
        if (!actif) return;
        setComptes(data.map((u: Acteur & { prenom?: string }) => ({
          id: u.id,
          nom: `${u.prenom ?? u.prenoms ?? ''} ${u.nom ?? ''}`.trim() || 'Compte sans nom',
          telephone: u.telephone ?? '',
        })));
      })
      .catch(() => { if (actif) setErreur('Liste des comptes institution indisponible. Réessaie.'); })
      .finally(() => { if (actif) setChargement(false); });
    return () => { actif = false; };
  }, []);

  return { comptes, erreur, chargement };
}
