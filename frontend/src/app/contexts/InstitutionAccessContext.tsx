import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser } from './UserContext';
import { nomAffiche } from '../services/accueilInstitution';
import { API_URL } from '../utils/api';
import { apiRequest } from '../services/api/api-client';

// DGE-11 (20/10/2026) — LES MODULES DE L'ESPACE INSTITUTION VIENNENT DU
// SERVEUR, PLUS D'UNE LISTE EN DUR.
//
// Constat (AUDIT-PARCOURS-DGE-BACKOFFICE §DGE-11) : ce contexte posait
// `useState(['dashboard','analytics','acteurs','supervision',...])` — dix
// clés inventées, sans rapport avec `institutions.modules`, le jsonb que
// InstitutionScopeGuard applique côté API (@RequireInstitutionModule :
// dashboard / acteurs / transactions / audit). Résultat : le front laissait
// voir des onglets que l'API renvoyait en 403, et réciproquement ; les
// grantAccess/revokeAccess locaux n'écrivaient nulle part.
//
// Désormais : GET /institutions (auto-scopé responsable_id = l'utilisateur
// connecté côté serveur) fournit la fiche de SON institution, dont
// `modules`. `hasAccess` applique LA MÊME RÈGLE que le guard : niveau
// présent et différent de 'aucun'. FAIL-CLOSED : tant que le serveur n'a
// pas répondu (chargement, erreur, fiche absente), AUCUN module n'est
// accordé — jamais de liste par défaut qui ferait illusion.

export interface InstitutionProfil {
  id?: string;
  /** Nom réel de la personne connectée, ou `null` : jamais « undefined ». */
  nom: string | null;
  region: string;
  type: string;
  /** modules serveur (institutions.modules) : clé de module -> NiveauAcces. */
  modules: Record<string, string>;
  /** Lu par InstitutionLayout (compte suspendu). */
  statut?: string;
}

interface InstitutionAccessContextType {
  hasAccess: (module: string) => boolean;
  /** Alias de hasAccess. */
  canAccess: (module: string) => boolean;
  /** true tant que le serveur n'a pas encore parlé (fail-closed en cours). */
  chargement: boolean;
  institutionProfil: InstitutionProfil | null;
}

const InstitutionAccessContext = createContext<InstitutionAccessContextType | undefined>(undefined);

export function InstitutionAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  // null = le serveur n'a pas encore parlé (ou a refusé) → fail-closed.
  const [modulesServeur, setModulesServeur] = useState<Record<string, string> | null>(null);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    if (user?.role !== 'institution') {
      setModulesServeur(null);
      setChargement(false);
      return;
    }
    let annule = false;
    setChargement(true);
    setModulesServeur(null);
    apiRequest<any>(API_URL, '/institutions', { method: 'GET' })
      .then((page) => {
        if (annule) return;
        // GET /institutions est filtré côté serveur : responsable_id =
        // l'utilisateur courant → la première fiche est LA SIENNE.
        const fiche = page?.data?.[0] ?? null;
        const modules = fiche?.modules;
        setModulesServeur(
          modules && typeof modules === 'object' && !Array.isArray(modules)
            ? (modules as Record<string, string>)
            : {},
        );
      })
      .catch(() => {
        if (!annule) setModulesServeur({});
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });
    return () => { annule = true; };
  }, [user?.id, user?.role]);

  const hasAccess = (module: string): boolean => {
    if (!modulesServeur) return false;
    const niveau = modulesServeur[module];
    return Boolean(niveau) && niveau !== 'aucun';
  };

  // Construire le profil institution à partir du user connecté + de la fiche serveur
  const institutionProfil: InstitutionProfil | null = user?.role === 'institution'
    ? {
        id: user.id,
        nom: nomAffiche(user.prenoms, user.nom),
        region: user.region || 'Nationale',
        type: user.activity || 'Supervision',
        modules: modulesServeur ?? {},
      }
    : null;

  const value: InstitutionAccessContextType = {
    hasAccess,
    canAccess: hasAccess,
    chargement,
    institutionProfil,
  };

  return (
    <InstitutionAccessContext.Provider value={value}>
      {children}
    </InstitutionAccessContext.Provider>
  );
}

export function useInstitutionAccess() {
  const context = useContext(InstitutionAccessContext);
  if (!context) {
    throw new Error('useInstitutionAccess must be used within InstitutionAccessProvider');
  }
  return context;
}
