import React, { useEffect, useId, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BO_LIGHT, BO_MEDIUM, BO_PRIMARY, BO_TINT } from '../bo-theme';

export interface UniversalPaginationBOProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  showFirstLast?: boolean;
  showItemsPerPage?: boolean;
  showCounter?: boolean;
  showPageJump?: boolean;
  stickyBottom?: boolean;
  maxVisiblePages?: number;
}

const CONTRAST_SURFACE = 'var(--color-white)';
const CONTRAST_TEXT = 'var(--color-white)';
const SUBTLE_BORDER = `color-mix(in srgb, ${BO_LIGHT} 72%, ${CONTRAST_SURFACE})`;
const DISABLED_TEXT = `color-mix(in srgb, ${BO_LIGHT} 65%, ${CONTRAST_SURFACE})`;
const SOFT_SHADOW = `0 -8px 24px color-mix(in srgb, ${BO_PRIMARY} 12%, transparent)`;

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(1, page), totalPages);
}

function AnimatedPaginationIcon({
  icon: Icon,
  size,
  color,
  direction,
}: {
  icon: LucideIcon;
  size: number;
  color?: string;
  direction: 'left' | 'right';
}) {
  return (
    <motion.span
      animate={{ x: direction === 'left' ? [0, -2, 0] : [0, 2, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
      style={{ display: 'inline-flex', alignItems: 'center' }}
    >
      <Icon size={size} style={{ color }} />
    </motion.span>
  );
}

export function UniversalPaginationBO({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100],
  showFirstLast = true,
  showItemsPerPage = true,
  showCounter = true,
  showPageJump = true,
  stickyBottom = false,
  maxVisiblePages = 3,
}: UniversalPaginationBOProps) {
  const safeItemsPerPage = Math.max(1, itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(totalItems / safeItemsPerPage));
  const safePage = clampPage(currentPage, totalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * safeItemsPerPage + 1;
  const endItem = Math.min(safePage * safeItemsPerPage, totalItems);
  const pageJumpInputId = useId();
  const itemsPerPageSelectId = useId();
  const [pageJumpValue, setPageJumpValue] = useState(String(safePage));

  useEffect(() => {
    setPageJumpValue(String(safePage));
  }, [safePage]);

  const getVisiblePages = (): (number | 'ellipsis')[] => {
    if (totalPages <= maxVisiblePages + 2) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages: (number | 'ellipsis')[] = [];
    const halfVisiblePages = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(2, safePage - halfVisiblePages);
    let endPage = Math.min(totalPages - 1, safePage + halfVisiblePages);

    if (endPage - startPage + 1 < maxVisiblePages) {
      if (startPage === 2) {
        endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);
      } else if (endPage === totalPages - 1) {
        startPage = Math.max(2, endPage - maxVisiblePages + 1);
      }
    }

    pages.push(1);
    if (startPage > 2) pages.push('ellipsis');
    for (let page = startPage; page <= endPage; page += 1) pages.push(page);
    if (endPage < totalPages - 1) pages.push('ellipsis');
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const visiblePages = getVisiblePages();

  const buttonStyle = (active: boolean, disabled: boolean): React.CSSProperties => ({
    minWidth: 32,
    height: 32,
    padding: '0 10px',
    border: `1px solid ${active ? BO_PRIMARY : SUBTLE_BORDER}`,
    background: active ? BO_PRIMARY : CONTRAST_SURFACE,
    color: active ? CONTRAST_TEXT : disabled ? DISABLED_TEXT : BO_PRIMARY,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  const goToPage = (page: number) => {
    onPageChange(clampPage(page, totalPages));
  };

  const submitPageJump = () => {
    const requestedPage = Number(pageJumpValue);
    if (!Number.isFinite(requestedPage)) {
      setPageJumpValue(String(safePage));
      return;
    }

    goToPage(requestedPage);
  };

  const rootStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    background: stickyBottom ? CONTRAST_SURFACE : undefined,
    borderTop: stickyBottom ? `1px solid ${SUBTLE_BORDER}` : undefined,
    boxShadow: stickyBottom ? SOFT_SHADOW : undefined,
    padding: stickyBottom ? '10px 12px' : undefined,
    position: stickyBottom ? 'sticky' : undefined,
    bottom: stickyBottom ? 0 : undefined,
    zIndex: stickyBottom ? 80 : undefined,
  };

  return (
    <div style={rootStyle}>
      {showCounter && (
        <div style={{ fontSize: 12, color: BO_MEDIUM }}>
          {totalItems === 0 ? (
            '0 element'
          ) : (
            <>
              Affichage de <strong style={{ color: BO_PRIMARY }}>{startItem}</strong> a <strong style={{ color: BO_PRIMARY }}>{endItem}</strong> sur <strong style={{ color: BO_PRIMARY }}>{totalItems}</strong> elements
            </>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {showItemsPerPage && onItemsPerPageChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label htmlFor={itemsPerPageSelectId} style={{ fontSize: 12, color: BO_MEDIUM }}>Par page :</label>
            <select
              id={itemsPerPageSelectId}
              value={safeItemsPerPage}
              onChange={(event) => onItemsPerPageChange(Number(event.target.value))}
              style={{
                padding: '4px 8px',
                border: `1px solid ${SUBTLE_BORDER}`,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                color: BO_PRIMARY,
                background: CONTRAST_SURFACE,
                cursor: 'pointer',
              }}
            >
              {itemsPerPageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {showFirstLast && (
            <motion.button
              type="button"
              onClick={() => goToPage(1)}
              disabled={safePage === 1}
              whileHover={safePage === 1 ? { scale: 1 } : { scale: 1.05, backgroundColor: BO_TINT }}
              whileTap={safePage === 1 ? { scale: 1 } : { scale: 0.92 }}
              aria-label="Premiere page"
              style={buttonStyle(false, safePage === 1)}
            >
              <AnimatedPaginationIcon icon={ChevronsLeft} size={14} color={safePage === 1 ? DISABLED_TEXT : BO_PRIMARY} direction="left" />
            </motion.button>
          )}

          <motion.button
            type="button"
            onClick={() => goToPage(safePage - 1)}
            disabled={safePage === 1}
            whileHover={safePage === 1 ? { scale: 1 } : { scale: 1.05, backgroundColor: BO_TINT }}
            whileTap={safePage === 1 ? { scale: 1 } : { scale: 0.92 }}
            aria-label="Page precedente"
            style={buttonStyle(false, safePage === 1)}
          >
            <AnimatedPaginationIcon icon={ChevronLeft} size={14} color={safePage === 1 ? DISABLED_TEXT : BO_PRIMARY} direction="left" />
          </motion.button>

          {visiblePages.map((page, pageIndex) => (
            page === 'ellipsis' ? (
              <span key={`ellipsis-${pageIndex}`} style={{ padding: '0 6px', color: BO_MEDIUM, fontSize: 13 }}>...</span>
            ) : (
              <motion.button
                key={page}
                type="button"
                onClick={() => goToPage(page)}
                whileHover={page === safePage ? { scale: 1 } : { scale: 1.05, backgroundColor: BO_PRIMARY, color: CONTRAST_TEXT }}
                whileTap={{ scale: 0.92 }}
                aria-current={page === safePage ? 'page' : undefined}
                style={buttonStyle(page === safePage, false)}
              >
                {page}
              </motion.button>
            )
          ))}

          <motion.button
            type="button"
            onClick={() => goToPage(safePage + 1)}
            disabled={safePage === totalPages}
            whileHover={safePage === totalPages ? { scale: 1 } : { scale: 1.05, backgroundColor: BO_TINT }}
            whileTap={safePage === totalPages ? { scale: 1 } : { scale: 0.92 }}
            aria-label="Page suivante"
            style={buttonStyle(false, safePage === totalPages)}
          >
            <AnimatedPaginationIcon icon={ChevronRight} size={14} color={safePage === totalPages ? DISABLED_TEXT : BO_PRIMARY} direction="right" />
          </motion.button>

          {showFirstLast && (
            <motion.button
              type="button"
              onClick={() => goToPage(totalPages)}
              disabled={safePage === totalPages}
              whileHover={safePage === totalPages ? { scale: 1 } : { scale: 1.05, backgroundColor: BO_TINT }}
              whileTap={safePage === totalPages ? { scale: 1 } : { scale: 0.92 }}
              aria-label="Derniere page"
              style={buttonStyle(false, safePage === totalPages)}
            >
              <AnimatedPaginationIcon icon={ChevronsRight} size={14} color={safePage === totalPages ? DISABLED_TEXT : BO_PRIMARY} direction="right" />
            </motion.button>
          )}
        </div>

        {showPageJump && totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label htmlFor={pageJumpInputId} style={{ fontSize: 12, color: BO_MEDIUM }}>Page :</label>
            <input
              id={pageJumpInputId}
              type="number"
              min={1}
              max={totalPages}
              value={pageJumpValue}
              onChange={(event) => setPageJumpValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitPageJump();
              }}
              style={{
                width: 58,
                padding: '4px 8px',
                border: `1px solid ${SUBTLE_BORDER}`,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                color: BO_PRIMARY,
                background: CONTRAST_SURFACE,
              }}
            />
            <motion.button
              type="button"
              onClick={submitPageJump}
              whileHover={{ scale: 1.03, backgroundColor: BO_MEDIUM }}
              whileTap={{ scale: 0.95 }}
              style={{
                height: 28,
                padding: '0 10px',
                border: 'none',
                background: BO_PRIMARY,
                color: CONTRAST_TEXT,
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Aller
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}

export default UniversalPaginationBO;
