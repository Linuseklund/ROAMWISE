// Browser-side clients for the app's own API routes.
import type { CatalogPlace } from './catalog';

const UNAVAILABLE = 'Platstjänsten svarar inte just nu. Dina val är kvar. Försök igen.';

export async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(url.includes('purpose=route') ? 26000 : 50000),
    });
    const data = (await response.json()) as T & { error?: string };
    if (!response.ok)
      throw new Error(data.error || 'Platstjänsten svarar inte just nu. Försök igen.');
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    throw new Error(
      message && !/timeout|fetch|internal error/i.test(message) ? message : UNAVAILABLE,
    );
  }
}

export type GeoHit = {
  lat: string;
  lon: string;
  display_name?: string;
  name?: string;
  address?: Record<string, string>;
  warning?: string;
  place?: CatalogPlace;
};

export const geocode = (query: string) =>
  fetchJson<GeoHit[]>('/api/geo?' + new URLSearchParams({ q: query }));

export async function reverseCoordinates(lat: number, lon: number) {
  const result = await fetchJson<GeoHit>(
    '/api/geo?' + new URLSearchParams({ lat: String(lat), lon: String(lon) }),
  );
  const details = result.address || {};
  const shortAddress = [
    details.road || details.pedestrian || details.neighbourhood || result.name,
    details.house_number,
  ]
    .filter(Boolean)
    .join(' ');
  return {
    label: shortAddress || result.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    city:
      details.city ||
      details.town ||
      details.village ||
      details.municipality ||
      details.county ||
      details.country ||
      '',
  };
}

export type CatalogResponse = {
  items: CatalogPlace[];
  nextCursor: string | null;
  total?: number;
  source: string;
  sourceUrl: string;
  note: string;
  warning?: string;
};

/**
 * Searches the catalogue. With `reserveFallback` a failed search is retried against the
 * clearly labelled reserve list instead of failing the whole route.
 */
export async function searchCatalog(
  query: URLSearchParams,
  { reserveFallback = false } = {},
): Promise<CatalogResponse> {
  try {
    return await fetchJson<CatalogResponse>('/api/catalog?' + query);
  } catch (error) {
    if (!reserveFallback) throw error;
    query.set('reserve', '1');
    return fetchJson<CatalogResponse>('/api/catalog?' + query);
  }
}
