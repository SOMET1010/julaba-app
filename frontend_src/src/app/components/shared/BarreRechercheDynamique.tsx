import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X } from 'lucide-react';

export interface ActeurRecherche {
  id: string;
  nom: string;
  prenoms?: string;
  telephone?: string;
  role?: string;
  photo?: string | null;
  zoneId?: string;
  zoneNom?: string;
  statut?: 'approved' | 'soumis' | 'rejected' | 'brouillon';
  numero?: string;
  activite?: string;
  marche?: string;
  horsZone?: boolean;
}

export interface ZoneCheckResult {
  dansMaZone: boolean;
  message: string;
}

interface BarreRechercheDynamiqueProps {
  primaryColor?: string;
  placeholder?: string;
  onSearch: (query: string) => Promise<ActeurRecherche[]> | ActeurRecherche[];
  onSelect: (acteur: ActeurRecherche) => void;
  onZoneCheck?: (acteur: ActeurRecherche) => ZoneCheckResult;
  onNonEnrole?: (query: string) => void;
  showCompteur?: boolean;
  className?: string;
  defaultValue?: string;
}

type RoleBadgeConfig = {
  label: string;
  bg: string;
  color: string;
  avatarBg: string;
  avatarColor: string;
};

const ROLE_CONFIG: Record<string, RoleBadgeConfig> = {
  marchand: {
    label: 'Marchand',
    bg: '#FFF2E9',
    color: '#C66A2C',
    avatarBg: '#FFF2E9',
    avatarColor: '#C66A2C',
  },
  producteur: {
    label: 'Producteur',
    bg: '#F0FAF4',
    color: '#2E8B57',
    avatarBg: '#F0FAF4',
    avatarColor: '#2E8B57',
  },
  cooperative: {
    label: 'Coopérative',
    bg: '#EFF6FF',
    color: '#2072AF',
    avatarBg: '#EFF6FF',
    avatarColor: '#2072AF',
  },
  cooperateur: {
    label: 'Coopérateur',
    bg: '#EFF6FF',
    color: '#2072AF',
    avatarBg: '#EFF6FF',
    avatarColor: '#2072AF',
  },
  identificateur: {
    label: 'Identificateur',
    bg: '#F9F4F0',
    color: '#9F8170',
    avatarBg: '#F9F4F0',
    avatarColor: '#9F8170',
  },
  institution: {
    label: 'Institution',
    bg: '#F5F0FF',
    color: '#712864',
    avatarBg: '#F5F0FF',
    avatarColor: '#712864',
  },
  administrateur: {
    label: 'Administrateur',
    bg: '#F5F0FF',
    color: '#712864',
    avatarBg: '#F5F0FF',
    avatarColor: '#712864',
  },
};

const FALLBACK_ROLE: RoleBadgeConfig = {
  label: 'Acteur',
  bg: '#F5F0FF',
  color: '#712864',
  avatarBg: '#F9F4F0',
  avatarColor: '#9F8170',
};

function BadgeRole({ role }: { role?: string }) {
  const roleKey = (role || '').toLowerCase();
  const config = ROLE_CONFIG[roleKey] || FALLBACK_ROLE;
  return (
    <span
      style={{
        background: config.bg,
        color: config.color,
        fontSize: 10,
        fontWeight: 800,
        padding: '3px 8px',
        borderRadius: 20,
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  );
}

function BadgeStatut({ statut }: { statut?: string }) {
  if (!statut) return null;
  const config = {
    approved: { bg: '#F0FAF4', color: '#16a34a', border: '#86efac', label: 'Validé' },
    soumis: { bg: '#FFF7ED', color: '#ea580c', border: '#fdba74', label: 'En cours' },
    rejected: { bg: '#FEF2F2', color: '#dc2626', border: '#fca5a5', label: 'Rejeté' },
    brouillon: { bg: '#F9FAFB', color: '#6b7280', border: '#d1d5db', label: 'Brouillon' },
  }[statut] ?? { bg: '#F9FAFB', color: '#6b7280', border: '#d1d5db', label: statut };
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 800,
        padding: '3px 8px',
        borderRadius: 20,
        border: `2px solid ${config.border}`,
        backgroundColor: config.bg,
        color: config.color,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  );
}

const formatTelephone = (value?: string) => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (!digits) return value;
  const groups = digits.match(/.{1,2}/g);
  return groups ? groups.join(' ') : digits;
};

const getNomComplet = (acteur: ActeurRecherche) => {
  const nom = acteur.nom?.trim() || '';
  const prenoms = acteur.prenoms?.trim() || '';
  return `${nom} ${prenoms}`.trim() || nom || prenoms || 'Acteur';
};

const getInitiales = (acteur: ActeurRecherche) => {
  const full = getNomComplet(acteur);
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

function surligner(texte: string, query: string, color: string): React.ReactNode {
  if (!query || query.length < 2) return <span>{texte}</span>;
  const idx = texte.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return <span>{texte}</span>;
  return (
    <>
      <span style={{ color: '#6b7280' }}>{texte.slice(0, idx)}</span>
      <span style={{ fontWeight: 900, color, background: `${color}22`, borderRadius: 3, padding: '0 2px' }}>
        {texte.slice(idx, idx + query.length)}
      </span>
      <span style={{ color: '#6b7280' }}>{texte.slice(idx + query.length)}</span>
    </>
  );
}

export function BarreRechercheDynamique({
  primaryColor = '#C66A2C',
  placeholder = 'Nom, téléphone ou rôle...',
  onSearch,
  onSelect,
  onZoneCheck,
  onNonEnrole,
  showCompteur = false,
  className,
  defaultValue = '',
}: BarreRechercheDynamiqueProps) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<ActeurRecherche[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearDebounce = () => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  const clearPreviousSearch = () => {
    clearDebounce();
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [closeDropdown]);

  useEffect(() => {
    return () => {
      clearPreviousSearch();
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      clearPreviousSearch();
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    clearDebounce();
    debounceRef.current = window.setTimeout(async () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);

      try {
        const searched = await Promise.resolve(onSearch(trimmed));
        if (!controller.signal.aborted) {
          setResults(Array.isArray(searched) ? searched : []);
          setIsOpen(true);
        }
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setIsOpen(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      clearDebounce();
    };
  }, [query, onSearch]);

  const handleClear = () => {
    clearPreviousSearch();
    setQuery('');
    setResults([]);
    setIsLoading(false);
    setIsOpen(false);
  };

  const handleSelect = (acteur: ActeurRecherche) => {
    setQuery(getNomComplet(acteur));
    setIsOpen(false);
    onSelect(acteur);
  };

  return (
    <div className={className} ref={wrapperRef} style={{ position: 'relative' }}>
      <style>
        {`
          @keyframes julaba-ripple {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(1.65); opacity: 0; }
          }
          @keyframes julaba-fadein {
            0% { opacity: 0; transform: translateY(-6px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes julaba-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      <div
        style={{
          position: 'relative',
          height: 54,
          borderRadius: 20,
          border: `2px solid ${isFocused ? primaryColor : '#EDE7DE'}`,
          background: '#FFFFFF',
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          transition: 'border-color 0.2s ease',
          overflow: 'hidden',
        }}
      >
        {!isFocused && query.trim() === '' && (
          <motion.div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(105deg, transparent 0%, ${primaryColor}14 48%, transparent 100%)`,
              pointerEvents: 'none',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
          />
        )}

        <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
          <span
            style={{
              position: 'absolute',
              inset: -4,
              borderRadius: 16,
              border: `1.5px solid ${primaryColor}`,
              opacity: 0.35,
              animation: 'julaba-ripple 2.4s ease-out infinite',
            }}
          />
          <span
            style={{
              position: 'absolute',
              inset: -4,
              borderRadius: 16,
              border: `1.5px solid ${primaryColor}`,
              opacity: 0.2,
              animation: 'julaba-ripple 2.4s ease-out infinite',
              animationDelay: '1.2s',
            }}
          />
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: primaryColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Search size={16} color="#FFFFFF" strokeWidth={2.2} />
          </div>
        </div>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            setIsFocused(true);
            if (results.length > 0 || query.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 15,
            color: '#333333',
          }}
        />

        {showCompteur && query.trim().length >= 2 && (
          <span
            style={{
              minWidth: 22,
              height: 22,
              borderRadius: 20,
              padding: '0 8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: results.length > 0 ? primaryColor : '#9ca3af',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 11,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            {results.length}
          </span>
        )}

        {isLoading && (
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: '2px solid #EDE7DE',
              borderTopColor: primaryColor,
              animation: 'julaba-spin 0.8s linear infinite',
              flexShrink: 0,
            }}
          />
        )}

        {!isLoading && query.trim() !== '' && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Effacer la recherche"
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#F5EDE8',
              color: '#9F8170',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={10} strokeWidth={2.8} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              marginTop: 8,
              background: '#FFFFFF',
              borderRadius: 18,
              border: '1.5px solid #EDE7DE',
              overflow: 'hidden',
              animation: 'julaba-fadein 0.2s ease',
              boxShadow: '0 8px 24px rgba(56, 38, 22, 0.08)',
              position: 'absolute',
              left: 0,
              right: 0,
              zIndex: 100,
            }}
          >
            {results.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  textAlign: 'center',
                  color: '#C4A99A',
                  fontSize: 13,
                }}
              >
                <motion.div
                  style={{ display: 'inline-flex', marginBottom: 6 }}
                  animate={{ rotate: [0, 12, -10, 0], scale: [1, 1.08, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Search size={16} />
                </motion.div>
                <div style={{ fontWeight: 700 }}>
                  {query.trim().replace(/\D/g, '').length >= 6
                    ? `Numéro "${query.trim()}" non enrôlé`
                    : `Aucun acteur trouvé pour "${query.trim()}"`}
                </div>
                <div style={{ marginTop: 4 }}>Crée un nouveau dossier pour cet acteur</div>
                {onNonEnrole && (
                  <button
                    type="button"
                    onClick={() => onNonEnrole(query.trim())}
                    style={{
                      marginTop: 10,
                      border: 'none',
                      borderRadius: 12,
                      padding: '8px 12px',
                      background: primaryColor,
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Nouveau dossier
                  </button>
                )}
              </div>
            ) : (
              results.map((acteur, index) => {
                const roleKey = (acteur.role || '').toLowerCase();
                const role = ROLE_CONFIG[roleKey] || FALLBACK_ROLE;
                // onZoneCheck retire du rendu - source unique : acteur.horsZone
                const nom = acteur.nom || '';
                const prenoms = acteur.prenoms || '';
                const numeroAffiche = acteur.numero || acteur.telephone || '';

                return (
                  <button
                    key={acteur.id || `${getNomComplet(acteur)}-${index}`}
                    type="button"
                    onClick={() => handleSelect(acteur)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '11px 14px',
                      border: 'none',
                      borderBottom: index < results.length - 1 ? '1px solid #F5EDE8' : 'none',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = '#FFF8F4';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = '#FFFFFF';
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        overflow: 'hidden',
                        background: role.avatarBg,
                        color: role.avatarColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {acteur.photo ? (
                        <img
                          src={acteur.photo}
                          alt={getNomComplet(acteur)}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        getInitiales(acteur)
                      )}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#1a1a1a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {surligner(nom, query.trim(), role.color)}
                        {prenoms ? (
                          <>
                            {' '}
                            {surligner(prenoms, query.trim(), role.color)}
                          </>
                        ) : null}
                      </div>
                      <div style={{ fontSize: 12, color: '#888888' }}>
                        {numeroAffiche ? surligner(formatTelephone(numeroAffiche), query.trim(), role.color) : '-'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <BadgeRole role={acteur.role} />
                      <div style={{ marginTop: 3 }}>
                        <BadgeStatut statut={acteur.statut} />
                      </div>

                      {acteur.horsZone && (
                        <span
                          style={{
                            marginTop: 3,
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#d97706',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ⚠ Hors zone
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BarreRechercheDynamique;
