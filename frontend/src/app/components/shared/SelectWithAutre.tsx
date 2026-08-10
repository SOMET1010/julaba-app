/**
 * JÙLABA — SelectWithAutre
 * =========================
 * Menu déroulant avec option "Autre" qui révèle un champ de saisie manuelle.
 * Utilisé dans tous les formulaires d'ajout de la plateforme.
 *
 * Usage :
 *   <SelectWithAutre
 *     label="Unité"
 *     value={newStock.unit}
 *     onChange={(v) => setNewStock({ ...newStock, unit: v })}
 *     options={['kg', 'L', 'tas', 'régimes', 'sac']}
 *     primaryColor="#C46210"
 *   />
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PenLine } from 'lucide-react';

interface SelectWithAutreProps {
  /** Valeur courante */
  value: string;
  /** Callback sur changement */
  onChange: (value: string) => void;
  /** Liste des options proposées (sans "Autre") */
  options: string[];
  /** Couleur primaire du profil */
  primaryColor?: string;
  /** Label du champ (optionnel, affiché au-dessus) */
  label?: string;
  /** Placeholder du champ texte en mode "Autre" */
  placeholder?: string;
  /** Classes CSS supplémentaires sur le select */
  className?: string;
  /** Requis */
  required?: boolean;
}

const AUTRE = '__autre__';

export function SelectWithAutre({
  value,
  onChange,
  options,
  primaryColor = '#9F8170',
  label,
  placeholder = 'Précisez...',
  className = '',
  required,
}: SelectWithAutreProps) {
  // Détermine si la valeur courante est une option connue ou non
  const isKnownOption = options.includes(value);
  const isAutreMode = !isKnownOption && value !== '';

  // État local : le select affiche "__autre__" si mode "autre"
  const [selectVal, setSelectVal] = useState(isAutreMode ? AUTRE : value);
  const [manualVal, setManualVal] = useState(isAutreMode ? value : '');

  // Sync si value change de l'extérieur
  useEffect(() => {
    if (options.includes(value)) {
      setSelectVal(value);
      setManualVal('');
    } else if (value === '') {
      setSelectVal('');
      setManualVal('');
    } else {
      setSelectVal(AUTRE);
      setManualVal(value);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setSelectVal(v);
    if (v !== AUTRE) {
      setManualVal('');
      onChange(v);
    }
    // Si "Autre" sélectionné, on attend la saisie manuelle
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setManualVal(v);
    onChange(v);
  };

  const showInput = selectVal === AUTRE;

  const selectClass = `w-full px-4 py-3 rounded-2xl border-2 bg-white focus:outline-none text-sm transition-all ${className}`;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-gray-700">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Select principal */}
      <select
        value={selectVal}
        onChange={handleSelectChange}
        className={selectClass}
        style={{
          borderColor: showInput || (selectVal && selectVal !== '') ? `${primaryColor}80` : '#E5E7EB',
        }}
        required={required && !showInput}
      >
        <option value="">Choisir...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
        <option value={AUTRE}>Autre (saisie libre)</option>
      </select>

      {/* Champ de saisie manuelle — apparaît en mode "Autre" */}
      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="relative">
              <PenLine
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: primaryColor }}
              />
              <input
                type="text"
                value={manualVal}
                onChange={handleManualChange}
                placeholder={placeholder}
                autoFocus
                required={required}
                className="w-full pl-9 pr-4 py-3 rounded-2xl border-2 text-sm focus:outline-none transition-all"
                style={{ borderColor: primaryColor }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 pl-1">
              Saisie libre — écris ce que tu veux
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}