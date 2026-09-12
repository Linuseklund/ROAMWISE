import { timeMinutes } from './planner';
export type MealPreference = {
  area?: string;
  food?: string;
  strict?: boolean;
  placeId?: string;
  placeName?: string;
  atDestination?: boolean;
};
export type MealPreferences = Record<string, MealPreference>;
export type ActivityPreference = { area?: string; period?: string };
export type ActivityPreferences = Record<string, ActivityPreference>;
export function matchesArea(p: { area?: string; title?: string; name?: string }, area = '') {
  return (
    !area ||
    area === 'Längs rutten' ||
    `${p.area || ''} ${p.title || p.name || ''}`.toLowerCase().includes(area.toLowerCase())
  );
}
export function matchesFood(
  p: { description?: string; details?: string[]; cuisine?: string },
  food = '',
) {
  if (!food || food === 'Alla') return true;
  const text =
    `${p.description || ''} ${(p.details || []).join(' ')} ${p.cuisine || ''}`.toLowerCase();
  return food === 'Grönt & lätt'
    ? /grönt & lätt|vegetari|vegan|salad|sallad/.test(text)
    : text.includes(food.toLowerCase());
}
export function activityWindows<
  T extends {
    category: string;
    notBefore?: number;
    notAfter?: number;
    finishBy?: number;
    afterMeal?: string;
  },
>(places: T[], preferences: ActivityPreferences, meals: Record<string, string>) {
  const lunch = meals.Lunch ? timeMinutes(meals.Lunch) : 780;
  return places.map((p) => {
    const period = preferences[p.category]?.period;
    return {
      ...p,
      afterMeal: period === 'Efter lunch' ? 'Lunch' : p.afterMeal,
      notBefore: period === 'Efter lunch' ? Math.max(p.notBefore ?? 0, lunch + 60) : p.notBefore,
      finishBy: period === 'Före lunch' ? Math.min(p.finishBy ?? Infinity, lunch) : p.finishBy,
    };
  });
}
