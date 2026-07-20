/**
 * 💀 JULABA SHARED SKELETON
 * 
 * Composant skeleton loader unifié pour tous les rôles.
 * Basé sur le Design System Marchand.
 */

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../ui/utils';

export interface SkeletonProps {
  /** Variant du skeleton */
  variant?: 'text' | 'circular' | 'rectangular';
  
  /** Largeur */
  width?: string | number;
  
  /** Hauteur */
  height?: string | number;
  
  /** Classe additionnelle */
  className?: string;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className,
}: SkeletonProps) {
  // Classes de base
  const baseClasses = cn(
    'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200',
    'bg-[length:200%_100%]',
    'animate-shimmer',
    className
  );
  
  // Classes selon variant
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }[variant];
  
  const style: React.CSSProperties = {
    width: width || (variant === 'circular' ? '40px' : '100%'),
    height: height || (variant === 'circular' ? '40px' : undefined),
  };
  
  return (
    <motion.div
      className={cn(baseClasses, variantClasses)}
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    />
  );
}

/**
 * Skeleton pour une card KPI
 */
export function SkeletonKPI() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton variant="text" width="60%" className="mb-2" />
          <Skeleton variant="text" width="40%" height="32px" className="mb-2" />
          <Skeleton variant="text" width="50%" />
        </div>
        <Skeleton variant="circular" width="48px" height="48px" />
      </div>
    </div>
  );
}

/**
 * Skeleton pour une card standard
 */
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton variant="circular" width="48px" height="48px" />
        <div className="flex-1">
          <Skeleton variant="text" width="70%" className="mb-2" />
          <Skeleton variant="text" width="50%" />
        </div>
      </div>
      <Skeleton variant="rectangular" height="100px" />
    </div>
  );
}

/**
 * Skeleton pour une liste
 */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// Ajouter l'animation shimmer au CSS global
// Cette animation doit être ajoutée dans tailwind.config.js ou theme.css