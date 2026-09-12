import { legKey, type WalkingLegs } from './walking';
import { openingIntervals } from './opening';
export type Point = { lat: number; lon: number };
export type Stop = {
  id: string | number;
  minutes: number;
  lat?: number;
  lon?: number;
  category: string;
  openingHours?: string;
  notBefore?: number;
  notAfter?: number;
  meal?: string;
  finishBy?: number;
  terminal?: boolean;
  afterMeal?: string;
};
export type Scheduled<T> = T & {
  arrival: number;
  departure: number;
  travelMinutes: number;
  km: number;
  waitMinutes?: number;
  openingStatus?: string;
  travelMode?: string;
};
export const timeMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};
export const timeLabel = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(Math.floor(minutes) % 60).padStart(2, '0')}${minutes >= 1440 ? ' (+1 dag)' : ''}`;
export const tripMinutes = (start: string, end: string) => {
  const n = timeMinutes(end) - timeMinutes(start);
  return n < 0 ? n + 1440 : n;
};
export const distance = (a: Point, b: Point) => {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
};
export const pointOf = (p: Stop): Point | null =>
  Number.isFinite(p.lat) && Number.isFinite(p.lon) ? { lat: p.lat!, lon: p.lon! } : null;
// Estimates include a street-detour factor. They are deliberately labelled estimates in the UI.
export const walkLeg = (a: Point | null, b: Point | null, tempo = 'Normalt') => {
  if (!a || !b) return { km: 0, minutes: 0 };
  const km = distance(a, b) * 1.3;
  return {
    km,
    minutes:
      km < 0.01
        ? 0
        : Math.max(
            1,
            Math.ceil((km / (tempo === 'Lugnt' ? 3.5 : tempo === 'Högt' ? 5.5 : 4.5)) * 60),
          ),
  };
};
export type TransportMode = 'walking' | 'mixed';
export function journeyLeg(
  a: Point | null,
  b: Point | null,
  tempo = 'Normalt',
  mode: TransportMode = 'walking',
  legs: WalkingLegs = {},
) {
  const walk = (a && b && legs[legKey(a, b, tempo)]) || walkLeg(a, b, tempo);
  // Planning allowance, not a timetable: includes access, waiting and transfer margin.
  const transit = a && b ? Math.ceil(20 + ((distance(a, b) * 1.4) / 20) * 60) : Infinity;
  return mode === 'mixed' && walk.minutes > transit
    ? { km: distance(a!, b!) * 1.4, minutes: transit, mode: 'transit' }
    : { ...walk, mode: 'walking' };
}
export function plan<T extends Stop>(input: {
  candidates: T[];
  origin: Point | null;
  destination: Point | null;
  start: number;
  deadline: number;
  tempo?: string;
  pinned?: (string | number)[];
  first?: string | number;
  extra?: Record<string, number>;
  buffer?: number;
  walkingLegs?: WalkingLegs;
  date?: string;
  transportMode?: TransportMode;
}) {
  const {
    origin,
    destination,
    start,
    deadline,
    tempo = 'Normalt',
    pinned = [],
    extra = {},
    buffer = 15,
  } = input;
  // Never present disconnected stops as a complete journey.
  if (!origin || !destination)
    return {
      route: [] as Scheduled<T>[],
      arrival: start,
      transport: 0,
      km: 0,
      home: { km: 0, minutes: 0 },
      conflicts: [] as T[],
      omitted: [] as T[],
      margin: 0,
      buffer,
      feasible: false,
    };
  const pending = input.candidates.filter((p) => pointOf(p));
  const ordered: T[] = [];
  let cursor: Point | null = origin;
  while (pending.length) {
    let index =
      !ordered.length && input.first != null ? pending.findIndex((p) => p.id === input.first) : -1;
    if (index < 0) {
      index = 0;
      if (cursor)
        for (let i = 1; i < pending.length; i++) {
          if (distance(cursor, pointOf(pending[i])!) < distance(cursor, pointOf(pending[index])!))
            index = i;
        }
    }
    const next = pending.splice(index, 1)[0];
    ordered.push(next);
    cursor = pointOf(next);
  }
  const travel = (a: Point | null, b: Point | null) =>
    journeyLeg(a, b, tempo, input.transportMode, input.walkingLegs);
  function schedule(stops: T[]) {
    let time = start,
      from = origin,
      transport = 0,
      km = 0;
    const route: Scheduled<T>[] = [];
    const remaining = [...stops];
    const conflicts: T[] = [];
    function slot(p: T) {
      if (p.afterMeal && remaining.some((other) => other.meal === p.afterMeal)) return null;
      const leg = travel(from, pointOf(p));
      const minutes = Math.max(1, p.minutes + (extra[String(p.id)] || 0));
      let arrival = Math.max(time + leg.minutes, p.notBefore ?? -Infinity);
      const intervals = openingIntervals(p.openingHours, input.date);
      if (intervals !== null) {
        const interval = intervals.find(([a, b]) => Math.max(a, arrival) + minutes <= b);
        if (!interval) return null;
        arrival = Math.max(arrival, interval[0]);
      }
      if (
        arrival > (p.notAfter ?? Infinity) ||
        arrival + minutes > (p.finishBy ?? Infinity) ||
        (p.terminal && time + leg.minutes + buffer > arrival)
      )
        return null;
      return {
        ...p,
        minutes,
        arrival,
        departure: arrival + minutes,
        travelMinutes: leg.minutes,
        km: leg.km,
        travelMode: leg.mode,
        waitMinutes: arrival - time - leg.minutes,
        openingStatus:
          intervals === null ? 'Öppettider måste kontrolleras' : 'Inom registrerad öppettid',
      };
    }
    while (remaining.length) {
      const options = remaining.map(slot).filter((p): p is NonNullable<typeof p> => !!p);
      if (!options.length) {
        conflicts.push(...remaining);
        break;
      }
      options.sort(
        (a, b) =>
          Number(!!a.terminal) - Number(!!b.terminal) ||
          a.arrival - b.arrival ||
          a.travelMinutes - b.travelMinutes,
      );
      let next = options[0];
      const meal = options
        .filter((p) => p.meal)
        .sort((a, b) => (a.notBefore ?? 0) - (b.notBefore ?? 0))[0];
      if (
        meal &&
        !meal.terminal &&
        !next.meal &&
        next.departure + travel(pointOf(next), pointOf(meal)).minutes > meal.arrival
      )
        next = meal;
      // Protect time-bounded activities as well as meals before taking a flexible detour.
      const urgent = options
        .filter((p) => !p.terminal && (p.notAfter != null || p.finishBy != null))
        .sort(
          (a, b) =>
            Math.min(a.notAfter ?? Infinity, a.finishBy ?? Infinity) -
            Math.min(b.notAfter ?? Infinity, b.finishBy ?? Infinity),
        );
      for (const p of urgent) {
        if (p.id === next.id) continue;
        const arrival = next.departure + travel(pointOf(next), pointOf(p)).minutes;
        if (arrival > (p.notAfter ?? Infinity) || arrival + p.minutes > (p.finishBy ?? Infinity)) {
          next = p;
          break;
        }
      }
      if (!route.length && input.first != null)
        next = options.find((p) => p.id === input.first) || next;
      const p = next,
        minutes = p.minutes,
        arrival = p.arrival,
        leg = { minutes: p.travelMinutes, km: p.km };
      time = arrival + minutes;
      from = pointOf(p);
      transport += leg.minutes;
      km += leg.km;
      route.push(p);
      remaining.splice(
        remaining.findIndex((s) => s.id === p.id),
        1,
      );
    }
    const terminal = route.find((p) => p.terminal);
    if (terminal) {
      const arrival = terminal.arrival - buffer;
      return {
        route,
        arrival,
        transport,
        km,
        home: { km: 0, minutes: 0, mode: 'walking' },
        conflicts,
      };
    }
    const home = travel(from, destination);
    transport += home.minutes;
    km += home.km;
    return { route, arrival: time + home.minutes, transport, km, home, conflicts };
  }
  let result = schedule(ordered);
  const omitted: T[] = [];
  while (result.arrival + buffer > deadline) {
    const index = ordered.findLastIndex((p) => !pinned.includes(p.id));
    if (index < 0) break;
    omitted.unshift(...ordered.splice(index, 1));
    result = schedule(ordered);
  }
  return {
    ...result,
    omitted: [...omitted, ...result.conflicts.filter((p) => !pinned.includes(p.id))],
    margin: deadline - result.arrival,
    buffer,
    feasible:
      result.arrival + buffer <= deadline && !result.conflicts.some((p) => pinned.includes(p.id)),
  };
}
export const directions = (origin: Point | null, destination: Point | null, mode = 'walking') =>
  destination
    ? `https://www.google.com/maps/dir/?api=1${origin ? `&origin=${origin.lat},${origin.lon}` : ''}&destination=${destination.lat},${destination.lon}&travelmode=${mode}`
    : '#';
