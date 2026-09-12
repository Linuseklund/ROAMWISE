import { matchesArea, matchesFood, type MealPreferences } from './day-preferences';
import { openingIntervals } from './opening';
import { distance, type Point } from './planner';
export type MealTimes = Record<string, string>;
export const defaultMeals: MealTimes = { Frukost: '09:00', Lunch: '12:30', Middag: '18:00' };
type Food = {
  id: string | number;
  category: string;
  minutes: number;
  openingHours?: string;
  mealTypes?: string[];
  lat?: number;
  lon?: number;
  area?: string;
  description?: string;
  notBefore?: number;
  notAfter?: number;
  terminal?: boolean;
};
export function withMeals<T extends Food>(
  places: T[],
  meals: MealTimes,
  start: number,
  date?: string,
  locked: { id: string | number; meal?: string }[] = [],
  journey?: { origin: Point; destination: Point },
  preferences: MealPreferences = {},
) {
  const entries = Object.entries(meals)
    .filter(([meal, time]) => meal in defaultMeals && time)
    .map(([meal, time]) => {
      const [h, m] = time.split(':').map(Number);
      let minute = h * 60 + m;
      if (start >= 18 * 60 && minute < start) minute += 1440;
      return { meal, minute };
    })
    .sort((a, b) => a.minute - b.minute);
  const food = places.filter((p) => p.category === 'Restauranger').slice(0, 24);
  const assignments = new Map<string | number, (typeof entries)[number]>();
  for (const p of locked) {
    const slot = entries.find((e) => e.meal === p.meal);
    if (slot) assignments.set(p.id, slot);
  }
  for (const slot of entries) {
    const pref = preferences[slot.meal];
    if (pref?.placeId) {
      const p = food.find((p) => String(p.id) === pref.placeId);
      if (p) assignments.set(p.id, slot);
    }
  }
  const pending = entries.filter(
    (e) => !locked.some((p) => p.meal === e.meal) && !preferences[e.meal]?.placeId,
  );
  let best = new Map(assignments),
    bestScore = -Infinity;
  function search(index: number, score: number) {
    if (index === pending.length) {
      if (score > bestScore) {
        bestScore = score;
        best = new Map(assignments);
      }
      return;
    }
    const slot = pending[index];
    for (const p of food) {
      const pref = preferences[slot.meal] || {};
      if (!matchesArea(p, pref.area) || !matchesFood(p, pref.food)) continue;
      if (assignments.has(p.id) || (p.mealTypes && !p.mealTypes.includes(slot.meal))) continue;
      const intervals = openingIntervals(p.openingHours, date);
      if (
        intervals !== null &&
        !intervals.some(
          ([a, b]) =>
            Math.max(start, slot.minute, a) <= slot.minute + (pref.strict ? 0 : 90) &&
            Math.max(start, slot.minute, a) + p.minutes <= b,
        )
      )
        continue;
      const fraction = slot.meal === 'Frukost' ? 0 : slot.meal === 'Middag' ? 1 : 0.5;
      const target = journey
        ? {
            lat: journey.origin.lat + (journey.destination.lat - journey.origin.lat) * fraction,
            lon: journey.origin.lon + (journey.destination.lon - journey.origin.lon) * fraction,
          }
        : null;
      const penalty =
        target && Number.isFinite(p.lat) && Number.isFinite(p.lon)
          ? Math.min(20, distance(target, { lat: p.lat!, lon: p.lon! }) * 4)
          : 0;
      assignments.set(p.id, slot);
      search(index + 1, score + 100 + (intervals ? 5 : 0) + (p.mealTypes ? 5 : 0) - penalty);
      assignments.delete(p.id);
    }
    search(index + 1, score);
  }
  search(0, 0);
  return places.map((p) => {
    const slot = best.get(p.id);
    return {
      ...p,
      meal: slot?.meal,
      notBefore: slot?.minute ?? p.notBefore,
      notAfter: slot ? slot.minute + (preferences[slot.meal]?.strict ? 0 : 90) : p.notAfter,
      terminal: !!(slot && preferences[slot.meal]?.atDestination),
    };
  });
}
