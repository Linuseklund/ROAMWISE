// Turns the visitor's wishes into a list of candidate stops. Pure apart from the injected
// geocoder and catalogue clients, so the selection rules can be tested without a browser.
import type { CatalogPlace } from './catalog';
import { ROUTE_AREA, areaDistrict, areaPoint, cityAreas, cityDistricts } from './cities';
import { matchesArea, type ActivityPreferences, type MealPreferences } from './day-preferences';
import { geocode as defaultGeocode, searchCatalog as defaultSearchCatalog } from './geo-client';
import { categoryLabel } from './labels';
import type { MealTimes } from './meals';
import { toRoutePlace } from './places';
import { distance, pointOf, type Point } from './planner';
import type { Place, PlaceId } from './types';

export type RouteBuildInput = {
  city: string;
  address: string;
  endAddress: string;
  startPoint: Point | null;
  endPoint: Point | null;
  selected: string[];
  chosenPlaces: CatalogPlace[];
  mealPreferences: MealPreferences;
  activityPreferences: ActivityPreferences;
  categoryPreferences: Record<string, string[]>;
  mealTimes: MealTimes;
  excludedIds: PlaceId[];
};

export type RouteBuildDeps = {
  geocode: typeof defaultGeocode;
  searchCatalog: typeof defaultSearchCatalog;
};

export type RouteBuildResult = {
  origin: Point;
  destination: Point;
  picked: Place[];
  /** Restaurant confirmed for a dinner at the destination, to be pinned and remembered. */
  dinner?: CatalogPlace;
  locationWarning: string;
  routeWarning: string;
};

const RESTAURANTS = 'Restauranger';
const RESTAURANT_SUGGESTIONS = 24;

export async function buildRoute(
  input: RouteBuildInput,
  deps: RouteBuildDeps = { geocode: defaultGeocode, searchCatalog: defaultSearchCatalog },
): Promise<RouteBuildResult> {
  const { city, chosenPlaces, mealPreferences, activityPreferences, categoryPreferences } = input;
  const locationWarnings: string[] = [];
  let destinationPlace: CatalogPlace | undefined;

  const dinnerAtDestination = !!mealPreferences.Middag?.atDestination;
  const dinnerChosen = chosenPlaces.some((p) => p.id === mealPreferences.Middag?.placeId);

  const resolve = async (value: string, point: Point | null, isEnd = false) => {
    // A dinner at the destination needs the geocoder's view of the address so that a saved
    // restaurant can be recognised, even when the point is already known.
    if (point && !(isEnd && dinnerAtDestination && !dinnerChosen)) return point;
    const hits = await deps.geocode(value + ', ' + city);
    const hit = hits[0];
    if (!hit)
      throw new Error('Adressen hittades inte. Kontrollera adressen eller välj den på kartan.');
    if (hit.warning) locationWarnings.push(hit.warning);
    if (isEnd && hit.place) destinationPlace = hit.place;
    return { lat: Number(hit.lat), lon: Number(hit.lon) };
  };

  const [origin, destination] = await Promise.all([
    resolve(input.address, input.startPoint),
    resolve(input.endAddress, input.endPoint, true),
  ]);

  const picked: Place[] = chosenPlaces.map(toRoutePlace);
  let dinner: CatalogPlace | undefined;
  if (dinnerAtDestination) {
    dinner = chosenPlaces.find((p) => p.id === mealPreferences.Middag?.placeId) || destinationPlace;
    if (!dinner)
      throw new Error(
        'Välj middagsrestaurangen med knappen Välj restaurang för middag. En adress ensam räcker inte för att kontrollera måltid och öppettider.',
      );
    const dinnerPoint = pointOf(toRoutePlace(dinner));
    if (!dinnerPoint || distance(dinnerPoint, destination) > 0.25)
      throw new Error(
        'Middagsrestaurangen ligger inte vid slutadressen. Ändra slutadressen eller välj rätt restaurang.',
      );
    if (!picked.some((p) => p.id === dinner!.id)) picked.push(toRoutePlace(dinner));
  }

  // Categories the visitor asked for but has not filled with named places themselves.
  const needed = input.selected.filter(
    (category) =>
      chosenPlaces.filter((p) => p.category === category).length <
      (category === RESTAURANTS ? Math.max(1, Object.keys(input.mealTimes).length) : 1),
  );
  const warnings: string[] = [],
    limited: string[] = [];
  const centers =
    distance(origin, destination) > 1
      ? [
          origin,
          {
            lat: (origin.lat + destination.lat) / 2,
            lon: (origin.lon + destination.lon) / 2,
          },
          destination,
        ]
      : [origin];
  const knownAreas = cityAreas(city);
  const wholeCity = cityDistricts(city)[0];
  const search = (center: Point, category: string, options: string, borough?: string) =>
    deps.searchCatalog(
      new URLSearchParams({
        city,
        category,
        options,
        borough: borough || wholeCity,
        sort: 'near',
        origin: JSON.stringify(center),
        radius: '3',
        purpose: 'route',
      }),
      { reserveFallback: true },
    );

  const results = await Promise.allSettled(
    needed.map(async (category) => {
      const activityArea = activityPreferences[category]?.area;
      const pinnedToArea =
        !!activityArea && activityArea !== ROUTE_AREA && knownAreas.includes(activityArea);
      const searchCenters = pinnedToArea ? [areaPoint(city, activityArea) ?? origin] : centers;
      const mealSearches =
        category === RESTAURANTS
          ? Object.values(mealPreferences)
              .filter((p) => p.area || p.food)
              .map((p) => ({
                center: areaPoint(city, p.area) || origin,
                options: p.food === 'Grönt & lätt' ? 'Vegetariskt|Veganskt' : p.food || 'Alla',
                borough: areaDistrict(city, p.area),
              }))
          : [];
      const searches = [
        ...mealSearches,
        ...searchCenters.map((center) => ({
          center,
          options: (categoryPreferences[category] || ['Alla']).join('|'),
          borough: areaDistrict(city, activityArea),
        })),
      ];
      const batches = await Promise.allSettled(
        searches.map(({ center, options, borough }) => search(center, category, options, borough)),
      );
      const items: CatalogPlace[] = [];
      let warning = false;
      for (const batch of batches) {
        if (batch.status === 'rejected') {
          warning = true;
          continue;
        }
        warning ||= !!batch.value.warning;
        for (const p of batch.value.items || [])
          if (!items.some((old) => old.id === p.id)) items.push(p);
      }
      if (!items.length) throw new Error('Inga förslag längs sträckan.');
      return { items, warning };
    }),
  );

  results.forEach((result, index) => {
    const category = needed[index];
    if (result.status === 'rejected') {
      warnings.push(categoryLabel(category));
      return;
    }
    const available = result.value.items.filter(
      (p) =>
        (category === RESTAURANTS || matchesArea(p, activityPreferences[category]?.area)) &&
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lon) &&
        !picked.some((old) => old.id === p.id) &&
        !input.excludedIds.includes(p.id),
    );
    if (!available.length) warnings.push(categoryLabel(category));
    else if (result.value.warning) limited.push(categoryLabel(category));
    picked.push(
      ...available
        .slice(0, category === RESTAURANTS ? RESTAURANT_SUGGESTIONS : 1)
        .map(toRoutePlace),
    );
  });

  if (!picked.length)
    throw new Error(
      'Inga platser kunde hämtas. Prova igen eller sök enskilda platser i katalogen. Dina tidigare val är kvar.',
    );

  const routeWarning = [
    limited.length
      ? 'Begränsat underlag eller reservutbud används för ' +
        limited.join(', ') +
        '. Kontrollera platsernas uppgifter före besöket.'
      : '',
    warnings.length ? 'Förslag saknas för ' + warnings.join(', ') + '. Övriga stopp visas.' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    origin,
    destination,
    picked,
    dinner,
    locationWarning: locationWarnings.join(' '),
    routeWarning,
  };
}
