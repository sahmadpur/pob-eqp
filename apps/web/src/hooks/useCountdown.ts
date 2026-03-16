'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseCountdownOptions {
  initialSeconds: number;
  onExpire?: () => void;
}

export function useCountdown({ initialSeconds, onExpire }: UseCountdownOptions) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning || seconds <= 0) {
      if (seconds <= 0) onExpire?.();
      return;
    }

    const timer = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timer);
          setIsRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, seconds, onExpire]);

  const reset = useCallback((newSeconds?: number) => {
    setSeconds(newSeconds ?? initialSeconds);
    setIsRunning(true);
  }, [initialSeconds]);

  const stop = useCallback(() => setIsRunning(false), []);

  return { seconds, isRunning, reset, stop };
}
