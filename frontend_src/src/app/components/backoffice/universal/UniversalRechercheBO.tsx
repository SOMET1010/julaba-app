import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent } from 'react';
import { Search, X } from 'lucide-react';
import { BO_LIGHT, BO_PRIMARY } from '../bo-theme';

const CONTRAST_SURFACE = '#ffffff';
const SUBTLE_BORDER = `color-mix(in srgb, ${BO_LIGHT} 72%, ${CONTRAST_SURFACE})`;

export interface SearchSuggestion {
  id: string;
  label: string;
  sublabel?: string;
  data?: unknown;
}

export interface UniversalRechercheBOProps {
  suggestions?: SearchSuggestion[];
  placeholder?: string;
  onChange?: (query: string) => void;
  onChangeDebounced?: (query: string) => void;
  onSelect?: (suggestion: SearchSuggestion) => void;
  onSubmit?: (query: string) => void;
  debounceMs?: number;
  emptyMessage?: string;
  autoFocus?: boolean;
}

export function UniversalRechercheBO({
  suggestions = [],
  placeholder = 'Rechercher...',
  onChange,
  onChangeDebounced,
  onSelect,
  onSubmit,
  debounceMs = 200,
  emptyMessage = 'Aucun résultat',
  autoFocus = false,
}: UniversalRechercheBOProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newQuery = event.target.value;
    setQuery(newQuery);
    onChange?.(newQuery);

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      onChangeDebounced?.(newQuery);
    }, debounceMs);

    if (suggestions.length > 0 && newQuery.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    setQuery('');
    onChange?.('');
    onChangeDebounced?.('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleSelect = (suggestion: SearchSuggestion) => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    setQuery(suggestion.label);
    onChange?.(suggestion.label);
    onChangeDebounced?.(suggestion.label);
    setIsOpen(false);
    onSelect?.(suggestion);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit?.(query);
  };

  const filteredSuggestions = suggestions.filter(
    (suggestion) => !query
      || suggestion.label.toLowerCase().includes(query.toLowerCase())
      || suggestion.sublabel?.toLowerCase().includes(query.toLowerCase()),
  );

  const wrapperStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    ['--subtle-border' as string]: SUBTLE_BORDER,
  };

  return (
    <div ref={wrapperRef} style={wrapperStyle}>
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            height: 44,
            padding: '0 8px 0 6px',
            background: '#fff',
            border: `1px solid ${isFocused ? BO_PRIMARY : SUBTLE_BORDER}`,
            borderRadius: 16,
            transition: 'border-color 0.15s ease',
          }}
        >
          <span className="universal-recherche-bo-loupe-frame">
            <span className="universal-recherche-bo-loupe-icon">
              <Search size={16} />
            </span>
          </span>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => {
              setIsFocused(true);
              if (suggestions.length > 0 && query.length > 0) setIsOpen(true);
            }}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            aria-label={placeholder}
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 13,
              fontWeight: 500,
              color: '#374151',
              padding: '0 4px',
            }}
          />

          {query.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Effacer la recherche"
              className="universal-recherche-bo-clear-btn"
            >
              <span className="universal-recherche-bo-clear-icon">
                <X size={14} />
              </span>
            </button>
          )}
        </div>
      </form>

      {isOpen && suggestions.length > 0 && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#fff',
            border: `1px solid ${SUBTLE_BORDER}`,
            borderRadius: 16,
            padding: 6,
            maxHeight: 320,
            overflowY: 'auto',
            zIndex: 90,
            boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.15)',
            animation: 'universalRechercheBOFadeIn 0.15s ease-out',
          }}
        >
          {filteredSuggestions.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
              {emptyMessage}
            </div>
          ) : (
            filteredSuggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => handleSelect(suggestion)}
                role="option"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = '#F5F2ED';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{suggestion.label}</span>
                {suggestion.sublabel && (
                  <span style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{suggestion.sublabel}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}

      <style>{`
        .universal-recherche-bo-loupe-frame {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: rgba(159, 129, 112, 0.22);
          border: 1px solid rgba(159, 129, 112, 0.45);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: #6B4423;
        }
        .universal-recherche-bo-loupe-icon {
          display: inline-flex;
          animation: universalRechercheBOPulseScale 2s ease-in-out infinite;
        }
        @keyframes universalRechercheBOPulseScale {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.18); opacity: 1; }
        }

        .universal-recherche-bo-clear-btn {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: #F3F4F6;
          color: #6B7280;
          border: 1px solid var(--subtle-border);
          cursor: pointer;
          padding: 0;
          transition: background 0.15s ease;
        }
        .universal-recherche-bo-clear-btn:hover {
          background: #E5E7EB;
        }
        .universal-recherche-bo-clear-icon {
          display: inline-flex;
          animation: universalRechercheBOSpin 4s linear infinite;
        }
        @keyframes universalRechercheBOSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes universalRechercheBOFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default UniversalRechercheBO;
