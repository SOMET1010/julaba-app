import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseIdleTimerOptions {
  timeoutMs: number;
  warningMs: number;
  onLogout: () => void;
}

export function useIdleTimer(options: UseIdleTimerOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [tick, setTick] = useState(0);
  const onLogoutRef = useRef(options.onLogout);
  onLogoutRef.current = options.onLogout;

  const warningDelayMs = Math.max(0, options.timeoutMs - options.warningMs);

  const reset = useCallback(() => {
    setShowWarning(false);
    setSecondsRemaining(0);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let warningTimer: ReturnType<typeof setTimeout> | null = null;
    let logoutTimer: ReturnType<typeof setTimeout> | null = null;
    let countdownInterval: ReturnType<typeof setInterval> | null = null;

    const clearAll = () => {
      if (warningTimer) clearTimeout(warningTimer);
      if (logoutTimer) clearTimeout(logoutTimer);
      if (countdownInterval) clearInterval(countdownInterval);
      warningTimer = null;
      logoutTimer = null;
      countdownInterval = null;
    };

    const arm = () => {
      clearAll();
      setShowWarning(false);
      const sec0 = Math.floor(options.warningMs / 1000);
      warningTimer = setTimeout(() => {
        setShowWarning(true);
        setSecondsRemaining(sec0);
        countdownInterval = setInterval(() => {
          setSecondsRemaining((prev) => Math.max(0, prev - 1));
        }, 1000);
        logoutTimer = setTimeout(() => {
          if (countdownInterval) clearInterval(countdownInterval);
          onLogoutRef.current();
        }, options.warningMs);
      }, warningDelayMs);
    };

    const handleActivity = () => {
      arm();
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));
    arm();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      clearAll();
    };
  }, [options.timeoutMs, options.warningMs, warningDelayMs, tick]);

  return { showWarning, secondsRemaining, reset };
}
