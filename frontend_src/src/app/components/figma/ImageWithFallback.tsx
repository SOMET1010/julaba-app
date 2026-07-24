import React, { useState, useEffect, useMemo } from 'react'

// Placeholder LOCAL (marche HORS-LIGNE, ne dépend d'aucun réseau) : un petit
// panier de marché sur fond chaud — PAS une icône « image cassée ». Une
// non-lectrice voit toujours « un produit », jamais un carré gris cassé.
const FALLBACK_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'>" +
    "<rect width='96' height='96' fill='#FBEEE1'/>" +
    "<g fill='none' stroke='#C15C1C' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'>" +
    "<path d='M26 40h44l-5 28a6 6 0 0 1-6 5H37a6 6 0 0 1-6-5z'/>" +
    "<path d='M37 40l7-16M59 40l-7-16'/>" +
    "<path d='M22 40h52'/></g></svg>"
  )

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Image de repli (ex. photo du catalogue par nom) essayée si `src` échoue ou est vide. */
  fallbackSrc?: string
}

export function ImageWithFallback({ src, alt, style, className, fallbackSrc, ...rest }: Props) {
  // Chaîne de repli : vraie image -> image catalogue -> panier local (infaillible).
  const candidates = useMemo(
    () => [src, fallbackSrc, FALLBACK_SVG].filter((s): s is string => !!s),
    [src, fallbackSrc],
  )
  const [idx, setIdx] = useState(0)
  // Repart de la première image quand la source change (nouveau produit).
  useEffect(() => { setIdx(0) }, [src, fallbackSrc])

  const current = candidates[Math.min(idx, candidates.length - 1)] || FALLBACK_SVG

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      decoding="async"
      {...rest}
      onError={() => setIdx((i) => (i < candidates.length - 1 ? i + 1 : i))}
    />
  )
}
