import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';

interface CounterProps {
  value: number;
  duration?: number;
  className?: string;
}

export function Counter({ value, duration = 1000, className = '' }: CounterProps) {
  const [count, setCount] = useState(0);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    const startTime = Date.now();
    const difference = endValue - startValue;

    const updateCount = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + difference * easeOut);

      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        setCount(endValue);
        prevValueRef.current = endValue;
      }
    };

    requestAnimationFrame(updateCount);
  }, [value, duration]);

  return <span className={className}>{(count || 0).toLocaleString('fr-FR')}</span>;
}

interface CounterTextProps {
  value: string;
  duration?: number;
  className?: string;
}

export function CounterText({ value, duration = 500, className = '' }: CounterTextProps) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration / 1000 }}
      className={className}
    >
      {value}
    </motion.span>
  );
}
