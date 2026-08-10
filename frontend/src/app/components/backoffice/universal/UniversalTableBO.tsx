import React from 'react';
import { motion } from 'motion/react';
import { Copy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableRow } from '../../ui/table';
import { TYPE_COLORS } from '../../../utils/role-config';
import { BO_LIGHT, BO_MEDIUM, BO_PRIMARY, BO_TINT } from '../bo-theme';

export interface TableRowKV {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  valueColor?: string;
  valueBold?: boolean;
  link?: { type: 'tel' | 'mailto' | 'external'; href: string };
  copyable?: boolean;
  empty?: boolean;
}

export interface UniversalTableBOProps {
  rows: TableRowKV[];
  size?: 'sm' | 'md';
  showDividers?: boolean;
  alignValuesRight?: boolean;
  ariaLabel?: string;
}

function AnimatedIcon({ icon: Icon, size, color }: { icon: LucideIcon; size: number; color: string }) {
  return (
    <motion.div
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
      style={{ display: 'inline-flex', flexShrink: 0 }}
    >
      <Icon size={size} style={{ color }} />
    </motion.div>
  );
}

function getCopyValue(value: React.ReactNode): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}

export function UniversalTableBO({
  rows,
  size = 'md',
  showDividers = true,
  alignValuesRight = true,
  ariaLabel,
}: UniversalTableBOProps) {
  const fontSize = size === 'sm' ? 13 : 14;
  const padding = size === 'sm' ? '6px 0' : '8px 0';
  const iconSize = size === 'sm' ? 13 : 15;

  const handleCopy = async (value: React.ReactNode) => {
    const copyValue = getCopyValue(value);
    if (!copyValue || !navigator.clipboard) return;
    await navigator.clipboard.writeText(copyValue);
  };

  return (
    <Table aria-label={ariaLabel} style={{ width: '100%', borderCollapse: 'collapse' }}>
      <TableBody>
        {rows.map((row, idx) => {
          const Icon = row.icon;
          const isLast = idx === rows.length - 1;
          const valueIsEmpty = row.empty || (typeof row.value === 'string' && !row.value.trim());
          const copyValue = getCopyValue(row.value);

          let valueElement: React.ReactNode = row.value;

          if (valueIsEmpty) {
            valueElement = (
              <span style={{ color: BO_MEDIUM, fontStyle: 'italic', fontWeight: 400 }}>
                Non renseigné
              </span>
            );
          } else if (row.link) {
            const prefix = row.link.type === 'tel' ? 'tel:' : row.link.type === 'mailto' ? 'mailto:' : '';
            const href = `${prefix}${row.link.href}`;
            valueElement = (
              <a
                href={href}
                target={row.link.type === 'external' ? '_blank' : undefined}
                rel={row.link.type === 'external' ? 'noopener noreferrer' : undefined}
                style={{
                  color: row.valueColor || TYPE_COLORS.admin_national,
                  fontWeight: row.valueBold !== false ? 700 : 400,
                  textDecoration: 'none',
                }}
                className="hover:underline"
              >
                {row.value}
              </a>
            );
          } else {
            valueElement = (
              <span
                style={{
                  color: row.valueColor || BO_PRIMARY,
                  fontWeight: row.valueBold !== false ? 700 : 400,
                }}
              >
                {row.value}
              </span>
            );
          }

          return (
            <TableRow
              key={`${row.label}-${idx}`}
              style={{
                borderBottom: showDividers && !isLast ? `1px solid ${BO_TINT}` : 'none',
                background: 'transparent',
              }}
            >
              <TableCell
                style={{
                  padding,
                  color: BO_MEDIUM,
                  fontSize,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  width: alignValuesRight ? '1%' : undefined,
                }}
              >
                {Icon && <AnimatedIcon icon={Icon} size={iconSize} color={BO_LIGHT} />}
                {row.label}
              </TableCell>
              <TableCell
                style={{
                  padding,
                  fontSize,
                  textAlign: alignValuesRight ? 'right' : 'left',
                  wordBreak: 'break-word',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: alignValuesRight ? 'flex-end' : 'flex-start', gap: 8 }}>
                  {valueElement}
                  {row.copyable && copyValue && (
                    <motion.button
                      type="button"
                      onClick={() => void handleCopy(row.value)}
                      whileHover={{ scale: 1.05, backgroundColor: BO_TINT }}
                      whileTap={{ scale: 0.9 }}
                      aria-label={`Copier ${row.label}`}
                      className="inline-flex items-center justify-center transition-all"
                      style={{ width: 24, height: 24, borderRadius: 8, border: `1px solid ${BO_LIGHT}`, background: 'transparent' }}
                    >
                      <AnimatedIcon icon={Copy} size={13} color={BO_MEDIUM} />
                    </motion.button>
                  )}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default UniversalTableBO;
