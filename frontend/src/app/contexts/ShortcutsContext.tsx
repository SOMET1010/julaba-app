import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';

interface UndoAction {
  description: string;
  action: () => void;
}

interface ShortcutsContextType {
  registerNewAction: (action: () => void) => void;
  unregisterNewAction: () => void;
  pushUndoAction: (description: string, action: () => void) => void;
  canUndo: boolean;
}

const ShortcutsContext = createContext<ShortcutsContextType | undefined>(undefined);

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const [newActionHandler, setNewActionHandler] = useState<(() => void) | null>(null);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  const registerNewAction = useCallback((action: () => void) => {
    setNewActionHandler(() => action);
  }, []);

  const unregisterNewAction = useCallback(() => {
    setNewActionHandler(null);
  }, []);

  const pushUndoAction = useCallback((description: string, action: () => void) => {
    setUndoStack(prev => [...prev, { description, action }]);
    toast.info(`Action: ${description}`, {
      description: "Appuyez sur Cmd/Ctrl + Z pour annuler"
    });
  }, []);

  const triggerUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) {
        toast.error("Rien à annuler");
        return prev;
      }
      const newStack = [...prev];
      const lastAction = newStack.pop();
      if (lastAction) {
        lastAction.action();
        toast.success(`Action annulée : ${lastAction.description}`);
      }
      return newStack;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si l'utilisateur saisit du texte dans un input/textarea (laisser le comportement natif)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      
      // Cmd/Ctrl + N
      if (isCmdOrCtrl && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (newActionHandler) {
          newActionHandler();
        } else {
          toast.info("Aucune action 'Nouveau' définie pour cette page.");
        }
      }
      
      // Cmd/Ctrl + Z
      if (isCmdOrCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        triggerUndo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [newActionHandler, triggerUndo]);

  return (
    <ShortcutsContext.Provider value={{ registerNewAction, unregisterNewAction, pushUndoAction, canUndo: undoStack.length > 0 }}>
      {children}
    </ShortcutsContext.Provider>
  );
}

export function useShortcuts() {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcuts must be used within a ShortcutsProvider');
  }
  return context;
}
