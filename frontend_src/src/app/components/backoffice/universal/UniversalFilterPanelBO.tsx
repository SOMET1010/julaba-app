import React, { useEffect, useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Filter, RotateCcw, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BO_LIGHT, BO_MEDIUM, BO_PRIMARY, BO_TINT } from '../bo-theme';

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
export type FilterPanelPresentation = 'collapsible' | 'dropdown' | 'sheet';

export interface UniversalFilterPanelBOProps {
  groups: FilterGroup[];
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  onReset?: () => void;
  triggerLabel?: string;
  initiallyOpen?: boolean;
  applyMode?: 'auto' | 'manual';
  presentation?: FilterPanelPresentation;
  showActiveChips?: boolean;
}

const CONTRAST_SURFACE = 'var(--color-white)';
const CONTRAST_TEXT = 'var(--color-white)';
const TRANSPARENT_BACKGROUND = 'transparent';
const SUBTLE_BORDER = `color-mix(in srgb, ${BO_LIGHT} 72%, ${CONTRAST_SURFACE})`;
const SOFT_SHADOW = `0 10px 38px -10px color-mix(in srgb, ${BO_PRIMARY} 32%, transparent)`;
const SHEET_BACKDROP = 'color-mix(in srgb, var(--color-black) 50%, transparent)';

function AnimatedFilterPanelIcon({
  icon: Icon,
  size,
  color,
  rotate,
}: {
  icon: LucideIcon;
  size: number;
  color?: string;
  rotate?: number;
}) {
  return (
    <motion.span
      animate={rotate !== undefined ? { rotate } : { scale: [1, 1.1, 1] }}
      transition={{ duration: rotate !== undefined ? 0.2 : 2.5, repeat: rotate !== undefined ? 0 : Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
      style={{ display: 'inline-flex', alignItems: 'center' }}
    >
      <Icon size={size} style={{ color }} />
    </motion.span>
  );
}

function countFilterValue(filterValue: FilterValue) {
  return Object.values(filterValue).reduce((total, currentValue) => {
    if (Array.isArray(currentValue)) return total + currentValue.length;
    if (currentValue) return total + 1;
    return total;
  }, 0);
}

export function UniversalFilterPanelBO({
  groups,
  value,
  onChange,
  onReset,
  triggerLabel = 'Filtres',
  initiallyOpen = false,
  applyMode = 'auto',
  presentation = 'collapsible',
  showActiveChips = true,
}: UniversalFilterPanelBOProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [draft, setDraft] = useState<FilterValue>(value);
  const panelId = useId();
  const displayValue = applyMode === 'auto' ? value : draft;
  const activeCount = useMemo(() => countFilterValue(displayValue), [displayValue]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (presentation !== 'sheet' || !isOpen) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [presentation, isOpen]);

  const activeChips = useMemo(() => {
    const chips: Array<{ groupId: string; groupLabel: string; optionValue: string; optionLabel: string }> = [];

    groups.forEach((group) => {
      const selectedValue = displayValue[group.id];
      if (!selectedValue) return;

      const selectedValues = Array.isArray(selectedValue) ? selectedValue : [selectedValue];
      selectedValues.forEach((selectedOptionValue) => {
        const matchingOption = group.options?.find((option) => option.value === selectedOptionValue);
        if (matchingOption) {
          chips.push({
            groupId: group.id,
            groupLabel: group.label,
            optionValue: selectedOptionValue,
            optionLabel: matchingOption.label,
          });
        } else if (group.type === 'date') {
          chips.push({
            groupId: group.id,
            groupLabel: group.label,
            optionValue: selectedOptionValue,
            optionLabel: selectedOptionValue,
          });
        }
      });
    });

    return chips;
  }, [displayValue, groups]);

  const updateFilterValue = (groupId: string, optionValue: string, multi: boolean) => {
    const currentFilterValue = applyMode === 'auto' ? value : draft;
    const currentGroupValue = currentFilterValue[groupId];
    const nextValue: FilterValue = { ...currentFilterValue };

    if (multi) {
      const currentArray = Array.isArray(currentGroupValue)
        ? currentGroupValue
        : currentGroupValue
          ? [currentGroupValue]
          : [];

      if (currentArray.includes(optionValue)) {
        const filteredValues = currentArray.filter((selectedValue) => selectedValue !== optionValue);
        if (filteredValues.length > 0) nextValue[groupId] = filteredValues;
        else delete nextValue[groupId];
      } else {
        nextValue[groupId] = [...currentArray, optionValue];
      }
    } else if (currentGroupValue === optionValue) {
      delete nextValue[groupId];
    } else {
      nextValue[groupId] = optionValue;
    }

    if (applyMode === 'auto') onChange(nextValue);
    else setDraft(nextValue);
  };

  const updateDateFilterValue = (groupId: string, dateValue: string) => {
    const currentFilterValue = applyMode === 'auto' ? value : draft;
    const nextValue: FilterValue = { ...currentFilterValue };

    if (dateValue) nextValue[groupId] = dateValue;
    else delete nextValue[groupId];

    if (applyMode === 'auto') onChange(nextValue);
    else setDraft(nextValue);
  };

  const removeChip = (groupId: string, optionValue: string) => {
    const group = groups.find((filterGroup) => filterGroup.id === groupId);
    if (!group) return;
    updateFilterValue(groupId, optionValue, Boolean(group.multi));
  };

  const handleReset = () => {
    if (applyMode === 'auto') onChange({});
    else setDraft({});
    onReset?.();
  };

  const handleApply = () => {
    onChange(draft);
    setIsOpen(false);
  };

  const isActive = (groupId: string, optionValue: string, multi: boolean): boolean => {
    const selectedValue = displayValue[groupId];
    if (multi) return Array.isArray(selectedValue) && selectedValue.includes(optionValue);
    return selectedValue === optionValue;
  };

  const renderGroupsContent = () => groups.map((group) => {
    if (group.type === 'date') {
      const currentDateValue = (displayValue[group.id] as string) || '';

      return (
        <div key={group.id} role="group" aria-labelledby={`${panelId}-${group.id}-label`} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            id={`${panelId}-${group.id}-label`}
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              color: BO_PRIMARY,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
          >
            {group.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="date"
              value={currentDateValue}
              onChange={(event) => updateDateFilterValue(group.id, event.target.value)}
              style={{
                padding: '8px 14px',
                border: `1px solid ${SUBTLE_BORDER}`,
                borderRadius: 10,
                fontSize: 13,
                color: BO_PRIMARY,
                background: CONTRAST_SURFACE,
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            {currentDateValue && (
              <motion.button
                type="button"
                onClick={() => updateDateFilterValue(group.id, '')}
                whileTap={{ scale: 0.9 }}
                aria-label="Effacer la date"
                style={{
                  padding: '6px 10px',
                  border: 'none',
                  background: TRANSPARENT_BACKGROUND,
                  color: BO_MEDIUM,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <AnimatedFilterPanelIcon icon={X} size={12} color={BO_MEDIUM} />
                Effacer
              </motion.button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={group.id} role="group" aria-labelledby={`${panelId}-${group.id}-label`}>
        <div
          id={`${panelId}-${group.id}-label`}
          style={{
            fontSize: 12,
            fontWeight: 900,
            color: BO_PRIMARY,
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {group.label}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(group.options ?? []).map((option) => {
            const active = isActive(group.id, option.value, Boolean(group.multi));

            return (
              <motion.button
                key={option.value}
                type="button"
                onClick={() => updateFilterValue(group.id, option.value, Boolean(group.multi))}
                whileHover={{ scale: 1.02, borderColor: BO_PRIMARY }}
                whileTap={{ scale: 0.97 }}
                aria-pressed={active}
                style={{
                  padding: '6px 12px',
                  border: `1px solid ${active ? BO_PRIMARY : SUBTLE_BORDER}`,
                  background: active ? BO_PRIMARY : CONTRAST_SURFACE,
                  color: active ? CONTRAST_TEXT : BO_PRIMARY,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {option.label}
                {option.count !== undefined && (
                  <span style={{ opacity: 0.65, fontWeight: 400 }}>({option.count})</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  });

  const panelContent = (
    <motion.div
      id={panelId}
      initial={{ opacity: 0, height: 0, marginTop: 0 }}
      animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        overflow: 'hidden',
        position: presentation === 'dropdown' ? 'absolute' : 'relative',
        top: presentation === 'dropdown' ? 'calc(100% + 6px)' : undefined,
        left: presentation === 'dropdown' ? 0 : undefined,
        right: presentation === 'dropdown' ? 0 : undefined,
        zIndex: presentation === 'dropdown' ? 90 : undefined,
      }}
    >
      <div
        style={{
          background: CONTRAST_SURFACE,
          border: `2px solid ${SUBTLE_BORDER}`,
          borderRadius: 16,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: presentation === 'dropdown' ? SOFT_SHADOW : 'none',
        }}
      >
        <div
          style={presentation === 'dropdown' ? {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          } : undefined}
        >
          {renderGroupsContent()}
        </div>

        {applyMode === 'manual' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <motion.button
              type="button"
              onClick={handleReset}
              whileHover={{ scale: 1.02, borderColor: BO_PRIMARY }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '8px 14px',
                border: `1px solid ${SUBTLE_BORDER}`,
                background: CONTRAST_SURFACE,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                color: BO_PRIMARY,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <AnimatedFilterPanelIcon icon={RotateCcw} size={12} color={BO_PRIMARY} />
              Tout réinitialiser
            </motion.button>
            <motion.button
              type="button"
              onClick={handleApply}
              whileHover={{ scale: 1.02, backgroundColor: BO_MEDIUM }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '8px 14px',
                border: 'none',
                background: BO_PRIMARY,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                color: CONTRAST_TEXT,
                cursor: 'pointer',
              }}
            >
              Appliquer
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );

  if (presentation === 'sheet') {
    return (
      <div style={{ width: '100%', position: 'relative' }}>
        <motion.button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          whileHover={{ scale: 1.01, borderColor: BO_PRIMARY }}
          whileTap={{ scale: 0.98 }}
          aria-expanded={isOpen}
          aria-controls={`${panelId}-sheet`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            background: CONTRAST_SURFACE,
            border: `2px solid ${activeCount > 0 ? BO_PRIMARY : SUBTLE_BORDER}`,
            borderRadius: 12,
            color: activeCount > 0 ? BO_PRIMARY : BO_MEDIUM,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <AnimatedFilterPanelIcon icon={Filter} size={15} color={activeCount > 0 ? BO_PRIMARY : BO_MEDIUM} />
          {triggerLabel}
          {activeCount > 0 && (
            <span
              style={{
                background: BO_PRIMARY,
                color: CONTRAST_TEXT,
                padding: '0 7px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 900,
              }}
            >
              {activeCount}
            </span>
          )}
        </motion.button>

        {showActiveChips && activeChips.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {activeChips.map((chip, chipIndex) => (
              <motion.span
                key={`${chip.groupId}-${chip.optionValue}-${chipIndex}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  background: BO_PRIMARY,
                  color: CONTRAST_TEXT,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <span style={{ opacity: 0.7, fontWeight: 400 }}>{chip.groupLabel}:</span>
                {chip.optionLabel}
                <motion.button
                  type="button"
                  onClick={() => removeChip(chip.groupId, chip.optionValue)}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.85 }}
                  aria-label={`Retirer ${chip.optionLabel}`}
                  style={{
                    border: 'none',
                    background: TRANSPARENT_BACKGROUND,
                    cursor: 'pointer',
                    padding: 0,
                    color: CONTRAST_TEXT,
                    display: 'inline-flex',
                  }}
                >
                  <AnimatedFilterPanelIcon icon={X} size={12} color={CONTRAST_TEXT} />
                </motion.button>
              </motion.span>
            ))}
            <motion.button
              type="button"
              onClick={handleReset}
              whileHover={{ scale: 1.02, borderColor: BO_PRIMARY, color: BO_PRIMARY }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                border: `1px dashed ${BO_LIGHT}`,
                background: TRANSPARENT_BACKGROUND,
                borderRadius: 999,
                fontSize: 12,
                color: BO_MEDIUM,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <AnimatedFilterPanelIcon icon={RotateCcw} size={11} color="currentColor" />
              Tout réinitialiser
            </motion.button>
          </div>
        )}

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: SHEET_BACKDROP,
                  zIndex: 200,
                }}
              />
              <motion.div
                id={`${panelId}-sheet`}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                role="dialog"
                aria-modal="true"
                aria-label="Panneau de filtres"
                tabIndex={-1}
                style={{
                  position: 'fixed',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: 'min(50vw, 600px)',
                  minWidth: 400,
                  background: CONTRAST_SURFACE,
                  boxShadow: SOFT_SHADOW,
                  zIndex: 201,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 24px',
                    borderBottom: `1px solid ${SUBTLE_BORDER}`,
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: BO_PRIMARY }}>
                    Filtres {activeCount > 0 && <span style={{ fontWeight: 700, color: BO_MEDIUM }}>({activeCount})</span>}
                  </h2>
                  <motion.button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="Fermer le panneau"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: `1px solid ${SUBTLE_BORDER}`,
                      background: CONTRAST_SURFACE,
                      cursor: 'pointer',
                    }}
                  >
                    <AnimatedFilterPanelIcon icon={X} size={16} color={BO_PRIMARY} />
                  </motion.button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {renderGroupsContent()}
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    padding: '16px 24px',
                    borderTop: `1px solid ${SUBTLE_BORDER}`,
                    background: BO_TINT,
                  }}
                >
                  <motion.button
                    type="button"
                    onClick={handleReset}
                    whileHover={{ scale: 1.02, borderColor: BO_PRIMARY }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      padding: '8px 14px',
                      border: `1px solid ${SUBTLE_BORDER}`,
                      background: CONTRAST_SURFACE,
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      color: BO_PRIMARY,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <AnimatedFilterPanelIcon icon={RotateCcw} size={13} color={BO_PRIMARY} />
                    Tout réinitialiser
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    whileHover={{ scale: 1.02, backgroundColor: BO_MEDIUM }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      padding: '8px 14px',
                      border: 'none',
                      background: BO_PRIMARY,
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      color: CONTRAST_TEXT,
                      cursor: 'pointer',
                    }}
                  >
                    Fermer
                  </motion.button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        position: 'relative',
        zIndex: presentation === 'dropdown' && isOpen ? 120 : undefined,
      }}
    >
      <motion.button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        whileHover={{ scale: 1.01, borderColor: BO_PRIMARY }}
        whileTap={{ scale: 0.98 }}
        aria-expanded={isOpen}
        aria-controls={panelId}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          background: CONTRAST_SURFACE,
          border: `2px solid ${activeCount > 0 ? BO_PRIMARY : SUBTLE_BORDER}`,
          borderRadius: 12,
          color: activeCount > 0 ? BO_PRIMARY : BO_MEDIUM,
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        <AnimatedFilterPanelIcon icon={Filter} size={15} color={activeCount > 0 ? BO_PRIMARY : BO_MEDIUM} />
        {triggerLabel}
        {activeCount > 0 && (
          <span
            style={{
              background: BO_PRIMARY,
              color: CONTRAST_TEXT,
              padding: '0 7px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 900,
            }}
          >
            {activeCount}
          </span>
        )}
        <AnimatedFilterPanelIcon icon={ChevronDown} size={14} color={activeCount > 0 ? BO_PRIMARY : BO_MEDIUM} rotate={isOpen ? 180 : 0} />
      </motion.button>

      {showActiveChips && activeChips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {activeChips.map((chip, chipIndex) => (
            <motion.span
              key={`${chip.groupId}-${chip.optionValue}-${chipIndex}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: BO_PRIMARY,
                color: CONTRAST_TEXT,
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <span style={{ opacity: 0.7, fontWeight: 400 }}>{chip.groupLabel}:</span>
              {chip.optionLabel}
              <motion.button
                type="button"
                onClick={() => removeChip(chip.groupId, chip.optionValue)}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.85 }}
                aria-label={`Retirer ${chip.optionLabel}`}
                style={{
                  border: 'none',
                  background: TRANSPARENT_BACKGROUND,
                  cursor: 'pointer',
                  padding: 0,
                  color: CONTRAST_TEXT,
                  display: 'inline-flex',
                }}
              >
                <AnimatedFilterPanelIcon icon={X} size={12} color={CONTRAST_TEXT} />
              </motion.button>
            </motion.span>
          ))}
          <motion.button
            type="button"
            onClick={handleReset}
            whileHover={{ scale: 1.02, borderColor: BO_PRIMARY, color: BO_PRIMARY }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              border: `1px dashed ${BO_LIGHT}`,
              background: TRANSPARENT_BACKGROUND,
              borderRadius: 999,
              fontSize: 12,
              color: BO_MEDIUM,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <AnimatedFilterPanelIcon icon={RotateCcw} size={11} color="currentColor" />
            Tout reinitialiser
          </motion.button>
        </div>
      )}

      <AnimatePresence>
        {isOpen && panelContent}
      </AnimatePresence>
    </div>
  );
}

export default UniversalFilterPanelBO;
