import { useState, useEffect } from 'react';

/**
 * Hook pour animer un compteur de 0 vers une valeur cible
 * @param end - Valeur finale
 * @param duration - Durée de l'animation en ms (défaut: 2000)
 * @param decimals - Nombre de décimales (défaut: 0)
 * @param delay - Délai avant démarrage en ms (défaut: 0)
 */
export function useCountUp(
  end: number,
  duration: number = 2000,
  decimals: number = 0,
  delay: number = 0
): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Utilise une fonction d'easing pour un effet plus naturel (easeOutExpo)
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const currentCount = easedProgress * end;
      setCount(Number(currentCount.toFixed(decimals)));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    const timeoutId = setTimeout(() => {
      animationFrame = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration, decimals, delay]);

  return count;
}
