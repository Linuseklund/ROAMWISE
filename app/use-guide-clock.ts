'use client';
import { useCallback, useSyncExternalStore } from 'react';

const TICK_MS = 15000;

/** Minutes elapsed since the guide was started, refreshed every 15 seconds. */
export function useGuideClock(clockAnchor: number | null) {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (clockAnchor == null) return () => {};
      const timer = setInterval(notify, TICK_MS);
      return () => clearInterval(timer);
    },
    [clockAnchor],
  );
  const getSnapshot = useCallback(
    () => (clockAnchor == null ? 0 : Math.floor((Date.now() - clockAnchor) / 60000)),
    [clockAnchor],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
