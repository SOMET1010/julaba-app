import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ChevronDown, Search, X } from 'lucide-react';
import { BO_PRIMARY } from './bo-theme';
import {
  CIV_REGIONS_LIST,
  CIV_REGIONS_FILTER,
  getAllDistricts,
  getRegionsByDistrict,
  getDepartementsByRegion,
  getSousPrefecturesByDepartement,
  searchLocations,
} from '../../data/civ-geography';

// ── Composant Select filtrable reutilisable ─────────────────────────────────
function FilterableSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Choisir...',
  disabled = false,
  required = false,
  className = '',
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  // Debounce de la recherche (150ms)
  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(val), 150);
  }, []);

  useEffect(() => {
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, []);

  // Fermer au clic exterieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return options;
    const q = debouncedSearch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return options.filter(o =>
      o.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
    );
  }, [options, debouncedSearch]);

  const inputCls = 'w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm';

  return (
    <div ref={ref} className={`relative ${className}`}>
      <label className="block text-sm font-bold text-gray-700 mb-1">
        {label} {required && '*'}
      </label>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`${inputCls} flex items-center justify-between gap-2 text-left ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer bg-white'
        }`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-2xl border-2 border-gray-200 shadow-xl overflow-hidden"
            style={{ maxHeight: 280 }}
          >
            {/* Barre de recherche */}
            {options.length > 5 && (
              <div className="p-2 border-b border-gray-100">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
                  <Search className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder="Rechercher..."
                    className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-400"
                    autoFocus
                  />
                  {search && (
                    <button onClick={() => { setSearch(''); setDebouncedSearch(''); }} className="text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-y-auto" style={{ maxHeight: options.length > 5 ? 220 : 280 }}>
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400 text-center">Aucun resultat</p>
              ) : (
                filtered.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => { onChange(opt); setOpen(false); setSearch(''); }}
                    className={`w-full px-4 py-2.5 text-sm text-left transition-colors flex items-center gap-2 ${
                      opt === value
                        ? 'font-bold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    style={opt === value ? { backgroundColor: `${BO_PRIMARY}12`, color: BO_PRIMARY } : {}}
                  >
                    {opt === value && <MapPin className="w-3 h-3 flex-shrink-0" />}
                    {opt}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Picker cascaded Region > Departement > Sous-prefecture ──────────────────
export function CIVLocationPicker({
  region,
  departement,
  sousPrefecture,
  onRegionChange,
  onDepartementChange,
  onSousPrefectureChange,
  showDistrict = false,
  includeNational = false,
  regionRequired = false,
  compact = false,
  className = '',
}: {
  region: string;
  departement?: string;
  sousPrefecture?: string;
  onRegionChange: (v: string) => void;
  onDepartementChange?: (v: string) => void;
  onSousPrefectureChange?: (v: string) => void;
  showDistrict?: boolean;
  includeNational?: boolean;
  regionRequired?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const [district, setDistrict] = useState('');

  const regionOptions = useMemo(() => {
    if (showDistrict && district) {
      const regs = getRegionsByDistrict(district);
      return includeNational ? ['National', ...regs] : regs;
    }
    return includeNational ? CIV_REGIONS_LIST : CIV_REGIONS_FILTER;
  }, [district, showDistrict, includeNational]);

  const departementOptions = useMemo(() => {
    if (!region || region === 'National') return [];
    return getDepartementsByRegion(region);
  }, [region]);

  const spOptions = useMemo(() => {
    if (!region || !departement || region === 'National') return [];
    return getSousPrefecturesByDepartement(region, departement);
  }, [region, departement]);

  const handleRegionChange = (v: string) => {
    onRegionChange(v);
    onDepartementChange?.('');
    onSousPrefectureChange?.('');
  };

  const handleDepartementChange = (v: string) => {
    onDepartementChange?.(v);
    onSousPrefectureChange?.('');
  };

  const gridCls = compact
    ? 'grid grid-cols-1 gap-3'
    : `grid gap-3 ${onDepartementChange ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`;

  return (
    <div className={`${gridCls} ${className}`}>
      {showDistrict && (
        <FilterableSelect
          label="District"
          value={district}
          options={getAllDistricts()}
          onChange={v => { setDistrict(v); handleRegionChange(''); }}
          placeholder="Choisir un district..."
        />
      )}

      <FilterableSelect
        label="Region"
        value={region}
        options={regionOptions}
        onChange={handleRegionChange}
        placeholder={includeNational ? 'Nationale (toutes)' : 'Choisir une region...'}
        required={regionRequired}
      />

      {onDepartementChange && (
        <FilterableSelect
          label="Departement"
          value={departement || ''}
          options={departementOptions}
          onChange={handleDepartementChange}
          placeholder="Choisir un departement..."
          disabled={!region || region === 'National' || departementOptions.length === 0}
        />
      )}

      {onSousPrefectureChange && (
        <FilterableSelect
          label="Sous-prefecture"
          value={sousPrefecture || ''}
          options={spOptions}
          onChange={v => onSousPrefectureChange?.(v)}
          placeholder="Choisir une sous-prefecture..."
          disabled={!departement || spOptions.length === 0}
        />
      )}
    </div>
  );
}

// ── Composant telephone avec prefixe CIV ────────────────────────────────────
export function CIVPhoneInput({
  value,
  onChange,
  label = 'Téléphone',
  required = false,
  disabled = false,
  placeholder = '07 XX XX XX XX',
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-bold text-gray-700 mb-1">
        {label} {required && '*'}
      </label>
      <div className="flex items-center border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-[#9F8170] transition-all bg-white">
        <div className="flex items-center gap-1.5 px-3 py-3 border-r-2 border-gray-200 bg-gray-50 flex-shrink-0">
          <span className="text-xs font-bold text-gray-500">CI</span>
          <span className="text-sm font-mono text-gray-600">+225</span>
        </div>
        <input
          type="tel"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="flex-1 bg-transparent px-3 py-3 text-sm focus:outline-none placeholder:text-gray-400"
        />
      </div>
    </div>
  );
}

// ── Export le FilterableSelect standalone ────────────────────────────────────
export { FilterableSelect };