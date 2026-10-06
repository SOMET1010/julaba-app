import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { API_URL } from '../utils/api';
import { toast } from 'sonner';

export interface ContactChannel {
  id: string;
  type: 'phone' | 'whatsapp' | 'email';
  label: string;
  detail: string;
  sublabel?: string;
  actif: boolean;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  categorie: string;
  actif: boolean;
  ordre: number;
}

export interface PointPhysique {
  actif: boolean;
  description: string;
  horaires: string;
}

export interface SupportConfig {
  emailSupport: string;
  phoneSupport: string;
  horaires: string;
  urlFAQ: string;
  urlGuide: string;
  contacts: ContactChannel[];
  messageAccueil: string;
  serviceActif: boolean;
  horairesDisponibilite: string;
  faq: FAQItem[];
  pointPhysique: PointPhysique;
  derniereMaj: string;
}

interface SupportConfigContextType {
  config: SupportConfig;
  isSaving: boolean;
  updateConfig: (updates: Partial<SupportConfig>) => void;
  updateContact: (id: string, updates: Partial<ContactChannel>) => void;
  addContact: (contact: ContactChannel) => void;
  removeContact: (id: string) => void;
  updateFAQ: (id: string, updates: Partial<FAQItem>) => void;
  addFAQ: (item: Omit<FAQItem, 'id' | 'ordre'>) => void;
  removeFAQ: (id: string) => void;
  reorderFAQ: (id: string, direction: 'up' | 'down') => void;
  updatePointPhysique: (updates: Partial<PointPhysique>) => void;
  resetToDefault: () => void;
}

const DEFAULT_CONTACTS: ContactChannel[] = [
  { id: '1', type: 'phone', label: 'Appeler le support', detail: '+225 27 20 00 00 00', sublabel: 'Lun-Ven 8h-18h', actif: true },
  { id: '2', type: 'whatsapp', label: 'WhatsApp', detail: '0700000000', sublabel: 'Réponse rapide', actif: true },
  { id: '3', type: 'email', label: 'Email', detail: 'support@julaba.ci', sublabel: 'Réponse sous 24h', actif: true },
];

const DEFAULT_FAQ: FAQItem[] = [
  { id: 'faq1', question: 'Comment ouvrir ma journée de vente ?', answer: 'Depuis le dashboard, appuie sur "Ouvrir la journée" et saisis ton fond de caisse initial.', categorie: 'transaction', actif: true, ordre: 1 },
  { id: 'faq2', question: "Comment consulter mon solde ?", answer: "Ton solde est affiché en haut de ton dashboard dans la carte portefeuille.", categorie: 'solde', actif: true, ordre: 2 },
  { id: 'faq3', question: "J'ai un problème de connexion, que faire ?", answer: "Vérifie ta connexion internet. Si le problème persiste, essaie de te déconnecter et reconnecte-toi.", categorie: 'connexion', actif: true, ordre: 3 },
  { id: 'faq4', question: 'Comment signaler une transaction incorrecte ?', answer: 'Ouvre un ticket de support en bas de cette page avec le détail de la transaction concernée.', categorie: 'transaction', actif: true, ordre: 4 },
];

export const DEFAULT_CONFIG: SupportConfig = {
  emailSupport: 'support@julaba.ci',
  phoneSupport: '+225 27 20 00 00 00',
  horaires: 'Lun-Ven 8h-18h, Sam 8h-13h',
  urlFAQ: 'https://julaba.ci/faq',
  urlGuide: 'https://julaba.ci/guide',
  contacts: DEFAULT_CONTACTS,
  messageAccueil: "Notre équipe est là pour t'aider",
  serviceActif: true,
  horairesDisponibilite: 'Lun-Ven 8h-18h',
  faq: DEFAULT_FAQ,
  pointPhysique: {
    actif: true,
    description: "Rends-toi dans une agence JÙLABA agréée pour obtenir une aide en personne.",
    horaires: 'Lun-Sam 8h-17h',
  },
  derniereMaj: new Date().toISOString(),
};

const SupportConfigContext = createContext<SupportConfigContextType | undefined>(undefined);

export function SupportConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SupportConfig>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);

  // Charger depuis l'API au mount
  useEffect(() => {
    fetch(`${API_URL}/support/config`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.config) {
          setConfig({
            ...DEFAULT_CONFIG,
            ...data.config,
            derniereMaj: data.config?.derniereMaj || data.updatedAt || new Date().toISOString(),
          });
        }
      })
      .catch(() => {});
  }, []);

  // Persister sur l'API
  const persist = useCallback(async (newConfig: SupportConfig) => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/support/config`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig }),
      });
      if (!res.ok) throw new Error('Erreur sauvegarde config support');
    } catch {
      toast.error('Impossible de sauvegarder la configuration support');
    }
    finally { setIsSaving(false); }
  }, []);

  const update = useCallback((updater: (prev: SupportConfig) => SupportConfig) => {
    setConfig(prev => {
      const next = updater(prev);
      const withDate = { ...next, derniereMaj: new Date().toISOString() };
      persist(withDate);
      return withDate;
    });
  }, [persist]);

  const updateConfig = useCallback((updates: Partial<SupportConfig>) => {
    update(prev => ({ ...prev, ...updates }));
  }, [update]);

  const updateContact = useCallback((id: string, updates: Partial<ContactChannel>) => {
    update(prev => ({
      ...prev,
      contacts: prev.contacts.map(c => c.id === id ? { ...c, ...updates } : c),
    }));
  }, [update]);

  const addContact = useCallback((contact: ContactChannel) => {
    update(prev => ({ ...prev, contacts: [...prev.contacts, contact] }));
  }, [update]);

  const removeContact = useCallback((id: string) => {
    update(prev => ({ ...prev, contacts: prev.contacts.filter(c => c.id !== id) }));
  }, [update]);

  const updateFAQ = useCallback((id: string, updates: Partial<FAQItem>) => {
    update(prev => ({
      ...prev,
      faq: prev.faq.map(f => f.id === id ? { ...f, ...updates } : f),
    }));
  }, [update]);

  const addFAQ = useCallback((item: Omit<FAQItem, 'id' | 'ordre'>) => {
    update(prev => ({
      ...prev,
      faq: [...prev.faq, {
        ...item,
        id: `faq-${Date.now()}`,
        ordre: Math.max(0, ...prev.faq.map(f => f.ordre)) + 1,
      }],
    }));
  }, [update]);

  const removeFAQ = useCallback((id: string) => {
    update(prev => ({ ...prev, faq: prev.faq.filter(f => f.id !== id) }));
  }, [update]);

  const reorderFAQ = useCallback((id: string, direction: 'up' | 'down') => {
    update(prev => {
      const sorted = [...prev.faq].sort((a, b) => a.ordre - b.ordre);
      const idx = sorted.findIndex(f => f.id === id);
      if (idx === -1) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;
      const newFaq = [...sorted];
      [newFaq[idx].ordre, newFaq[swapIdx].ordre] = [newFaq[swapIdx].ordre, newFaq[idx].ordre];
      return { ...prev, faq: newFaq };
    });
  }, [update]);

  const updatePointPhysique = useCallback((updates: Partial<PointPhysique>) => {
    update(prev => ({ ...prev, pointPhysique: { ...prev.pointPhysique, ...updates } }));
  }, [update]);

  const resetToDefault = useCallback(() => {
    const reset = { ...DEFAULT_CONFIG, derniereMaj: new Date().toISOString() };
    setConfig(reset);
    persist(reset);
  }, [persist]);

  return (
    <SupportConfigContext.Provider value={{
      config, isSaving,
      updateConfig, updateContact, addContact, removeContact,
      updateFAQ, addFAQ, removeFAQ, reorderFAQ,
      updatePointPhysique, resetToDefault,
    }}>
      {children}
    </SupportConfigContext.Provider>
  );
}

export function useSupportConfig() {
  const context = useContext(SupportConfigContext);
  if (!context) throw new Error('useSupportConfig must be used within SupportConfigProvider');
  return context;
}
