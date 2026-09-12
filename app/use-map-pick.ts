'use client';
import { useEffect, useRef } from 'react';
import { MAP_PICK_MESSAGE } from './map-documents';
import type { Point } from './planner';

/** Listens for coordinates posted by the map picker iframe while it is open. */
export function useMapPick(active: boolean, onPick: (point: Point) => void) {
  const handler = useRef(onPick);
  useEffect(() => {
    handler.current = onPick;
  });
  useEffect(() => {
    if (!active) return;
    const receive = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type !== MAP_PICK_MESSAGE) return;
      if (!Number.isFinite(data.lat) || !Number.isFinite(data.lon)) return;
      handler.current({ lat: Number(data.lat), lon: Number(data.lon) });
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [active]);
}
