'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SavedTrip } from './types';

type TripResponse = { state: unknown; revision: number; error?: string };
type SaveResponse = { revision: number; error?: string };

/**
 * Restores the visitor's trip on load and saves every change with optimistic locking.
 * Updates are serialised: a change made during a request is saved right after it.
 */
export function useTripSave(snapshot: SavedTrip, restore: (state: SavedTrip) => void) {
  const [status, setStatus] = useState('Läser sparad tur…');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [restored, setRestored] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [retry, setRetry] = useState(0);
  const revision = useRef(0),
    saved = useRef(''),
    busy = useRef(false),
    blocked = useRef(false);
  const restoreRef = useRef(restore);
  useEffect(() => {
    restoreRef.current = restore;
  });
  const json = JSON.stringify(snapshot);
  const current = useRef(json);
  useEffect(() => {
    current.current = json;
  }, [json]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/trip', { signal: controller.signal, cache: 'no-store' })
      .then(async (r) => {
        const data = (await r.json()) as TripResponse;
        if (!r.ok) throw new Error(data.error);
        return data;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        revision.current = data.revision;
        const state = data.state as SavedTrip | null;
        if (state?.version === 1) {
          restoreRef.current(state);
          saved.current = JSON.stringify(state);
          setRestored(true);
        }
        setReady(true);
        setStatus(state ? 'Turen är återställd.' : 'Sparar automatiskt.');
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setError(true);
        setStatus(e.message || 'Sparad tur kunde inte läsas. Ladda om och försök igen.');
      });
    return () => controller.abort();
  }, []);

  const flush = useCallback(async () => {
    if (!ready || busy.current || blocked.current || current.current === saved.current) return;
    busy.current = true;
    setStatus('Sparar…');
    setError(false);
    try {
      while (current.current !== saved.current) {
        const payload = current.current;
        const r = await fetch('/api/trip', {
          method: 'PUT',
          keepalive: payload.length < 50000,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: JSON.parse(payload), revision: revision.current }),
        });
        const data = (await r.json()) as SaveResponse;
        if (!r.ok) {
          if (r.status === 409) {
            blocked.current = true;
            setConflict(true);
          }
          throw new Error(data.error);
        }
        revision.current = data.revision;
        saved.current = payload;
      }
      setStatus('Turen är sparad.');
    } catch (e) {
      setError(true);
      setStatus(e instanceof Error ? e.message : 'Kunde inte spara. Försök igen.');
    } finally {
      busy.current = false;
    }
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => void flush(), 400);
    return () => clearTimeout(timer);
  }, [json, ready, retry, flush]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [flush]);

  return {
    status,
    error,
    restored,
    ready,
    retry: () => setRetry((n) => n + 1),
    reloadRequired: !ready || conflict,
  };
}
