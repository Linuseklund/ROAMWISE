import { subwayStations } from "./subway-stations";

export type LatLon = { lat: number; lon: number };
export type Station = { name: string; routes: string[]; lat: number; lon: number };

export const stations: Station[] = subwayStations.map(([name, routes, lat, lon]) => ({ name, routes: routes.split(" "), lat, lon }));

export const routeColors: Record<string, { bg: string; fg: string }> = (() => {
  const colors: Record<string, { bg: string; fg: string }> = {};
  const set = (routes: string, bg: string, fg = "#fff") => routes.split("").forEach((r) => (colors[r] = { bg, fg }));
  set("123", "#EE352E"); set("456", "#00933C"); set("7", "#B933AD"); set("ACE", "#0039A6");
  set("BDFM", "#FF6319"); set("G", "#6CBE45"); set("JZ", "#996633"); set("L", "#A7A9AC");
  set("NQRW", "#FCCC0A", "#111"); set("S", "#808183");
  colors.SIR = { bg: "#0039A6", fg: "#fff" };
  return colors;
})();

/** Great-circle distance in km. */
export function km(a: LatLon, b: LatLon) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(x));
}

// Rough NYC assumptions: street grid adds ~30 % to walking distance, 80 m/min on foot,
// trains average ~25 km/h including stops, plus a typical wait and transfer time.
const WALK_FACTOR = 1.3, WALK_KM_PER_MIN = 0.08, RIDE_FACTOR = 1.2, RIDE_KM_PER_MIN = 0.42, WAIT = 5, TRANSFER = 4;
export const walkMinutes = (a: LatLon, b: LatLon) => Math.max(1, Math.round((km(a, b) * WALK_FACTOR) / WALK_KM_PER_MIN));
const rideMinutes = (a: LatLon, b: LatLon) => Math.max(2, Math.round((km(a, b) * RIDE_FACTOR) / RIDE_KM_PER_MIN));

export function nearestStations(point: LatLon, count = 3, maxKm = 1.6) {
  return stations
    .map((station) => ({ station, km: km(point, station) }))
    .filter((s) => s.km <= maxKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, count)
    .map((s) => s.station);
}

export type Step =
  | { kind: "walk"; to: string; minutes: number }
  | { kind: "ride"; routes: string[]; from: Station; to: Station; minutes: number }
  | { kind: "transfer"; at: Station };

export type Journey = { minutes: number; steps: Step[]; walkOnly: boolean };

/**
 * Suggests a subway journey with at most one transfer. Station-to-station times
 * are estimates; the UI links to a live planner for exact departures.
 */
export function planSubway(origin: LatLon, destination: LatLon, destinationName: string): Journey {
  const walkAll = walkMinutes(origin, destination);
  const walkOnly: Journey = { minutes: walkAll, walkOnly: true, steps: [{ kind: "walk", to: destinationName, minutes: walkAll }] };
  if (walkAll <= 15) return walkOnly;

  const starts = nearestStations(origin, 4);
  const ends = nearestStations(destination, 3);
  let best: Journey | null = null;
  const consider = (journey: Journey) => { if (!best || journey.minutes < best.minutes) best = journey; };

  for (const from of starts) {
    for (const to of ends) {
      if (from === to) continue;
      const walkIn = walkMinutes(origin, from), walkOut = walkMinutes(to, destination);
      const direct = from.routes.filter((r) => to.routes.includes(r));
      if (direct.length) {
        const ride = rideMinutes(from, to);
        consider({ minutes: walkIn + WAIT + ride + walkOut, walkOnly: false, steps: [
          { kind: "walk", to: from.name, minutes: walkIn },
          { kind: "ride", routes: direct, from, to, minutes: ride },
          { kind: "walk", to: destinationName, minutes: walkOut },
        ] });
        continue;
      }
      for (const hub of stations) {
        if (hub === from || hub === to) continue;
        const first = from.routes.filter((r) => hub.routes.includes(r));
        const second = hub.routes.filter((r) => to.routes.includes(r) && !first.includes(r));
        if (!first.length || !second.length) continue;
        const legA = rideMinutes(from, hub), legB = rideMinutes(hub, to);
        consider({ minutes: walkIn + WAIT + legA + TRANSFER + legB + walkOut, walkOnly: false, steps: [
          { kind: "walk", to: from.name, minutes: walkIn },
          { kind: "ride", routes: first, from, to: hub, minutes: legA },
          { kind: "transfer", at: hub },
          { kind: "ride", routes: second, from: hub, to, minutes: legB },
          { kind: "walk", to: destinationName, minutes: walkOut },
        ] });
      }
    }
  }
  const found = best as Journey | null;
  return found && found.minutes < walkAll ? found : walkOnly;
}

export const transitLinks = (origin: LatLon | null, store: { name: string; address: string; lat: number; lon: number }) => {
  const destination = encodeURIComponent(`${store.name}, ${store.address}`);
  const from = origin ? `${origin.lat},${origin.lon}` : "";
  return {
    google: `https://www.google.com/maps/dir/?api=1${from ? `&origin=${from}` : ""}&destination=${destination}&travelmode=transit`,
    apple: `https://maps.apple.com/?${from ? `saddr=${from}&` : ""}daddr=${store.lat},${store.lon}&dirflg=r`,
    place: `https://www.google.com/maps/search/?api=1&query=${destination}`,
  };
};
