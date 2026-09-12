import type { CatalogPlace } from './catalog';
import type { ActivityPreferences, MealPreferences } from './day-preferences';
import type { MealTimes } from './meals';
import type { Point, Scheduled, TransportMode, plan } from './planner';

export type PlaceId = number | string;

/** A stop as the planner sees it: catalogue data plus scheduling hints. */
export type Place = {
  id: PlaceId;
  time: string;
  minutes: number;
  category: string;
  title: string;
  area: string;
  description: string;
  meta: string;
  action?: string;
  price?: string;
  cuisine?: string;
  lat?: number;
  lon?: number;
  openingHours?: string;
  website?: string;
  tags?: Record<string, string>;
  mealTypes?: string[];
  terminal?: boolean;
  finishBy?: number;
  afterMeal?: string;
  meal?: string;
  notBefore?: number;
  notAfter?: number;
};

export type ScheduledPlace = Scheduled<Place>;
export type Schedule = ReturnType<typeof plan<Place>>;

/** The visit currently in progress in guide mode. */
export type Arrival = {
  id: PlaceId;
  at: number;
  until: number;
  travelMinutes: number;
  km: number;
};

/** Everything needed to put a removed stop back. */
export type UndoRecord = {
  place: Place;
  chosen?: CatalogPlace;
  pinned: boolean;
  wasFirst: boolean;
};

export type MapPickTarget = 'start' | 'end';

/** Everything that is saved for a visitor and restored on the next visit. */
export type SavedTrip = {
  version: 1;
  mealPreferences?: MealPreferences;
  activityPreferences?: ActivityPreferences;
  transportMode?: TransportMode;
  locationError?: string;
  city?: string;
  address?: string;
  endAddress?: string;
  startDate?: string;
  startTime?: string;
  endTime?: string;
  timeZone?: string;
  selected?: string[];
  price?: string;
  mealTimes?: MealTimes;
  routeSource?: Place[];
  chosenPlaces?: CatalogPlace[];
  startPoint?: Point | null;
  endPoint?: Point | null;
  routeLive?: boolean;
  excludedIds?: PlaceId[];
  categoryPreferences?: Record<string, string[]>;
  tempo?: string;
  pinnedIds?: PlaceId[];
  extraMinutes?: Record<string, number>;
  completed?: ScheduledPlace[];
  guideOrigin?: Point | null;
  guideMinute?: number | null;
  clockAnchor?: number | null;
  clockBase?: number | null;
  firstId?: PlaceId;
  arrived?: Arrival | null;
  gpsOrigin?: Point | null;
};

export type { Point };
