import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Filter, RotateCcw } from 'lucide-react';
import { BO_LIGHT, BO_PRIMARY } from '../bo-theme';

const CONTRAST_SURFACE = '#ffffff';
const SUBTLE_BORDER = `color-mix(in srgb, ${BO_LIGHT} 72%, ${CONTRAST_SURFACE})`;

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterGroup {
  id: string;
  label: string;
  options?: FilterOption[];
  multi?: boolean;
  type?: 'options' | 'date';
}

export type FilterValue = Record<string, string | string[] | undefined>;

export interface UniversalFiltreBOProps {
  groups: FilterGroup[];
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  onReset?: () => void;
  triggerLabel?: string;
}

export function UniversalFiltreBO({
  groups,
  value,
  onChange,
  onReset,
  triggerLabel = 'Filtres',
}: UniversalFiltreBOProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const activeCount = useMemo(() => {
    return groups.reduce((count, group) => {
      const current = value[group.id];
      if (current === undefined || current === null) return count;
      if (Array.isArray(current)) return count + (current.length > 0 ? 1 : 0);
      if (typeof current === 'string') return count + (current !== '' && current !== 'all' ? 1 : 0);
      return count;
    }, 0);
  }, [groups, value]);

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

  const handleSelectChange = (groupId: string, newValue: string) => {
    onChange({ ...value, [groupId]: newValue });
    setIsOpen(false);
  };

  const handleDateChange = (groupId: string, newValue: string) => {
    onChange({ ...value, [groupId]: newValue || undefined });
    setIsOpen(false);
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
      return;
    }
    const reset: FilterValue = {};
    groups.forEach((group) => {
      reset[group.id] = undefined;
    });
    onChange(reset);
  };

  return (
    <div ref={wrapperRef} style={{ display: 'inline-flex', position: 'relative', zIndex: isOpen ? 90 : undefined }}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          height: 44,
          padding: '0 16px',
          borderRadius: 16,
          border: `1px solid ${activeCount > 0 ? BO_PRIMARY : SUBTLE_BORDER}`,
          background: '#fff',
          color: activeCount > 0 ? BO_PRIMARY : '#374151',
          fontWeight: 500,
          fontSize: 13,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'border-color 0.15s ease, color 0.15s ease',
        }}
      >
        <Filter size={16} />
        <span>
          {triggerLabel}
          {activeCount > 0 ? ` (${activeCount})` : ''}
        </span>
        <ChevronDown
          size={14}
          style={{
            transition: 'transform 0.15s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Filtres"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 'min(560px, 90vw)',
            background: '#fff',
            border: `1px solid ${SUBTLE_BORDER}`,
            borderRadius: 16,
            padding: 20,
            boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.15)',
            zIndex: 90,
            animation: 'universalFiltreBOFadeIn 0.15s ease-out',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            {groups.map((group) => {
              if (group.type === 'date') {
                const currentDateValue = (value[group.id] as string) || '';
                return (
                  <div key={group.id}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        marginBottom: 8,
                      }}
                    >
                      {group.label}
                    </label>
                    <input
                      type="date"
                      value={currentDateValue}
                      onChange={(event) => handleDateChange(group.id, event.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: `1px solid ${SUBTLE_BORDER}`,
                        background: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#374151',
                        cursor: 'pointer',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                );
              }

              const currentValue = (value[group.id] as string) || 'all';
              return (
                <div key={group.id}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginBottom: 8,
                    }}
                  >
                    {group.label}
                  </label>
                  <select
                    value={currentValue}
                    onChange={(event) => handleSelectChange(group.id, event.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: `1px solid ${SUBTLE_BORDER}`,
                      background: '#fff',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#374151',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {group.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                        {option.count !== undefined ? ` (${option.count})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid #F3F4F6',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={handleReset}
              disabled={activeCount === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 12,
                border: `1px solid ${SUBTLE_BORDER}`,
                background: '#fff',
                color: activeCount === 0 ? '#D1D5DB' : '#6B7280',
                fontWeight: 700,
                fontSize: 12,
                cursor: activeCount === 0 ? 'not-allowed' : 'pointer',
                opacity: activeCount === 0 ? 0.5 : 1,
                transition: 'color 0.15s ease, opacity 0.15s ease',
              }}
            >
              <RotateCcw size={12} />
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes universalFiltreBOFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default UniversalFiltreBO;
