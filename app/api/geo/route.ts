import { reservePlaces } from '../../midtown-backup';
import { cityFromAddress, landmark, stripCityWords } from '../../cities';
import { geocoderLanguage, nominatimUrl, photonUrl, userAgent } from '../../upstream';

type GeoHit = {
  lat: string;
  lon: string;
  display_name: string;
  warning?: string;
  place?: (typeof reservePlaces)[number];
};

type PhotonFeature = {
  geometry?: { type?: string; coordinates?: [number, number] };
  properties?: { name?: string; street?: string; city?: string; country?: string };
};

const cached = { headers: { 'Cache-Control': 'public, max-age=600' } };

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const q = (p.get('q') || '').trim().slice(0, 240);
  const lat = Number(p.get('lat')),
    lon = Number(p.get('lon'));
  const reverse =
    p.has('lat') &&
    p.has('lon') &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180;
  if (!q && !reverse) return Response.json({ error: 'Ange en adress.' }, { status: 400 });

  // Saved places and neighbourhood names are answered locally for the cities we know.
  const city = reverse ? undefined : cityFromAddress(q);
  const normalized = city ? stripCityWords(q, city) : '';
  if (city) {
    const known = reservePlaces.find((place) =>
      [
        place.name.toLowerCase(),
        place.name.split(' · ')[0].toLowerCase(),
        place.address.toLowerCase(),
        place.id === 'reserve-red-rooster' ? 'red rooster' : '',
      ]
        .filter(Boolean)
        .includes(normalized),
    );
    if (known)
      return Response.json(
        [
          {
            lat: String(known.lat),
            lon: String(known.lon),
            display_name: known.name + ', ' + known.address,
            place: known,
            warning:
              'Sparad plats: ' + known.name + '. Kartpositionen är ungefärlig; kontrollera entrén.',
          } satisfies GeoHit,
        ],
        cached,
      );
    const preferred = landmark(city, normalized);
    if (preferred?.preferred)
      return Response.json([
        {
          lat: String(preferred.point.lat),
          lon: String(preferred.point.lon),
          display_name: preferred.label,
          warning: preferred.warning,
        } satisfies GeoHit,
      ]);
  }

  const params = reverse
    ? new URLSearchParams({ format: 'jsonv2', lat: String(lat), lon: String(lon) })
    : new URLSearchParams({ format: 'json', limit: '1', q });
  try {
    const r = await fetch(`${nominatimUrl()}/${reverse ? 'reverse' : 'search'}?${params}`, {
      headers: { 'User-Agent': userAgent(), 'Accept-Language': geocoderLanguage() },
      signal: AbortSignal.timeout(7000),
    });
    if (!r.ok) throw new Error('Unavailable');
    const result: unknown = await r.json();
    if (!reverse && (!Array.isArray(result) || !result.length)) throw new Error('No match');
    return Response.json(result, cached);
  } catch {
    if (!reverse) {
      try {
        const r = await fetch(`${photonUrl()}/api/?${new URLSearchParams({ q, limit: '1' })}`, {
          headers: { 'User-Agent': userAgent() },
          signal: AbortSignal.timeout(5000),
        });
        if (!r.ok) throw new Error('Unavailable');
        const data = (await r.json()) as { features?: PhotonFeature[] };
        const items: GeoHit[] = (data.features || [])
          .filter(
            (f) =>
              f.geometry?.type === 'Point' &&
              Number.isFinite(f.geometry.coordinates?.[0]) &&
              Number.isFinite(f.geometry.coordinates?.[1]),
          )
          .map((f) => ({
            lat: String(f.geometry!.coordinates![1]),
            lon: String(f.geometry!.coordinates![0]),
            display_name: [
              f.properties?.name,
              f.properties?.street,
              f.properties?.city,
              f.properties?.country,
            ]
              .filter(Boolean)
              .join(', '),
          }));
        if (items.length) return Response.json(items, cached);
      } catch {
        // Fall through to the landmark table below.
      }
      // Exact landmark or neighbourhood names only; never guess a street address.
      const fallback = city ? landmark(city, normalized) : undefined;
      if (fallback)
        return Response.json(
          [
            {
              lat: String(fallback.point.lat),
              lon: String(fallback.point.lon),
              display_name: fallback.label,
              warning:
                'Adressökningen svarar inte. ' +
                fallback.label +
                '. Välj en exakt entré på kartan om det behövs.',
            } satisfies GeoHit,
          ],
          { headers: { 'Cache-Control': 'no-store' } },
        );
    }
    return Response.json(
      {
        error:
          'Adressökningen är tillfälligt otillgänglig. Behåll adressen och försök igen, eller välj platsen på kartan.',
      },
      { status: 502 },
    );
  }
}
