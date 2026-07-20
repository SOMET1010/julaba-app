import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useUser } from './UserContext';

export interface InstitutionProfil {
  id: string;
  nom: string;
  region: string;
  type: string;
  modules: string[];
}

interface InstitutionAccessContextType {
  hasAccess: (module: string) => boolean;
  canAccess: (module: string) => boolean; // Alias de hasAccess
  grantAccess: (module: string) => void;
  revokeAccess: (module: string) => void;
  institutionProfil: InstitutionProfil | null;
}

const InstitutionAccessContext = createContext<InstitutionAccessContextType | undefined>(undefined);

export function InstitutionAccessProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [accessModules, setAccessModules] = useState<string[]>([
    'dashboard', 'analytics', 'acteurs', 'supervision',
    'parametres', 'profil', 'audit-trail', 'academy', 'keiwa', 'support',
  ]);

  const hasAccess = (module: string): boolean => {
    return accessModules.includes(module);
  };

  // Alias pour compatibilite
  const canAccess = hasAccess;

  const grantAccess = (module: string) => {
    if (!accessModules.includes(module)) {
      setAccessModules([...accessModules, module]);
    }
  };

  const revokeAccess = (module: string) => {
    setAccessModules(accessModules.filter(m => m !== module));
  };

  // Construire le profil institution a partir du user connecte
  const institutionProfil: InstitutionProfil | null = user?.role === 'institution'
    ? {
        id: user.id,
        nom: `${user.firstName} ${user.lastName} -- ${user.activity || 'Institution'}`,
        region: user.region || 'Nationale',
        type: user.activity || 'Supervision',
        modules: accessModules,
      }
    : null;

  const value: InstitutionAccessContextType = {
    hasAccess,
    canAccess,
    grantAccess,
    revokeAccess,
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
