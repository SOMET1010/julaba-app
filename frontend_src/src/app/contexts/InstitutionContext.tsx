import React, { createContext, useContext, useState, ReactNode } from 'react';
import { InstitutionPermissions } from './BackOfficeContext';

// Les chiffres du profil institution viennent de `hooks/useInstitutionData`
// (routes `/institution/*`, filtrées par la garde de périmètre). Ce contexte
// n'appelle aucune route : les anciennes lectures `/admin/analytics/*`,
// `/admin/config` et `/audit` étaient réservées aux administrateurs et
// rendaient des zéros (403) affichés comme de vrais chiffres.

export interface Institution {
  id: string;
  nom: string;
  type: string;
  modules: string[];
  permissions?: InstitutionPermissions;
  statut: string;
}

interface InstitutionContextType {
  institution: Institution | null;
  setInstitution: (institution: Institution | null) => void;
}

const InstitutionContext = createContext<InstitutionContextType | undefined>(undefined);

export function InstitutionProvider({ children }: { children: ReactNode }) {
  const [institution, setInstitution] = useState<Institution | null>(null);
  return (
    <InstitutionContext.Provider value={{ institution, setInstitution }}>
      {children}
    </InstitutionContext.Provider>
  );
}

export function useInstitution() {
  const context = useContext(InstitutionContext);
  if (!context) {
    throw new Error('useInstitution must be used within InstitutionProvider');
  }
  return context;
}
