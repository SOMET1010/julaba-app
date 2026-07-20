import React, { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Flag,
  Mail,
  MapPin,
  MoreVertical,
  UserRound,
} from 'lucide-react';
import { TYPE_COLORS, STATUT_CONFIG, getRoleLabel } from '../../utils/role-config';
import { BO_PRIMARY } from './bo-theme';
import { UniversalDropdownMenuBO } from './universal/UniversalDropdownMenuBO';
import type { DropdownEntry } from './universal/UniversalDropdownMenuBO';

export type IconAnimationType = 'bounce' | 'pulse' | 'spin' | 'float' | 'none';

const ICON_ANIMS: Record<IconAnimationType, { animate: any; transition: any }> = {
  bounce: { animate: { y: [0, -3, 0] }, transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } },
  pulse: { animate: { scale: [1, 1.08, 1] }, transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } },
  spin: { animate: { rotate: [0, 360] }, transition: { duration: 6, repeat: Infinity, ease: 'linear' } },
  float: { animate: { y: [0, -2, 0], scale: [1, 1.04, 1] }, transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
  none: { animate: {}, transition: {} },
};

export interface LeadingAvatarConfig {
  type: 'avatar';
  src?: string;
  fallback: string;
  color: string;
  statusDotColor?: string;
  iconAnimation?: IconAnimationType;
}

export interface LeadingIconConfig {
  type: 'icon';
  icon: LucideIcon;
  bgColor: string;
  iconColor: string;
  iconAnimation?: IconAnimationType;
}

export type LeadingConfig = LeadingAvatarConfig | LeadingIconConfig;

export interface TitleBadge {
  icon?: LucideIcon;
  label: string;
  bg: string;
  text: string;
  tooltip?: string;
}

export interface SubtitlePart {
  icon?: LucideIcon;
  label: string;
  color?: string;
  bold?: boolean;
}

export interface StatusConfig {
  label: string;
  icon: LucideIcon;
  bg: string;
  text: string;
}

export interface ActionConfig {
  icon: LucideIcon;
  label: string;
  onClick: (e: React.MouseEvent) => void;
}

export interface UniversalCardBOProps {
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  leading: LeadingConfig;
  title: string;
  titleBadges?: TitleBadge[];
  subtitleParts?: SubtitlePart[];
  status?: StatusConfig;
  actions?: ActionConfig[] | 'dots';
  onDotsClick?: (e: React.MouseEvent) => void;
  onClick?: () => void;
  index?: number;
  testId?: string;
  expandable?: boolean;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  expandedContent?: React.ReactNode;
  statusAction?: React.ReactNode;
}

interface AnimatedIconProps {
  icon: LucideIcon;
  animation?: IconAnimationType;
  className?: string;
  iconClassName?: string;
  style?: React.CSSProperties;
  iconStyle?: React.CSSProperties;
}

function AnimatedIcon({
  icon: Icon,
  animation = 'float',
  className = '',
  iconClassName = '',
  style,
  iconStyle,
}: AnimatedIconProps) {
  const iconAnim = ICON_ANIMS[animation];
  return (
    <motion.div
      animate={iconAnim.animate}
      transition={iconAnim.transition}
      aria-hidden="true"
      className={`inline-flex items-center justify-center ${className}`}
      style={style}
    >
      <Icon className={iconClassName} style={iconStyle} />
    </motion.div>
  );
}

function getInitials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'IN';
  return parts.map(part => part.charAt(0)).join('').slice(0, 2).toUpperCase();
}

function getStatusConfig(statut?: string | null): StatusConfig & { dotColor: string } {
  if (statut === 'approuve') {
    return { ...STATUT_CONFIG.actif, label: 'Approuvé' };
  }
  if (statut === 'complement_requis' || statut === 'complement') {
    return {
      ...STATUT_CONFIG.en_attente,
      label: 'Complément requis',
      icon: FileText,
      dotColor: TYPE_COLORS.admin_national,
    };
  }
  if (statut === 'brouillon') {
    return {
      ...STATUT_CONFIG.rejete,
      label: 'Brouillon',
      icon: FileText,
      dotColor: TYPE_COLORS.operateur_terrain,
    };
  }
  return STATUT_CONFIG[statut || 'actif'] || STATUT_CONFIG.actif;
}

function getRoleColor(role?: string | null): string {
  return TYPE_COLORS[role || ''] || TYPE_COLORS.administrateur;
}

function withAlpha(color: string, alpha: string): string {
  return `${color}${alpha}`;
}

export function UniversalCardBO({
  selectable = false,
  selected = false,
  onSelectChange,
  leading,
  title,
  titleBadges = [],
  subtitleParts = [],
  status,
  actions,
  onDotsClick,
  onClick,
  index = 0,
  testId,
  expandable = false,
  expanded,
  defaultExpanded = false,
  onExpandChange,
  expandedContent,
  statusAction,
}: UniversalCardBOProps) {
  const iconAnim = ICON_ANIMS[leading.iconAnimation || 'float'];
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = expanded !== undefined;
  const currentExpanded = isControlled ? expanded : internalExpanded;

  const toggleExpanded = useCallback(() => {
    const next = !currentExpanded;
    if (!isControlled) setInternalExpanded(next);
    onExpandChange?.(next);
  }, [currentExpanded, isControlled, onExpandChange]);

  const handleCardClick = useCallback(() => {
    if (onClick) {
      onClick();
      return;
    }
    if (expandable) toggleExpanded();
  }, [expandable, onClick, toggleExpanded]);

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectChange?.(!selected);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick && !expandable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
      role={onClick || expandable ? 'button' : undefined}
      tabIndex={onClick || expandable ? 0 : undefined}
      aria-label={onClick ? `Ouvrir ${title}` : undefined}
      className={`bg-white rounded-2xl border-2 border-gray-100 shadow-sm transition-all overflow-hidden ${onClick || expandable ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      data-testid={testId}
    >
      <div
      style={{
        display: 'grid',
          gridTemplateColumns: expandable ? 'auto auto minmax(0,1fr) auto auto auto' : 'auto auto minmax(0,1fr) auto auto',
        alignItems: 'center',
        gap: 16,
        padding: '16px 20px',
      }}
    >
      {selectable ? (
        <motion.button
          type="button"
          onClick={handleSelectClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.85 }}
          role="checkbox"
          aria-label={selected ? 'Désélectionner' : 'Sélectionner'}
          aria-checked={selected}
          className="flex items-center justify-center transition-all"
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: selected ? `2px solid ${BO_PRIMARY}` : '2px solid #E5E7EB',
            background: selected ? BO_PRIMARY : 'white',
          }}
        >
          {selected && <AnimatedIcon icon={Check} animation="pulse" iconClassName="w-3.5 h-3.5 text-white" />}
        </motion.button>
      ) : (
        <div aria-hidden="true" />
      )}

      <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
        {leading.type === 'avatar' ? (
          <>
            {leading.src ? (
              <motion.div
                animate={iconAnim.animate}
                transition={iconAnim.transition}
                className="rounded-full"
                style={{ width: 52, height: 52 }}
              >
                <img
                  src={leading.src}
                  alt={leading.fallback}
                  className="rounded-full object-cover"
                  style={{ width: 52, height: 52 }}
                />
              </motion.div>
            ) : (
              <motion.div
                animate={iconAnim.animate}
                transition={iconAnim.transition}
                className="rounded-full flex items-center justify-center text-white font-black"
                style={{
                  width: 52,
                  height: 52,
                  background: `linear-gradient(135deg, ${leading.color} 0%, ${withAlpha(leading.color, 'CC')} 100%)`,
                  fontSize: 18,
                  boxShadow: `0 4px 12px ${withAlpha(leading.color, '30')}`,
                }}
              >
                {leading.fallback.toUpperCase().slice(0, 2)}
              </motion.div>
            )}
            {leading.statusDotColor && (
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'white',
                  border: '2px solid white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: leading.statusDotColor }} />
              </motion.div>
            )}
          </>
        ) : (
          <motion.div
            animate={iconAnim.animate}
            transition={iconAnim.transition}
            className="flex items-center justify-center rounded-2xl"
            style={{
              width: 52,
              height: 52,
              background: leading.bgColor,
            }}
          >
            <leading.icon className="w-6 h-6" style={{ color: leading.iconColor }} />
          </motion.div>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <p className="text-gray-900" style={{ fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 }}>
            {title}
          </p>
          {titleBadges.map((badge, i) => (
            <span
              key={`${badge.label}-${i}`}
              className={`${badge.bg} ${badge.text} inline-flex items-center gap-1`}
              style={{ padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}
              title={badge.tooltip}
            >
              {badge.icon && <AnimatedIcon icon={badge.icon} animation="pulse" iconClassName="w-2.5 h-2.5" />}
              {badge.label}
            </span>
          ))}
        </div>
        {subtitleParts.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#6B7280', flexWrap: 'wrap' }}>
            {subtitleParts.map((part, i) => (
              <React.Fragment key={`${part.label}-${i}`}>
                {i > 0 && <span aria-hidden="true" style={{ width: 3, height: 3, borderRadius: '50%', background: '#D1D5DB' }} />}
                <span
                  className={`${part.bold ? 'font-bold' : ''} inline-flex items-center gap-1`}
                  style={{
                    color: part.color,
                    fontWeight: part.bold || part.color ? 700 : undefined,
                  }}
                >
                  {part.icon && <AnimatedIcon icon={part.icon} animation="float" iconClassName="w-3 h-3" />}
                  {part.label}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {status ? (
          <span
            className={`${status.bg} ${status.text} inline-flex items-center gap-1.5`}
            style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}
          >
            <AnimatedIcon icon={status.icon} animation="pulse" iconClassName="w-3 h-3" />
            {status.label}
          </span>
        ) : (
          <div aria-hidden="true" />
        )}
        {statusAction}
      </div>

      {actions === 'dots' ? (
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDotsClick?.(e);
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Plus d'actions"
          aria-haspopup="menu"
          className="flex items-center justify-center transition-all hover:bg-gray-50"
          style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB', background: 'white' }}
        >
          <AnimatedIcon icon={MoreVertical} animation="float" iconClassName="w-4 h-4 text-gray-600" />
        </motion.button>
      ) : Array.isArray(actions) && actions.length > 0 ? (
        <div style={{ display: 'flex', gap: 6 }}>
          {actions.map((action, i) => (
            <motion.button
              key={`${action.label}-${i}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                action.onClick(e);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              aria-label={action.label}
              className="flex items-center justify-center transition-all hover:bg-gray-50"
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB', background: 'white' }}
            >
              <AnimatedIcon icon={action.icon} animation="float" iconClassName="w-4 h-4 text-gray-600" />
            </motion.button>
          ))}
        </div>
      ) : (
        <div aria-hidden="true" />
      )}

        {expandable && (
          <motion.button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
            aria-expanded={currentExpanded}
            aria-label={currentExpanded ? 'Réduire' : 'Développer'}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"
          >
            {currentExpanded ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
          </motion.button>
        )}
      </div>

      {expandable && (
        <AnimatePresence>
          {currentExpanded && expandedContent && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t-2 border-gray-100 pt-3 sm:pt-4">
                {expandedContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}

export interface UniversalCardBOActeurProps {
  acteur: {
    id: string;
    nom?: string;
    prenoms?: string;
    full_name?: string;
    photoUrl?: string;
    type?: string;
    role: string;
    activite?: string;
    commune?: string;
    statut?: string;
  };
  flagsCount?: number;
  flagTooltip?: string;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  onClick?: () => void;
  onDotsClick?: (e: React.MouseEvent) => void;
  index?: number;
}

export function UniversalCardBOActeur({
  acteur,
  flagsCount = 0,
  flagTooltip,
  selectable,
  selected,
  onSelectChange,
  onClick,
  onDotsClick,
  index = 0,
}: UniversalCardBOActeurProps) {
  const role = acteur.type || acteur.role;
  const roleColor = getRoleColor(role);
  const status = getStatusConfig(acteur.statut);
  const title = acteur.full_name || [acteur.prenoms, acteur.nom].filter(Boolean).join(' ') || 'Acteur sans nom';
  const titleBadges: TitleBadge[] = flagsCount > 0
    ? [{
        icon: Flag,
        label: flagsCount > 1 ? `${flagsCount} signalements` : 'Signalé',
        bg: STATUT_CONFIG.suspendu.bg,
        text: STATUT_CONFIG.suspendu.text,
        tooltip: flagTooltip,
      }]
    : [];
  const subtitleParts: SubtitlePart[] = [
    { label: getRoleLabel(role), color: roleColor, bold: true },
    ...(acteur.activite ? [{ label: acteur.activite }] : []),
    ...(acteur.commune ? [{ icon: MapPin, label: acteur.commune }] : []),
  ];

  return (
    <UniversalCardBO
      selectable={selectable}
      selected={selected}
      onSelectChange={onSelectChange}
      leading={{
        type: 'avatar',
        src: acteur.photoUrl,
        fallback: getInitials(title),
        color: roleColor,
        statusDotColor: status.dotColor,
        iconAnimation: 'float',
      }}
      title={title}
      titleBadges={titleBadges}
      subtitleParts={subtitleParts}
      status={status}
      actions="dots"
      onDotsClick={onDotsClick}
      onClick={onClick}
      index={index}
      testId={`bo-acteur-card-${acteur.id}`}
    />
  );
}

export interface UniversalCardBODossierProps {
  dossier: {
    id: string;
    titre?: string;
    title?: string;
    reference?: string;
    type?: string;
    statut?: string;
    commune?: string;
    responsable?: string;
    date?: string;
    priorite?: string;
    acteurNom?: string;
    acteurType?: string;
    identificateurNom?: string;
    dateCreation?: string;
    photoUrl?: string;
  };
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  onClick?: () => void;
  onDotsClick?: (e: React.MouseEvent) => void;
  dropdownItems?: DropdownEntry[];
  expandable?: boolean;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  expandedContent?: React.ReactNode;
  statusAction?: React.ReactNode;
  index?: number;
}

export function UniversalCardBODossier({
  dossier,
  selectable,
  selected,
  onSelectChange,
  onClick,
  onDotsClick,
  dropdownItems,
  expandable,
  expanded,
  defaultExpanded,
  onExpandChange,
  expandedContent,
  statusAction,
  index = 0,
}: UniversalCardBODossierProps) {
  const status = getStatusConfig(dossier.statut);
  const tone = status.dotColor || TYPE_COLORS.institution;
  const title = dossier.acteurNom || dossier.titre || dossier.title || dossier.reference || 'Dossier sans titre';
  const role = dossier.acteurType || dossier.type || '';
  const roleColor = getRoleColor(role);
  const hasDropdownItems = Boolean(dropdownItems && dropdownItems.length > 0);
  const subtitleParts: SubtitlePart[] = [
    ...(dossier.reference ? [{ icon: FileText, label: dossier.reference, bold: true }] : []),
    ...(role ? [{ label: getRoleLabel(role), color: roleColor, bold: true }] : []),
    ...(dossier.responsable ? [{ icon: UserRound, label: dossier.responsable }] : []),
    ...(dossier.identificateurNom ? [{ icon: UserRound, label: dossier.identificateurNom }] : []),
    ...(dossier.commune ? [{ icon: MapPin, label: dossier.commune }] : []),
    ...(dossier.date || dossier.dateCreation ? [{ icon: CalendarDays, label: dossier.date || dossier.dateCreation || '' }] : []),
  ];

  return (
    <div style={{ position: 'relative' }}>
      <UniversalCardBO
        selectable={selectable}
        selected={selected}
        onSelectChange={onSelectChange}
        leading={dossier.acteurNom || dossier.photoUrl ? {
          type: 'avatar',
          src: dossier.photoUrl,
          fallback: getInitials(title),
          color: roleColor || tone,
          statusDotColor: tone,
          iconAnimation: 'float',
        } : {
          type: 'icon',
          icon: FileText,
          bgColor: withAlpha(tone, '18'),
          iconColor: tone,
          iconAnimation: 'float',
        }}
        title={title}
        titleBadges={dossier.priorite ? [{ label: dossier.priorite, bg: 'bg-orange-100', text: 'text-orange-700' }] : []}
        subtitleParts={subtitleParts}
        status={status}
        statusAction={statusAction}
        actions={hasDropdownItems || onDotsClick ? 'dots' : undefined}
        onDotsClick={onDotsClick}
        onClick={onClick}
        index={index}
        testId={`bo-dossier-card-${dossier.id}`}
        expandable={expandable}
        expanded={expanded}
        defaultExpanded={defaultExpanded}
        onExpandChange={onExpandChange}
        expandedContent={expandedContent}
      />
      {hasDropdownItems && (
        <div
          onClick={(event) => {
            event.stopPropagation();
          }}
          style={{
            position: 'absolute',
            right: expandable ? 68 : 20,
            top: 20,
            zIndex: 5,
          }}
        >
          <UniversalDropdownMenuBO
            trigger={<span style={{ display: 'block', width: 32, height: 32 }} />}
            items={dropdownItems || []}
            align="right"
            minWidth={240}
          />
        </div>
      )}
    </div>
  );
}

export interface UniversalCardBOFlagProps {
  flag: {
    id: string;
    titre?: string;
    title?: string;
    motif?: string;
    reason?: string;
    acteurName?: string;
    statut?: string;
    date?: string;
    severite?: string;
  };
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  onClick?: () => void;
  onDotsClick?: (e: React.MouseEvent) => void;
  index?: number;
}

export function UniversalCardBOFlag({
  flag,
  selectable,
  selected,
  onSelectChange,
  onClick,
  onDotsClick,
  index = 0,
}: UniversalCardBOFlagProps) {
  const status = getStatusConfig(flag.statut || 'en_attente');
  const flagColor = STATUT_CONFIG.suspendu.dotColor;
  const subtitleParts: SubtitlePart[] = [
    ...(flag.motif || flag.reason ? [{ label: flag.motif || flag.reason || '' }] : []),
    ...(flag.acteurName ? [{ icon: UserRound, label: flag.acteurName }] : []),
    ...(flag.date ? [{ icon: CalendarDays, label: flag.date }] : []),
  ];

  return (
    <UniversalCardBO
      selectable={selectable}
      selected={selected}
      onSelectChange={onSelectChange}
      leading={{
        type: 'icon',
        icon: Flag,
        bgColor: withAlpha(flagColor, '18'),
        iconColor: flagColor,
        iconAnimation: 'pulse',
      }}
      title={flag.titre || flag.title || 'Signalement'}
      titleBadges={flag.severite ? [{ icon: Flag, label: flag.severite, bg: STATUT_CONFIG.suspendu.bg, text: STATUT_CONFIG.suspendu.text }] : []}
      subtitleParts={subtitleParts}
      status={status}
      actions="dots"
      onDotsClick={onDotsClick}
      onClick={onClick}
      index={index}
      testId={`bo-flag-card-${flag.id}`}
    />
  );
}

export interface UniversalCardBOBOUserProps {
  user: {
    id: string;
    nom?: string;
    prenoms?: string;
    full_name?: string;
    email?: string;
    photoUrl?: string;
    role: string;
    statut?: string;
  };
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  onClick?: () => void;
  onDotsClick?: (e: React.MouseEvent) => void;
  index?: number;
}

export function UniversalCardBOBOUser({
  user,
  selectable,
  selected,
  onSelectChange,
  onClick,
  onDotsClick,
  index = 0,
}: UniversalCardBOBOUserProps) {
  const roleColor = getRoleColor(user.role);
  const status = getStatusConfig(user.statut);
  const title = user.full_name || [user.prenoms, user.nom].filter(Boolean).join(' ') || 'Utilisateur sans nom';
  const subtitleParts: SubtitlePart[] = [
    { label: getRoleLabel(user.role), color: roleColor, bold: true },
    ...(user.email ? [{ icon: Mail, label: user.email }] : []),
  ];

  return (
    <UniversalCardBO
      selectable={selectable}
      selected={selected}
      onSelectChange={onSelectChange}
      leading={{
        type: 'avatar',
        src: user.photoUrl,
        fallback: getInitials(title),
        color: roleColor,
        statusDotColor: status.dotColor,
        iconAnimation: 'float',
      }}
      title={title}
      titleBadges={[{ label: getRoleLabel(user.role), bg: 'bg-purple-100', text: 'text-purple-700' }]}
      subtitleParts={subtitleParts}
      status={status}
      actions="dots"
      onDotsClick={onDotsClick}
      onClick={onClick}
      index={index}
      testId={`bo-user-card-${user.id}`}
    />
  );
}

export interface UniversalCardBOInstitutionProps {
  institution: {
    id: string;
    nom?: string;
    name?: string;
    type?: string;
    commune?: string;
    responsable?: string;
    statut?: string;
  };
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  onClick?: () => void;
  onDotsClick?: (e: React.MouseEvent) => void;
  index?: number;
}

export function UniversalCardBOInstitution({
  institution,
  selectable,
  selected,
  onSelectChange,
  onClick,
  onDotsClick,
  index = 0,
}: UniversalCardBOInstitutionProps) {
  const status = getStatusConfig(institution.statut);
  const institutionColor = TYPE_COLORS.institution;
  const subtitleParts: SubtitlePart[] = [
    ...(institution.type ? [{ label: institution.type, color: institutionColor, bold: true }] : []),
    ...(institution.responsable ? [{ icon: UserRound, label: institution.responsable }] : []),
    ...(institution.commune ? [{ icon: MapPin, label: institution.commune }] : []),
  ];

  return (
    <UniversalCardBO
      selectable={selectable}
      selected={selected}
      onSelectChange={onSelectChange}
      leading={{
        type: 'icon',
        icon: Building2,
        bgColor: withAlpha(institutionColor, '18'),
        iconColor: institutionColor,
        iconAnimation: 'float',
      }}
      title={institution.nom || institution.name || 'Institution sans nom'}
      subtitleParts={subtitleParts}
      status={status}
      actions="dots"
      onDotsClick={onDotsClick}
      onClick={onClick}
      index={index}
      testId={`bo-institution-card-${institution.id}`}
    />
  );
}

export default UniversalCardBO;
