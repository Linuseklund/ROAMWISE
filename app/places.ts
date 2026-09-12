import type { CatalogPlace } from './catalog';
import type { Place } from './types';

/** Default visit length when the catalogue does not say. */
export const defaultVisitMinutes = (category: string) =>
  category === 'Restauranger' ? 70 : category === 'Museum' ? 75 : 45;

/** Turns a catalogue entry into a stop the planner can schedule. */
export const toRoutePlace = (p: CatalogPlace): Place => ({
  id: p.id,
  time: '',
  minutes: p.visitMinutes ?? defaultVisitMinutes(p.category),
  category: p.category,
  title: p.name,
  area: p.area,
  description: p.details.join(' · '),
  meta: `${p.address} · ${p.source}`,
  action: 'Plats & öppettider',
  cuisine: p.cuisine,
  lat: p.lat,
  lon: p.lon,
  website: p.website,
  openingHours: p.openingHours,
  mealTypes: p.mealTypes,
});
