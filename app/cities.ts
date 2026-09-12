import type { Point } from './planner';

/** Preference value meaning "no particular neighbourhood, keep it along the route". */
export const ROUTE_AREA = 'Längs rutten';

export type CityArea = {
  name: string;
  /** Search centre for the neighbourhood. When omitted the visitor's start point is used. */
  point?: Point;
  /** Catalogue district (borough) the neighbourhood belongs to, when the city has districts. */
  district?: string;
};

export type CityLandmark = {
  point: Point;
  label: string;
  /**
   * Resolve this name before asking the geocoder at all. Used for neighbourhood names that
   * geocoders place badly. Everything else is only used when the geocoder is unavailable.
   */
  preferred?: boolean;
  warning?: string;
};

export type CityConfig = {
  key: string;
  label: string;
  /** Lower-case spellings accepted in the free-text city field. */
  aliases: string[];
  timeZone: string;
  /** Districts offered for catalogue filtering. The first entry means the whole city. */
  districts: string[];
  /** Neighbourhoods a visitor can pin a meal or an activity to. */
  areas: CityArea[];
  /** Exact landmark or neighbourhood names. Never street addresses. */
  landmarks: Record<string, CityLandmark>;
  /** Extra words stripped from the end of an address before matching saved places. */
  addressSuffixes: string[];
  /** Query sent to the geocoder for the city or one of its districts. */
  geocode: (district?: string) => string;
};

const simpleCity = (
  key: string,
  label: string,
  timeZone: string,
  aliases: string[] = [label.toLowerCase()],
): CityConfig => ({
  key,
  label,
  aliases,
  timeZone,
  districts: [`Hela ${label}`],
  areas: [],
  landmarks: {},
  addressSuffixes: [],
  geocode: () => label,
});

const NEW_YORK_ALL = 'Hela New York';

export const newYork: CityConfig = {
  key: 'new-york',
  label: 'New York',
  aliases: ['new york', 'new york city', 'nyc'],
  timeZone: 'America/New_York',
  districts: [NEW_YORK_ALL, 'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'],
  areas: [
    { name: 'Williamsburg', point: { lat: 40.7178, lon: -73.958 }, district: 'Brooklyn' },
    { name: 'Brooklyn', district: 'Brooklyn' },
    { name: 'Manhattan', point: { lat: 40.754, lon: -73.984 }, district: 'Manhattan' },
    { name: 'Harlem', point: { lat: 40.8081, lon: -73.9448 }, district: 'Manhattan' },
  ],
  landmarks: {
    williamsburg: {
      point: { lat: 40.7178, lon: -73.958 },
      label: 'Williamsburg · Bedford Avenue',
      preferred: true,
      warning:
        'Williamsburg är ett område. Startpunkten är ungefärlig vid Bedford Avenue; välj din adress för en exakt start.',
    },
    'times square': {
      point: { lat: 40.758, lon: -73.9855 },
      label: 'Times Square · ungefärlig punkt på torget',
    },
    'lower east side': {
      point: { lat: 40.7186, lon: -73.988 },
      label: 'Lower East Side · ungefärlig områdespunkt vid Delancey/Essex',
    },
  },
  addressSuffixes: ['usa'],
  geocode: (district) =>
    !district || district === NEW_YORK_ALL
      ? 'New York City, New York, USA'
      : `${district}, New York City, New York, USA`,
};

export const cities: CityConfig[] = [
  newYork,
  simpleCity('barcelona', 'Barcelona', 'Europe/Madrid'),
  simpleCity('stockholm', 'Stockholm', 'Europe/Stockholm'),
  simpleCity('paris', 'Paris', 'Europe/Paris'),
  simpleCity('london', 'London', 'Europe/London'),
  simpleCity('tokyo', 'Tokyo', 'Asia/Tokyo'),
];

const normalize = (value: string) => value.trim().toLowerCase();

/** Configuration for a city typed into the city field, if we know it. */
export function cityConfig(city: string): CityConfig | undefined {
  const name = normalize(city);
  return cities.find((c) => c.aliases.includes(name));
}

export const isNewYork = (city: string) => cityConfig(city)?.key === newYork.key;

export function cityZone(city: string): string | undefined {
  return cityConfig(city)?.timeZone;
}

/** Districts for catalogue filtering. Always at least the "whole city" entry. */
export function cityDistricts(city: string): string[] {
  return cityConfig(city)?.districts ?? [`Hela ${city.trim() || 'staden'}`];
}

/** Area choices for meal and activity preferences, starting with "along the route". */
export function cityAreas(city: string): string[] {
  return [ROUTE_AREA, ...(cityConfig(city)?.areas.map((a) => a.name) ?? [])];
}

export function areaPoint(city: string, area?: string): Point | undefined {
  return cityConfig(city)?.areas.find((a) => a.name === area)?.point;
}

export function areaDistrict(city: string, area?: string): string | undefined {
  if (!area || area === ROUTE_AREA) return undefined;
  return cityConfig(city)?.areas.find((a) => a.name === area)?.district ?? area;
}

/** What to ask the geocoder for when locating a city or one of its districts. */
export function geocodeLocation(city: string, district?: string): string {
  const config = cityConfig(city);
  return config ? config.geocode(district) : city;
}

/** Words that identify a city inside a free-text address. */
function cityWords(config: CityConfig) {
  return [
    ...config.aliases,
    ...config.districts.slice(1).map(normalize),
    ...config.areas.map((a) => normalize(a.name)),
  ];
}

/** The city an address seems to belong to, judged by the words it contains. */
export function cityFromAddress(address: string): CityConfig | undefined {
  const text = normalize(address);
  return cities.find((c) => cityWords(c).some((word) => text.includes(word)));
}

/** An address with trailing city, district and country words removed, for exact-name lookups. */
export function stripCityWords(address: string, config: CityConfig): string {
  const words = [...cityWords(config), ...config.addressSuffixes]
    .sort((a, b) => b.length - a.length)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const suffix = new RegExp(`(?:,\\s*(?:${words.join('|')}))+$`);
  return normalize(address).replace(/,+/g, ',').replace(suffix, '').trim();
}

export function landmark(config: CityConfig, name: string): CityLandmark | undefined {
  return config.landmarks[normalize(name)];
}
