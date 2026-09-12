import { validPoint } from '../../proximity';
import { decodeShape, legKey } from '../../walking';
import { distance, type Point } from '../../planner';
import { userAgent, valhallaUrl } from '../../upstream';

type ValhallaLeg = { summary?: { time?: number; length?: number }; shape: string };
type ValhallaResponse = { trip?: { status?: number; legs?: ValhallaLeg[] } };

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const points: Point[] = JSON.parse(params.get('points') || '[]');
    const tempo = params.get('tempo') || 'Normalt';
    if (
      !Array.isArray(points) ||
      points.length < 2 ||
      points.length > 12 ||
      !points.every(validPoint) ||
      !['Normalt', 'Lugnt', 'Högt'].includes(tempo)
    )
      return Response.json({ error: 'Ogiltiga ruttpunkter.' }, { status: 400 });
    if (points.slice(1).reduce((n, p, i) => n + distance(points[i], p), 0) > 100)
      return Response.json({ error: 'Sträckan är för lång för gångrutten.' }, { status: 400 });
    const payload = {
      locations: points.map((p) => ({ ...p, type: 'break' })),
      costing: 'pedestrian',
      costing_options: {
        pedestrian: { walking_speed: tempo === 'Lugnt' ? 3.5 : tempo === 'Högt' ? 5.5 : 4.5 },
      },
      units: 'kilometers',
    };
    const r = await fetch(
      `${valhallaUrl()}/route?json=${encodeURIComponent(JSON.stringify(payload))}`,
      {
        signal: AbortSignal.timeout(25000),
        headers: { 'User-Agent': userAgent(), Accept: 'application/json' },
        cf: { cacheTtl: 86400, cacheEverything: true },
      } as RequestInit,
    );
    if (!r.ok) throw new Error('Gångvägar kunde inte hämtas.');
    const text = await r.text();
    if (text.length > 2000000) throw new Error('Ruttinformationen är för stor.');
    const data = JSON.parse(text) as ValhallaResponse;
    if (data.trip?.status !== 0 || data.trip.legs?.length !== points.length - 1)
      throw new Error('Ingen sammanhängande gångväg hittades.');
    const legs: Record<string, unknown> = {};
    data.trip.legs.forEach((leg, i) => {
      const time = leg.summary?.time,
        length = leg.summary?.length;
      if (!Number.isFinite(time) || !Number.isFinite(length) || time! < 0 || length! < 0)
        throw new Error('Ogiltigt ruttsvar.');
      legs[legKey(points[i], points[i + 1], tempo)] = {
        minutes: Math.ceil(time! / 60),
        km: length,
        shape: decodeShape(leg.shape),
      };
    });
    return Response.json(
      { legs, source: 'Valhalla · © OpenStreetMap contributors' },
      { headers: { 'Cache-Control': 'public, max-age=86400' } },
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Gångvägar är tillfälligt otillgängliga.' },
      { status: 502 },
    );
  }
}
