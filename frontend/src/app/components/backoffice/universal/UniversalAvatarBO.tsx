import React from 'react';
import { motion } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { TYPE_COLORS, STATUS_DOT_COLOR } from '../../../utils/role-config';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CONFIG: Record<AvatarSize, { container: number; font: number; dot: number; dotPosition: number }> = {
  sm: { container: 28, font: 11, dot: 8, dotPosition: -1 },
  md: { container: 40, font: 14, dot: 12, dotPosition: -1 },
  lg: { container: 52, font: 18, dot: 16, dotPosition: -2 },
  xl: { container: 80, font: 28, dot: 18, dotPosition: -2 },
};

export interface UniversalAvatarBOProps {
  src?: string;
  fallback: string;
  alt?: string;
  role?: string;
  size?: AvatarSize;
  customColor?: string;
  status?: string;
  showDot?: boolean;
  animated?: boolean;
  onClick?: () => void;
}

function getInitials(fallback: string): string {
  return fallback.trim().substring(0, 2).toUpperCase() || 'IN';
}

export function UniversalAvatarBO({
  src,
  fallback,
  alt,
  role,
  size = 'md',
  customColor,
  status,
  showDot = false,
  animated = true,
  onClick,
}: UniversalAvatarBOProps) {
  const config = SIZE_CONFIG[size];
  const color = customColor || (role ? TYPE_COLORS[role] : undefined) || TYPE_COLORS.administrateur;
  const dotColor = status ? STATUS_DOT_COLOR[status] : STATUS_DOT_COLOR.actif;
  const shouldShowDot = showDot || !!status;
  const initials = getInitials(fallback);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: config.container,
    height: config.container,
    flexShrink: 0,
  };

  const avatarStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: src ? undefined : `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
    boxShadow: src ? undefined : `0 4px 12px ${color}30`,
    color: 'white',
    fontWeight: 900,
    fontSize: config.font,
  };

  const content = (
    <>
      <motion.div
        animate={animated ? { y: [0, -2, 0], scale: [1, 1.04, 1] } : {}}
        transition={animated ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : {}}
        style={{ width: '100%', height: '100%' }}
      >
        <Avatar style={avatarStyle}>
          {src && (
            <AvatarImage
              src={src}
              alt={alt || fallback}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            />
          )}
          <AvatarFallback style={avatarStyle}>
            {initials}
          </AvatarFallback>
        </Avatar>
      </motion.div>

      {shouldShowDot && (
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: config.dotPosition,
            right: config.dotPosition,
            width: config.dot,
            height: config.dot,
            borderRadius: '50%',
            background: 'white',
            border: '2px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: dotColor }} />
        </motion.div>
      )}
    </>
  );

  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        aria-label={alt || fallback}
        className="p-0 border-0 bg-transparent transition-all"
        style={containerStyle}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <div
      style={containerStyle}
      aria-label={alt || fallback}
    >
      {content}
    </div>
  );
}

export default UniversalAvatarBO;
