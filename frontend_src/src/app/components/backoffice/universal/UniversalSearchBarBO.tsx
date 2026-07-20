import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, Search, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BO_LIGHT, BO_MEDIUM, BO_PRIMARY, BO_TINT } from '../bo-theme';

export interface SearchSuggestion {
  id: string;
  label: string;
  sublabel?: string;
  icon?: LucideIcon;
  avatar?: { src?: string; fallback: string; color?: string };
  data?: unknown;
}

export interface UniversalSearchBarBOProps {
  suggestions?: SearchSuggestion[];
  fetchSuggestions?: (query: string, signal: AbortSignal) => Promise<SearchSuggestion[]>;
  minChars?: number;
  debounceMs?: number;
  maxSuggestions?: number;
  onSelect?: (suggestion: SearchSuggestion) => void;
  onSubmit?: (query: string) => void;
  onChange?: (query: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  variant?: 'default' | 'rounded';
  fullWidth?: boolean;
  autoFocus?: boolean;
}

const CONTRAST_SURFACE = 'var(--color-white)';
const CONTRAST_TEXT = 'var(--color-white)';
const TRANSPARENT_BACKGROUND = 'transparent';
const SUBTLE_BORDER = `color-mix(in srgb, ${BO_LIGHT} 72%, ${CONTRAST_SURFACE})`;
const MUTED_TEXT = `color-mix(in srgb, ${BO_MEDIUM} 72%, ${CONTRAST_SURFACE})`;
const SOFT_SHADOW = `0 10px 38px -10px color-mix(in srgb, ${BO_PRIMARY} 35%, transparent)`;
const FOCUS_SHADOW = `0 8px 24px color-mix(in srgb, ${BO_PRIMARY} 16%, transparent)`;

function isAbortError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'name' in error
    && (error as { name?: string }).name === 'AbortError';
}

function AnimatedSearchIcon({ isLoading }: { isLoading: boolean }) {
  return (
    <motion.span
      animate={isLoading ? { rotate: 360 } : { scale: [1, 1.08, 1] }}
      transition={isLoading
        ? { duration: 1, repeat: Infinity, ease: 'linear' }
        : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
      style={{ display: 'inline-flex', flexShrink: 0 }}
    >
      {isLoading ? <Loader2 size={16} style={{ color: BO_MEDIUM }} /> : <Search size={16} style={{ color: BO_MEDIUM }} />}
    </motion.span>
  );
}

function AnimatedDismissIcon() {
  return (
    <motion.span
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
      style={{ display: 'inline-flex' }}
    >
      <X size={12} style={{ color: BO_MEDIUM }} />
    </motion.span>
  );
}

function SuggestionSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }} aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <motion.div
          key={index}
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 10,
            background: BO_TINT,
          }}
        >
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: SUBTLE_BORDER, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ width: '58%', height: 10, borderRadius: 999, background: SUBTLE_BORDER }} />
            <div style={{ width: '38%', height: 8, borderRadius: 999, background: SUBTLE_BORDER }} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function UniversalSearchBarBO({
  suggestions = [],
  fetchSuggestions,
  minChars = 2,
  debounceMs = 200,
  maxSuggestions = 8,
  onSelect,
  onSubmit,
  onChange,
  placeholder = 'Rechercher...',
  emptyMessage = 'Aucun resultat',
  variant = 'rounded',
  fullWidth = true,
  autoFocus = false,
}: UniversalSearchBarBOProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputId = useId();
  const listboxId = useId();
  const borderRadius = variant === 'rounded' ? 999 : 12;

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const suggestionsRef = useRef(suggestions);
  suggestionsRef.current = suggestions;

  useEffect(() => {
    if (query.length < minChars) {
      abortRef.current?.abort();
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const searchTimer = window.setTimeout(async () => {
      setIsLoading(true);
      setIsOpen(true);

      try {
        if (fetchSuggestions) {
          abortRef.current?.abort();
          const controller = new AbortController();
          abortRef.current = controller;
          const response = await fetchSuggestions(query, controller.signal);

          if (isActive && !controller.signal.aborted) {
            setResults(response.slice(0, maxSuggestions));
          }
        } else {
          const normalizedQuery = query.toLowerCase();
          const currentSuggestions = suggestionsRef.current;
          const filteredSuggestions = currentSuggestions
            .filter((suggestion) => suggestion.label.toLowerCase().includes(normalizedQuery)
              || suggestion.sublabel?.toLowerCase().includes(normalizedQuery))
            .slice(0, maxSuggestions);

          if (isActive) {
            setResults(filteredSuggestions);
          }
        }
      } catch (error) {
        if (isActive && !isAbortError(error)) {
          setResults([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      isActive = false;
      window.clearTimeout(searchTimer);
      abortRef.current?.abort();
    };
  }, [debounceMs, fetchSuggestions, maxSuggestions, minChars, query]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    onChange?.(nextQuery);
  }, [onChange]);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onChange?.('');
    inputRef.current?.focus();
  }, [onChange]);

  const handleSelect = useCallback((suggestion: SearchSuggestion) => {
    setIsOpen(false);
    setQuery(suggestion.label);
    onChange?.(suggestion.label);
    onSelect?.(suggestion);
  }, [onChange, onSelect]);

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    onSubmit?.(query);
  }, [onSubmit, query]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: CONTRAST_SURFACE,
            border: `1px solid ${isFocused ? BO_PRIMARY : SUBTLE_BORDER}`,
            borderRadius,
            boxShadow: isFocused ? FOCUS_SHADOW : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <motion.button
            type="submit"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            aria-label="Lancer la recherche"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: TRANSPARENT_BACKGROUND,
              padding: 0,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <AnimatedSearchIcon isLoading={isLoading} />
          </motion.button>

          <input
            id={inputId}
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            onFocus={() => {
              setIsFocused(true);
              if (query.length >= minChars) setIsOpen(true);
            }}
            onBlur={() => setIsFocused(false)}
            aria-label={placeholder}
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            role="combobox"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: TRANSPARENT_BACKGROUND,
              fontSize: 14,
              color: BO_PRIMARY,
              minWidth: 0,
            }}
          />

          {query.length > 0 && (
            <motion.button
              type="button"
              onClick={handleClear}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Effacer la recherche"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 22,
                height: 22,
                borderRadius: '50%',
                border: 'none',
                background: BO_TINT,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <AnimatedDismissIcon />
            </motion.button>
          )}
        </div>
      </form>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={listboxId}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            role="listbox"
            aria-labelledby={inputId}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              background: CONTRAST_SURFACE,
              borderRadius: 16,
              border: `1px solid ${SUBTLE_BORDER}`,
              boxShadow: SOFT_SHADOW,
              padding: 6,
              maxHeight: 360,
              overflowY: 'auto',
              zIndex: 100,
            }}
          >
            {isLoading && results.length === 0 ? (
              <SuggestionSkeleton />
            ) : results.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: MUTED_TEXT, fontSize: 13 }}>
                {emptyMessage}
              </div>
            ) : (
              results.map((suggestion) => {
                const Icon = suggestion.icon;
                const avatar = suggestion.avatar;

                return (
                  <motion.button
                    key={suggestion.id}
                    type="button"
                    onClick={() => handleSelect(suggestion)}
                    whileHover={{ scale: 1.01, backgroundColor: BO_TINT }}
                    whileTap={{ scale: 0.98 }}
                    role="option"
                    aria-selected={false}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: 'none',
                      background: TRANSPARENT_BACKGROUND,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      textAlign: 'left',
                      transition: 'background 0.1s ease',
                    }}
                  >
                    {avatar && (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: avatar.src
                            ? undefined
                            : `linear-gradient(135deg, ${avatar.color || BO_PRIMARY} 0%, color-mix(in srgb, ${avatar.color || BO_PRIMARY} 80%, ${CONTRAST_SURFACE}) 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: CONTRAST_TEXT,
                          fontWeight: 900,
                          fontSize: 11,
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}
                      >
                        {avatar.src ? (
                          <img src={avatar.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : avatar.fallback.substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    {Icon && !avatar && (
                      <motion.span
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        aria-hidden="true"
                        style={{ display: 'inline-flex', flexShrink: 0 }}
                      >
                        <Icon size={16} style={{ color: BO_MEDIUM }} />
                      </motion.span>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: BO_PRIMARY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {suggestion.label}
                      </div>
                      {suggestion.sublabel && (
                        <div style={{ fontSize: 11, color: BO_MEDIUM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {suggestion.sublabel}
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UniversalSearchBarBO;
