'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import CatalogBrowser from './catalog-browser';
import {
  categoryDefinitions,
  matchesCategory,
  type CatalogPlace,
  type CategoryDefinition,
} from './catalog';
import { cityZone } from './cities';
import {
  CategoryPickerDialog,
  MapPickerDialog,
  PlaceDialog,
  RouteMapDialog,
  TaxiDialog,
} from './components/dialogs';
import { GuidePanel } from './components/guide-panel';
import {
  OmittedStops,
  RouteActions,
  RouteNote,
  TimelineEdge,
  TipsSection,
  UndoBanner,
} from './components/itinerary-bits';
import { MapPanel } from './components/map-panel';
import { PlannerForm } from './components/planner-form';
import { RouteHeader } from './components/route-header';
import { RouteList } from './components/route-list';
import { ScheduleStatus } from './components/schedule-status';
import { ExploreSection, MobileTabs, SiteFooter, SiteHeader } from './components/site-chrome';
import { TripSaveBar } from './components/trip-save-bar';
import {
  activityWindows,
  matchesArea,
  type ActivityPreferences,
  type MealPreferences,
} from './day-preferences';
import { reverseCoordinates, searchCatalog } from './geo-client';
import { mapPickerDocument, routeMapDocument } from './map-documents';
import { defaultMeals, withMeals, type MealTimes } from './meals';
import { toRoutePlace } from './places';
import {
  directions,
  distance,
  journeyLeg,
  plan,
  pointOf,
  timeLabel,
  timeMinutes,
  tripMinutes,
  type Point,
  type TransportMode,
} from './planner';
import { buildRoute } from './route-builder';
import { localClock, minuteOnTrip } from './trip-time';
import type { Arrival, MapPickTarget, Place, PlaceId, ScheduledPlace, UndoRecord } from './types';
import { useGuideClock } from './use-guide-clock';
import { useMapPick } from './use-map-pick';
import { useMobileDialogs } from './use-mobile-dialogs';
import { useTripSave } from './use-trip-save';
import { useWalkingPaths } from './use-walking-paths';
import type { WalkingLegs } from './walking';

const DEFAULT_CITY = 'New York';
const DEFAULT_ZONE = 'America/New_York';
const DEFAULT_ADDRESS = 'Bryant Park, New York';
const DEFAULT_POINT: Point = { lat: 40.7536, lon: -73.9832 };
const RESTAURANTS = 'Restauranger';
const SEARCH_RADIUS_KM = '3';

export default function Home() {
  // Where and when
  const [city, setCity] = useState(DEFAULT_CITY);
  const [address, setAddress] = useState(DEFAULT_ADDRESS);
  const [endAddress, setEndAddress] = useState(DEFAULT_ADDRESS);
  const [timeZone, setTimeZone] = useState(DEFAULT_ZONE);
  const [startDate, setStartDate] = useState('');
  useEffect(() => {
    // The date depends on the visitor's clock, so it is filled in after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStartDate(localClock(DEFAULT_ZONE).date);
  }, []);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('21:00');
  const [startPoint, setStartPoint] = useState<Point | null>(DEFAULT_POINT);
  const [endPoint, setEndPoint] = useState<Point | null>(DEFAULT_POINT);

  // What
  const [selected, setSelected] = useState([RESTAURANTS, 'Klädbutiker', 'Museum', 'Sevärdheter']);
  const [categoryPreferences, setCategoryPreferences] = useState<Record<string, string[]>>({
    Restauranger: ['Alla'],
    Klädbutiker: ['Alla'],
    Museum: ['Alla'],
    Utställningar: ['Alla'],
    Sevärdheter: ['Alla'],
    Konserter: ['Alla'],
    Sneakers: [],
    Nattklubbar: [],
    Butiker: [],
  });
  const [mealPreferences, setMealPreferences] = useState<MealPreferences>({});
  const [activityPreferences, setActivityPreferences] = useState<ActivityPreferences>({});
  const [mealTimes, setMealTimes] = useState<MealTimes>(defaultMeals);
  const [transportMode, setTransportMode] = useState<TransportMode>('walking');
  const [tempo, setTempo] = useState('Normalt');
  const [price, setPrice] = useState('Alla priser');
  const [chosenPlaces, setChosenPlaces] = useState<CatalogPlace[]>([]);
  const [pinnedIds, setPinnedIds] = useState<PlaceId[]>([]);
  const [excludedIds, setExcludedIds] = useState<PlaceId[]>([]);

  // The route
  const [routeSource, setRouteSource] = useState<Place[]>([]);
  const [routeLive, setRouteLive] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [planned, setPlanned] = useState(true);
  const [walkingLegs, setWalkingLegs] = useState<WalkingLegs>({});
  const [extraMinutes, setExtraMinutes] = useState<Record<string, number>>({});
  const [firstId, setFirstId] = useState<PlaceId | undefined>();
  const [active, setActive] = useState<PlaceId>(1);
  const [adjusting, setAdjusting] = useState(false);
  const [undo, setUndo] = useState<UndoRecord | null>(null);
  const [tips, setTips] = useState<Place[]>([]);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsNotice, setTipsNotice] = useState('');
  const tipRequest = useRef(0);

  // Guide mode
  const [guideStarted, setGuideStarted] = useState(false);
  const [clockAnchor, setClockAnchor] = useState<number | null>(null);
  const [clockBase, setClockBase] = useState<number | null>(null);
  const [guideMinute, setGuideMinute] = useState<number | null>(null);
  const [guideOrigin, setGuideOrigin] = useState<Point | null>(null);
  const [gpsOrigin, setGpsOrigin] = useState<Point | null>(null);
  const [completed, setCompleted] = useState<ScheduledPlace[]>([]);
  const [arrived, setArrived] = useState<Arrival | null>(null);
  const [guideNotice, setGuideNotice] = useState('');
  const [hungryLoading, setHungryLoading] = useState(false);
  const clockElapsed = useGuideClock(clockAnchor);

  // Dialogs and location
  const [categoryPicker, setCategoryPicker] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<string[]>(['Alla']);
  const [mealTarget, setMealTarget] = useState<string | null>(null);
  const [booking, setBooking] = useState<Place | null>(null);
  const [taxiOpen, setTaxiOpen] = useState(false);
  const [taxiPickup, setTaxiPickup] = useState('');
  const [taxiDestination, setTaxiDestination] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [mapPickerTarget, setMapPickerTarget] = useState<MapPickTarget | null>(null);
  const [mapPickLoading, setMapPickLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const clearTips = () => {
    tipRequest.current++;
    setTips([]);
    setTipsNotice('');
  };
  const resetGuide = () => {
    setGuideStarted(false);
    setUndo(null);
    setClockBase(null);
    setCompleted([]);
    setGuideMinute(null);
    setGuideOrigin(null);
    setClockAnchor(null);
    setExtraMinutes({});
    setFirstId(undefined);
    setGpsOrigin(null);
    setGuideNotice('');
    setArrived(null);
  };
  /** Any change to the inputs of the day makes the current route stale. */
  const invalidateRoute = () => {
    setExcludedIds([]);
    setRouteSource([]);
    setRouteLive(false);
    setLocationError('');
    clearTips();
    resetGuide();
  };

  // Derived plan
  const hours = useMemo(() => tripMinutes(startTime, endTime) / 60, [startTime, endTime]);
  const setTripLength = (minutes: number) => {
    const [hour, minute] = startTime.split(':').map(Number);
    const end = hour * 60 + minute + minutes;
    setEndTime(
      `${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`,
    );
  };
  const restaurantPreferences = categoryPreferences[RESTAURANTS] || ['Alla'];
  const journey = useMemo(
    () => (startPoint && endPoint ? { origin: startPoint, destination: endPoint } : undefined),
    [startPoint, endPoint],
  );
  const candidates = useMemo(() => {
    const isChosen = (place: Place) => chosenPlaces.some((p) => p.id === place.id);
    const withMealSlots = withMeals(
      routeSource.filter((p) => !excludedIds.includes(p.id)),
      selected.includes(RESTAURANTS) ? mealTimes : {},
      timeMinutes(startTime),
      startDate,
      completed,
      journey,
      mealPreferences,
    );
    return activityWindows(withMealSlots, activityPreferences, mealTimes)
      .filter((place) => !excludedIds.includes(place.id))
      .filter((place) => !completed.some((done) => done.id === place.id))
      .filter((place) => selected.includes(place.category))
      .filter(
        (place) =>
          place.category === RESTAURANTS ||
          matchesArea(place, activityPreferences[place.category]?.area),
      )
      .filter(
        (place) =>
          place.category !== RESTAURANTS ||
          place.meal ||
          !Object.keys(mealTimes).length ||
          isChosen(place),
      )
      .filter(
        (place) =>
          isChosen(place) ||
          ((!place.tags ||
            matchesCategory(place.tags, place.category, categoryPreferences[place.category])) &&
            (!place.price || price === 'Alla priser' || place.price === price)),
      );
  }, [
    routeSource,
    selected,
    categoryPreferences,
    price,
    excludedIds,
    completed,
    chosenPlaces,
    mealTimes,
    startTime,
    startDate,
    journey,
    mealPreferences,
    activityPreferences,
  ]);
  const deadline = timeMinutes(startTime) + hours * 60;
  const guideNow =
    clockAnchor != null
      ? Math.max(
          guideMinute ?? timeMinutes(startTime),
          (clockBase ?? timeMinutes(startTime)) + clockElapsed,
        )
      : timeMinutes(startTime);
  const currentOrigin = gpsOrigin || guideOrigin || startPoint;
  const schedule = useMemo(
    () =>
      plan({
        candidates: candidates.map((p) =>
          arrived?.id === p.id ? { ...p, minutes: Math.max(1, arrived.until - guideNow) } : p,
        ),
        origin: currentOrigin,
        destination: endPoint,
        start: guideNow,
        deadline,
        tempo,
        transportMode,
        walkingLegs,
        date: startDate,
        pinned: [
          ...pinnedIds,
          ...candidates.filter((p) => p.meal).map((p) => p.id),
          ...(arrived ? [arrived.id] : []),
        ],
        first: arrived?.id ?? firstId,
        extra: arrived ? { ...extraMinutes, [String(arrived.id)]: 0 } : extraMinutes,
      }),
    [
      candidates,
      currentOrigin,
      endPoint,
      guideNow,
      deadline,
      tempo,
      pinnedIds,
      firstId,
      extraMinutes,
      arrived,
      walkingLegs,
      startDate,
      transportMode,
    ],
  );
  const missingMeals = selected.includes(RESTAURANTS)
    ? Object.keys(mealTimes).filter(
        (meal) =>
          !completed.some((p) => p.meal === meal) && !schedule.route.some((p) => p.meal === meal),
      )
    : [];
  const missingActivities = selected.filter(
    (c) =>
      c !== RESTAURANTS &&
      !completed.some((p) => p.category === c) &&
      !schedule.route.some((p) => p.category === c),
  );
  const route = useMemo(
    () => (journey ? [...completed, ...schedule.route] : []),
    [completed, schedule.route, journey],
  );
  const routePoints = useMemo(
    () =>
      (schedule.route.length
        ? [currentOrigin, ...schedule.route.map(pointOf), endPoint]
        : []
      ).filter((p): p is Point => !!p),
    [schedule.route, currentOrigin, endPoint],
  );
  const walking = useWalkingPaths(routePoints, tempo, walkingLegs, setWalkingLegs);
  const activeCategory = categoryDefinitions.find((c) => c.key === categoryPicker) || null;
  const totalPreferences = Object.values(categoryPreferences).reduce(
    (sum, values) => sum + (values.includes('Alla') ? 0 : values.length),
    0,
  );
  const routeKm = journey ? schedule.km + completed.reduce((sum, stop) => sum + stop.km, 0) : 0;
  const routeTime = (index: number) => timeLabel(route[index]?.arrival ?? schedule.arrival);
  const legInfo = (index: number) => ({
    km: route[index]?.km || 0,
    minutes: route[index]?.travelMinutes || 0,
    mode:
      route[index]?.travelMode === 'transit'
        ? 'min uppskattad lokaltrafik inkl. gång/väntan'
        : 'min uppskattad promenad',
  });
  const currentStop = schedule.route[0];
  const transportStop = arrived ? schedule.route[1] : currentStop;
  const nextDestination = transportStop ? pointOf(transportStop) : endPoint;
  const currentLeg = journeyLeg(currentOrigin, nextDestination, tempo, transportMode, walkingLegs);
  const currentNavigationUrl = directions(currentOrigin, nextDestination, currentLeg.mode);
  const transitUrl = directions(currentOrigin, nextDestination, 'transit');
  const canNavigate =
    route.length > 0 &&
    !!currentOrigin &&
    !!nextDestination &&
    distance(currentOrigin, nextDestination) > 0.01;
  const mapDocument = useMemo(
    () =>
      routeMapDocument(
        schedule.route,
        currentOrigin,
        endPoint,
        city,
        walkingLegs,
        tempo,
        completed.length,
      ),
    [schedule.route, currentOrigin, endPoint, city, walkingLegs, tempo, completed.length],
  );
  const addressPickerDocument = useMemo(
    () =>
      mapPickerDocument(
        mapPickerTarget === 'end' ? endPoint || startPoint : startPoint || endPoint,
        mapPickerTarget || 'start',
      ),
    [mapPickerTarget, startPoint, endPoint],
  );

  // Choosing places and categories
  const removeStop = (place: Place) => {
    setUndo({
      place,
      chosen: chosenPlaces.find((p) => p.id === place.id),
      pinned: pinnedIds.includes(place.id),
      wasFirst: firstId === place.id,
    });
    setChosenPlaces((items) => items.filter((p) => p.id !== place.id));
    if (arrived?.id === place.id) setArrived(null);
    setExcludedIds((ids) => [...new Set([...ids, place.id])]);
    setPinnedIds((ids) => ids.filter((id) => id !== place.id));
    setFirstId(undefined);
    setGuideNotice(`${place.title} hoppades över. Du kan ångra borttagningen.`);
  };
  const undoRemove = () => {
    if (!undo) return;
    const { place, chosen } = undo;
    setExcludedIds((ids) => ids.filter((id) => id !== place.id));
    setRouteSource((items) => (items.some((p) => p.id === place.id) ? items : [...items, place]));
    if (chosen)
      setChosenPlaces((items) =>
        items.some((p) => p.id === place.id) ? items : [...items, chosen],
      );
    if (undo.pinned) setPinnedIds((ids) => [...new Set([...ids, place.id])]);
    if (undo.wasFirst) setFirstId(place.id);
    setGuideNotice(`${place.title} är tillbaka i rutten.`);
    setUndo(null);
  };
  const addToSelected = (category: string) =>
    setSelected((items) => (items.includes(category) ? items : [...items, category]));
  const toggleCatalogPlace = (p: CatalogPlace, priority = true) => {
    if (mealTarget) {
      const meal = mealTarget;
      if (mealPreferences[meal]?.atDestination) {
        setEndAddress(p.name + ', ' + p.address);
        setEndPoint(pointOf(toRoutePlace(p)));
      }
      setMealPreferences((old) => ({
        ...old,
        [meal]: { ...old[meal], placeId: p.id, placeName: p.name },
      }));
      setChosenPlaces((old) => [...old.filter((v) => v.id !== p.id), p]);
      setPinnedIds((old) => [...new Set([...old, p.id])]);
      addToSelected(RESTAURANTS);
      setCategoryPicker(null);
      setMealTarget(null);
      invalidateRoute();
      return;
    }
    if (chosenPlaces.some((item) => item.id === p.id)) {
      removeStop(toRoutePlace(p));
    } else {
      setChosenPlaces((items) => [...items, p]);
      setRouteSource((items) => [...items.filter((item) => item.id !== p.id), toRoutePlace(p)]);
      setPinnedIds((ids) =>
        priority ? [...ids.filter((id) => id !== p.id), p.id] : ids.filter((id) => id !== p.id),
      );
      setExcludedIds((ids) => ids.filter((id) => id !== p.id));
      addToSelected(p.category);
    }
    setRouteLive(true);
  };
  const closeCategoryPicker = () => {
    setCategoryPicker(null);
    setMealTarget(null);
  };
  const openCategoryPicker = (category: CategoryDefinition) => {
    const saved = categoryPreferences[category.key];
    setCategoryDraft(saved?.length ? saved : ['Alla']);
    setCategoryPicker(category.key);
  };
  const toggleCategoryDraft = (option: string) =>
    setCategoryDraft((current) => {
      if (option === 'Alla') return ['Alla'];
      const withoutAll = current.filter((item) => item !== 'Alla');
      return withoutAll.includes(option)
        ? withoutAll.filter((item) => item !== option)
        : [...withoutAll, option];
    });
  const applyCategoryPicker = () => {
    if (!categoryPicker) return;
    const choices = categoryDraft.length ? categoryDraft : ['Alla'];
    setCategoryPreferences((current) => ({ ...current, [categoryPicker]: choices }));
    addToSelected(categoryPicker);
    closeCategoryPicker();
  };
  const removeCategory = () => {
    if (!categoryPicker) return;
    setSelected((current) => current.filter((item) => item !== categoryPicker));
    setCategoryPreferences((current) => ({ ...current, [categoryPicker]: [] }));
    closeCategoryPicker();
  };

  // Dialog behaviour and map picking
  useMobileDialogs(!!(categoryPicker || mapPickerTarget || booking || taxiOpen || mapOpen), () => {
    closeCategoryPicker();
    setMapPickerTarget(null);
    setBooking(null);
    setTaxiOpen(false);
    setMapOpen(false);
  });
  useMapPick(!!mapPickerTarget, async (point) => {
    setMapPickLoading(true);
    setLocationError('');
    try {
      let label = `Kartpunkt ${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`;
      try {
        label = (await reverseCoordinates(point.lat, point.lon)).label;
      } catch {
        // Keep the coordinate label; the point itself is still valid.
      }
      invalidateRoute();
      if (mapPickerTarget === 'start') {
        setAddress(label);
        setStartPoint(point);
      } else {
        setEndAddress(label);
        setEndPoint(point);
      }
      setMapPickerTarget(null);
    } catch {
      setLocationError('Platsen valdes, men adressen kunde inte läsas. Försök igen.');
    } finally {
      setMapPickLoading(false);
    }
  });
  const locateVisitor = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Din webbläsare kan inte dela aktuell position.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const point = { lat: coords.latitude, lon: coords.longitude };
        try {
          const resolved = await reverseCoordinates(point.lat, point.lon);
          setStartPoint(point);
          setAddress(resolved.label);
          if (clockAnchor != null) setGpsOrigin(point);
        } catch {
          setStartPoint(point);
          setAddress(`${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`);
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocationError(
          'Positionen kunde inte hämtas. Kontrollera platsbehörigheten och försök igen.',
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
    );
  };
  const updateGuideLocation = () => {
    if (!navigator.geolocation) {
      setGuideNotice('Position stöds inte i den här webbläsaren.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setGpsOrigin({ lat: coords.latitude, lon: coords.longitude });
        setLocating(false);
        setGuideNotice('Rutten räknades om från din position. Tryck igen om du har flyttat dig.');
      },
      () => {
        setLocating(false);
        setGuideNotice(
          'Positionen kunde inte hämtas. Tillåt platsåtkomst eller använd den planerade startpunkten.',
        );
      },
      { timeout: 12000, maximumAge: 30000, enableHighAccuracy: true },
    );
  };

  // Building the route
  const canBuild =
    planned &&
    !!city.trim() &&
    selected.length > 0 &&
    hours > 0 &&
    !!startDate &&
    !!address.trim() &&
    !!endAddress.trim();
  const createRoute = async () => {
    if (!canBuild) return;
    setPlanned(false);
    setRouteError('');
    clearTips();
    try {
      const result = await buildRoute({
        city,
        address,
        endAddress,
        startPoint,
        endPoint,
        selected,
        chosenPlaces,
        mealPreferences,
        activityPreferences,
        categoryPreferences,
        mealTimes,
        excludedIds,
      });
      setLocationError(result.locationWarning);
      if (result.dinner) {
        const dinner = result.dinner;
        setChosenPlaces((old) => [...old.filter((p) => p.id !== dinner.id), dinner]);
        setPinnedIds((old) => [...new Set([...old, dinner.id])]);
        setMealPreferences((old) => ({
          ...old,
          Middag: { ...old.Middag, placeId: dinner.id, placeName: dinner.name, strict: true },
        }));
      }
      setRouteError(result.routeWarning);
      setRouteSource([
        ...completed,
        ...result.picked.filter((p) => !completed.some((c) => c.id === p.id)),
      ]);
      setStartPoint(result.origin);
      setEndPoint(result.destination);
      setActive(result.picked[0].id);
      setRouteLive(true);
      setAdjusting(false);
    } catch (error) {
      setRouteSource([]);
      setRouteLive(false);
      setRouteError(
        error instanceof Error ? error.message : 'Rutten kunde inte uppdateras just nu.',
      );
    } finally {
      setPlanned(true);
      setTimeout(
        () => document.querySelector('#results')?.scrollIntoView({ behavior: 'smooth' }),
        80,
      );
    }
  };

  // Adjusting the plan
  const swapStop = (place: Place) => {
    const alternative = routeSource.find(
      (p) =>
        p.category === place.category &&
        p.id !== place.id &&
        !excludedIds.includes(p.id) &&
        !completed.some((c) => c.id === p.id) &&
        !route.some((r) => r.id === p.id),
    );
    if (!alternative) {
      setGuideNotice(
        'Inget ersättningsförslag finns just nu. Ditt stopp är kvar. Sök ett alternativ i platslistan.',
      );
      return;
    }
    removeStop(place);
    setExcludedIds((ids) => ids.filter((id) => id !== alternative.id));
    setFirstId(alternative.id);
    setGuideNotice(`Bytt till ${alternative.title}.`);
  };
  const setVisitMinutes = (place: Place, minutes: number) => {
    setExtraMinutes((values) => ({ ...values, [String(place.id)]: 0 }));
    setRouteSource((items) => items.map((p) => (p.id === place.id ? { ...p, minutes } : p)));
    setChosenPlaces((items) =>
      items.map((p) => (p.id === place.id ? { ...p, visitMinutes: minutes } : p)),
    );
  };
  const togglePin = (place: Place) =>
    setPinnedIds((ids) =>
      ids.includes(place.id) ? ids.filter((id) => id !== place.id) : [...ids, place.id],
    );
  const addTip = (tip: Place) => {
    setRouteSource((old) => [...old.filter((s) => s.id !== tip.id), tip]);
    addToSelected(tip.category);
    setTips([]);
    setTipsNotice('Stoppet är tillagt. Tiderna har räknats om.');
  };
  const findTips = async () => {
    if (!startPoint || !endPoint || !route.length || tipsLoading) return;
    const request = ++tipRequest.current;
    setTipsLoading(true);
    setTips([]);
    setTipsNotice('');
    try {
      const gap = schedule.route
        .filter((p) => (p.waitMinutes || 0) >= 30)
        .sort((a, b) => (b.waitMinutes || 0) - (a.waitMinutes || 0))[0];
      if (!gap) {
        setTipsNotice('Ingen lucka på minst 30 minuter. Behåll marginalen till nästa stopp.');
        return;
      }
      const index = schedule.route.findIndex((p) => p.id === gap.id);
      const origin = index ? pointOf(schedule.route[index - 1])! : startPoint;
      const categories = selected.filter((c) => c !== RESTAURANTS);
      const results = await Promise.allSettled(
        (categories.length ? categories : ['Sevärdheter']).map((category) =>
          searchCatalog(
            new URLSearchParams({
              city,
              category,
              options: (categoryPreferences[category] || ['Alla']).join('|'),
              origin: JSON.stringify(origin),
              sort: 'near',
              radius: SEARCH_RADIUS_KM,
              purpose: 'route',
            }),
            { reserveFallback: true },
          ),
        ),
      );
      if (request !== tipRequest.current) {
        setTipsNotice('Planen ändrades under sökningen. Be om nya tips för den aktuella turen.');
        return;
      }
      const seen = new Set(route.map((p) => p.id));
      const found: Place[] = [];
      let limited = false;
      for (const result of results) {
        if (result.status === 'rejected') {
          limited = true;
          continue;
        }
        limited ||= !!result.value.warning;
        for (const item of result.value.items || []) {
          if (seen.has(item.id) || excludedIds.includes(item.id)) continue;
          seen.add(item.id);
          const p: Place = {
            ...toRoutePlace(item),
            notBefore: index ? schedule.route[index - 1].departure : guideNow,
            notAfter: gap.arrival,
          };
          const trial = plan({
            candidates: [...schedule.route, p],
            origin: currentOrigin,
            destination: endPoint,
            start: guideNow,
            deadline,
            tempo,
            transportMode,
            date: startDate,
            walkingLegs,
            pinned: [...schedule.route.map((s) => s.id), p.id],
          });
          const keepsMeals = schedule.route.every((old) =>
            trial.route.some((s) => s.id === old.id && (!old.meal || s.arrival <= old.arrival)),
          );
          if (trial.feasible && trial.route.some((s) => s.id === p.id) && keepsMeals) found.push(p);
        }
      }
      setTips(found.slice(0, 3));
      setTipsNotice(
        (limited ? 'Begränsat utbud. ' : '') +
          (found.length
            ? 'Dessa förslag ryms utan att senarelägga dina planerade måltider. Välj ett i taget. Kontrollera öppettider.'
            : 'Inga nya passande platser kunde hittas. Dina befintliga stopp är kvar.'),
      );
    } catch {
      setTipsNotice('Tipsen kunde inte hämtas. Försök igen.');
    } finally {
      setTipsLoading(false);
    }
  };

  // Guide mode actions
  const startGuide = () => {
    if (clockAnchor != null) {
      setGuideStarted(true);
      return;
    }
    const now = minuteOnTrip(startDate, timeZone);
    if (!Number.isFinite(now) || now < 0 || now >= deadline) {
      setGuideNotice(
        'Den lokala tiden ligger utanför resans datum och sluttid. Ändra datum eller sluttid innan du startar.',
      );
      return;
    }
    setGuideStarted(true);
    setClockAnchor(Date.now());
    setClockBase(now);
    setGuideMinute(now);
    setGuideOrigin(startPoint);
    setGuideNotice(
      `Startad kl. ${timeLabel(now)} (${timeZone}). Sluttiden är fortfarande ${endTime}.`,
    );
  };
  const completeStop = () => {
    if (!currentStop) return;
    const finish = guideNow;
    const arrival = arrived?.id === currentStop.id ? arrived.at : finish;
    setCompleted((items) => [
      ...items,
      {
        ...currentStop,
        arrival,
        departure: finish,
        minutes: Math.max(0, finish - arrival),
        travelMinutes: arrived?.travelMinutes ?? currentStop.travelMinutes,
        km: arrived?.km ?? currentStop.km,
      },
    ]);
    setArrived(null);
    setGuideOrigin(pointOf(currentStop));
    setGpsOrigin(null);
    setGuideMinute(finish);
    setFirstId(undefined);
    setGuideNotice('Stoppet är klart. Tiderna för resten av dagen är omräknade.');
  };
  const stayLonger = () => {
    if (!currentStop) return;
    if (arrived?.id === currentStop.id)
      setArrived((value) => (value ? { ...value, until: value.until + 20 } : null));
    else
      setExtraMinutes((current) => ({
        ...current,
        [String(currentStop.id)]: (current[String(currentStop.id)] || 0) + 20,
      }));
    setPinnedIds((ids) => (ids.includes(currentStop.id) ? ids : [...ids, currentStop.id]));
    setFirstId(currentStop.id);
    setGuideNotice(
      '20 minuter till vid nästa stopp. Stoppet behålls och resten av dagen räknas om.',
    );
  };
  const arriveAtStop = () => {
    if (!currentStop) return;
    setArrived({
      id: currentStop.id,
      at: guideNow,
      until: guideNow + currentStop.minutes,
      travelMinutes: currentStop.travelMinutes,
      km: currentStop.km,
    });
    setGuideOrigin(pointOf(currentStop));
    setGpsOrigin(null);
    setFirstId(currentStop.id);
    setGuideNotice('Besöket har startat. Återstående besökstid räknas ned.');
  };
  // Lets a slow restaurant search notice that the day changed while it was running.
  const tripIdentity = JSON.stringify([
    city,
    startDate,
    endTime,
    chosenPlaces.map((p) => p.id),
    completed.map((p) => p.id),
  ]);
  const tripIdentityRef = useRef(tripIdentity);
  useEffect(() => {
    tripIdentityRef.current = tripIdentity;
  }, [tripIdentity]);
  const hungry = async () => {
    if (arrived) {
      setGuideNotice('Markera pågående besök klart innan du väljer nästa matstopp.');
      return;
    }
    if (!currentOrigin || hungryLoading) return;
    const identity = tripIdentity;
    setHungryLoading(true);
    setGuideNotice('Söker närliggande restauranger efter dina matval…');
    try {
      const data = await searchCatalog(
        new URLSearchParams({
          city,
          category: RESTAURANTS,
          options: restaurantPreferences.join('|'),
          sort: 'near',
          origin: JSON.stringify(currentOrigin),
          radius: SEARCH_RADIUS_KM,
        }),
      );
      if (identity !== tripIdentityRef.current)
        throw new Error(
          'Planen ändrades under sökningen. Tryck på matknappen igen för aktuella förslag.',
        );
      const fresh = data.items;
      const next = fresh
        .filter((p) => !completed.some((c) => c.id === p.id) && !excludedIds.includes(p.id))
        .map(toRoutePlace)
        .find(
          (p) =>
            plan({
              candidates: [...candidates.filter((c) => c.id !== p.id), p],
              origin: currentOrigin,
              destination: endPoint,
              start: guideNow,
              deadline,
              tempo,
              transportMode,
              pinned: [...pinnedIds, p.id],
              first: p.id,
            }).feasible,
        );
      if (!next) {
        setGuideNotice(
          'Ingen matchande restaurang inom 3 km ryms tillsammans med dina prioriterade stopp. Prova kortare besökstid, andra matval eller senare sluttid.',
        );
        return;
      }
      const picked = fresh.find((p) => p.id === next.id)!;
      setChosenPlaces((items) =>
        items.some((p) => p.id === picked.id) ? items : [...items, picked],
      );
      setRouteSource((items) => [...items.filter((p) => p.id !== next.id), next]);
      addToSelected(RESTAURANTS);
      setFirstId(next.id);
      setPinnedIds((ids) => [...new Set([...ids, next.id])]);
      setGuideNotice(
        `${next.title} ligger nu först. Pris och öppettider behöver kontrolleras hos restaurangen.`,
      );
    } catch (e) {
      setGuideNotice(
        e instanceof Error ? e.message : 'Matförslagen kunde inte hämtas. Försök igen.',
      );
    } finally {
      setHungryLoading(false);
    }
  };
  const openTaxi = () => {
    if (!canNavigate) return;
    setTaxiPickup(currentOrigin ? `${currentOrigin.lat},${currentOrigin.lon}` : address);
    setTaxiDestination(
      nextDestination ? `${nextDestination.lat},${nextDestination.lon}` : endAddress,
    );
    setTaxiOpen(true);
  };

  // Persistence
  const storage = useTripSave(
    {
      version: 1,
      mealPreferences,
      activityPreferences,
      transportMode,
      locationError,
      city,
      address,
      endAddress,
      startDate,
      startTime,
      endTime,
      timeZone,
      selected,
      price,
      mealTimes,
      routeSource,
      chosenPlaces,
      startPoint,
      endPoint,
      routeLive,
      excludedIds,
      categoryPreferences,
      tempo,
      pinnedIds,
      extraMinutes,
      completed,
      guideOrigin,
      guideMinute,
      clockAnchor,
      clockBase,
      firstId,
      arrived,
      gpsOrigin,
    },
    (s) => {
      if (s.mealPreferences) setMealPreferences(s.mealPreferences);
      if (s.activityPreferences) setActivityPreferences(s.activityPreferences);
      if (s.transportMode === 'walking' || s.transportMode === 'mixed')
        setTransportMode(s.transportMode);
      if (s.mealTimes !== undefined) setMealTimes(s.mealTimes);
      if (typeof s.locationError === 'string') setLocationError(s.locationError);
      if (s.city !== undefined) setCity(s.city);
      if (s.address !== undefined) setAddress(s.address);
      if (s.endAddress !== undefined) setEndAddress(s.endAddress);
      if (s.startDate !== undefined) setStartDate(s.startDate);
      if (s.startTime !== undefined) setStartTime(s.startTime);
      if (s.endTime !== undefined) setEndTime(s.endTime);
      if (s.timeZone !== undefined) setTimeZone(s.timeZone);
      if (s.selected !== undefined) setSelected(s.selected);
      if (s.price !== undefined) setPrice(s.price);
      if (s.routeSource !== undefined) setRouteSource(s.routeSource);
      if (s.chosenPlaces !== undefined) setChosenPlaces(s.chosenPlaces);
      if (s.startPoint !== undefined) setStartPoint(s.startPoint);
      if (s.endPoint !== undefined) setEndPoint(s.endPoint);
      if (s.routeLive !== undefined) setRouteLive(s.routeLive);
      if (s.excludedIds !== undefined) setExcludedIds(s.excludedIds);
      if (s.categoryPreferences !== undefined) setCategoryPreferences(s.categoryPreferences);
      if (s.tempo !== undefined) setTempo(s.tempo);
      if (s.pinnedIds !== undefined) setPinnedIds(s.pinnedIds);
      if (s.extraMinutes !== undefined) setExtraMinutes(s.extraMinutes);
      if (s.completed !== undefined) setCompleted(s.completed);
      if (s.guideOrigin !== undefined) setGuideOrigin(s.guideOrigin);
      if (s.guideMinute !== undefined) setGuideMinute(s.guideMinute);
      if (s.clockAnchor !== undefined) setClockAnchor(s.clockAnchor);
      if (s.clockBase !== undefined) setClockBase(s.clockBase);
      if (s.firstId !== undefined) setFirstId(s.firstId);
      if (s.arrived !== undefined) setArrived(s.arrived);
      if (s.gpsOrigin !== undefined) setGpsOrigin(s.gpsOrigin);
      setGuideStarted(false);
      setGuideNotice('Din sparade tur är återställd. Genomförda stopp finns kvar.');
    },
  );
  const storageUsable = storage.ready || storage.error;
  const scrollToResults = () =>
    document.querySelector('#results')?.scrollIntoView({ behavior: 'smooth' });

  const catalogBrowser = (fixed?: { category: string; options: string[] }) =>
    planned &&
    storageUsable && (
      <CatalogBrowser
        selectionLabel={fixed && mealTarget ? `VÄLJ FÖR ${mealTarget.toUpperCase()}` : undefined}
        city={city}
        fixedCategory={fixed?.category}
        fixedOptions={fixed?.options}
        origin={currentOrigin}
        routePoints={[currentOrigin, ...schedule.route.map(pointOf), endPoint].filter(
          (p): p is Point => !!p,
        )}
        tempo={tempo}
        onLocate={updateGuideLocation}
        selectedIds={chosenPlaces.map((p) => p.id)}
        onToggle={toggleCatalogPlace}
      />
    );

  return (
    <main className={guideStarted ? 'guiding' : ''}>
      <SiteHeader />

      <section className="setup" id="top">
        <div className="setup-intro">
          <p className="overline">PERSONLIG STADSGUIDE</p>
          <h1>Planera din dag.</h1>
          <p>Välj plats, tid och upplevelser.</p>
        </div>
        <TripSaveBar
          status={storage.status}
          error={storage.error}
          ready={storage.ready}
          reloadRequired={storage.reloadRequired}
          restored={storage.restored}
          hasRoute={routeSource.length > 0}
          onRetry={storage.retry}
          onContinue={() => {
            if (clockAnchor != null) setGuideStarted(true);
            scrollToResults();
          }}
          onNewTrip={() => {
            resetGuide();
            setExcludedIds([]);
            setStartDate(localClock(timeZone).date);
          }}
        />
        <PlannerForm
          disabled={!planned || !storageUsable}
          journey={{
            city,
            onCity: (value) => {
              resetGuide();
              setRouteSource([]);
              setChosenPlaces([]);
              setPinnedIds([]);
              setCity(value);
              setTimeZone(cityZone(value) || Intl.DateTimeFormat().resolvedOptions().timeZone);
              setStartPoint(null);
              setEndPoint(null);
            },
            address,
            onAddress: (value) => {
              invalidateRoute();
              setAddress(value);
              setStartPoint(null);
            },
            endAddress,
            onEndAddress: (value) => {
              invalidateRoute();
              setEndAddress(value);
              setEndPoint(null);
              setMealPreferences((old) => ({
                ...old,
                Middag: { ...old.Middag, placeId: undefined, placeName: undefined },
              }));
            },
            startDate,
            onStartDate: setStartDate,
            startTime,
            onStartTime: setStartTime,
            endTime,
            onEndTime: setEndTime,
            locked: clockAnchor != null,
            locating,
            onLocate: locateVisitor,
            onPickOnMap: setMapPickerTarget,
            onSameAsStart: () => {
              invalidateRoute();
              setEndAddress(address);
              setEndPoint(startPoint);
            },
            onSubmit: createRoute,
          }}
          locationError={locationError}
          timeZone={timeZone}
          onTimeZone={setTimeZone}
          locked={clockAnchor != null}
          hours={hours}
          onTripLength={setTripLength}
          selected={selected}
          categoryPreferences={categoryPreferences}
          onOpenCategory={openCategoryPicker}
          day={{
            city,
            meals: mealTimes,
            onMeals: (v) => {
              setMealTimes(v);
              if (mealPreferences.Middag?.atDestination && v.Middag) setEndTime(v.Middag);
            },
            preferences: mealPreferences,
            onPreferences: (v) => {
              setMealPreferences(v);
              invalidateRoute();
            },
            activities: activityPreferences,
            onActivities: (v) => {
              setActivityPreferences(v);
              invalidateRoute();
            },
            selected,
            transport: transportMode,
            onTransport: setTransportMode,
            endAddress,
            endTime,
            onChoose: (meal) => {
              setMealTarget(meal);
              openCategoryPicker(categoryDefinitions[0]);
            },
          }}
          chosenPlaces={chosenPlaces}
          onRemovePlace={(p) => toggleCatalogPlace(p)}
          advancedOpen={advancedOpen}
          onToggleAdvanced={() => setAdvancedOpen((open) => !open)}
          tempo={tempo}
          onTempo={setTempo}
          price={price}
          onPrice={setPrice}
          totalPreferences={totalPreferences}
          planned={planned}
          canBuild={canBuild}
          onBuild={createRoute}
        />
      </section>

      <section className="results" id="results">
        <RouteHeader
          city={city}
          address={address}
          endAddress={endAddress}
          startDate={startDate}
          startTime={startTime}
          endTime={endTime}
          routeLive={routeLive}
          stops={route.length}
          km={routeKm}
          travelMinutes={
            schedule.transport + completed.reduce((sum, p) => sum + p.travelMinutes, 0)
          }
        />
        {!journey && (
          <p role="status">
            Start- och slutpunkt måste hittas innan avstånd, karta och tur kan beräknas. Skapa
            rutten eller välj punkterna på kartan. Dina valda platser finns kvar.
          </p>
        )}
        {locationError && <p role="status">{locationError}</p>}
        {routeError && (
          <div className="route-error">
            <b>
              {route.length ? 'RUTTEN VISAS MED BEGRÄNSAT UNDERLAG' : 'INGEN NY RUTT KUNDE SKAPAS'}
            </b>
            <span>{routeError}</span>
            <button onClick={createRoute} disabled={!planned}>
              {planned ? 'FÖRSÖK IGEN' : 'SÖKER PLATSER…'}
            </button>
          </div>
        )}
        {!planned ? (
          <div className="loading">
            <span></span>
            <p>Hämtar platser och beräknar avstånd och besökstider…</p>
          </div>
        ) : (
          <div className="route-layout">
            <div className="itinerary">
              {journey && routeSource.length > 0 && (
                <ScheduleStatus
                  schedule={schedule}
                  missingMeals={missingMeals}
                  missingActivities={missingActivities}
                  onShowAlternatives={() => setAdjusting((v) => !v)}
                />
              )}
              {guideStarted ? (
                <GuidePanel
                  currentStop={currentStop}
                  transportStop={transportStop}
                  arrived={arrived}
                  completedCount={completed.length}
                  remainingCount={schedule.route.length}
                  omittedCount={schedule.omitted.length}
                  endAddress={endAddress}
                  guideNow={guideNow}
                  scheduleArrival={schedule.arrival}
                  legMinutes={currentLeg.minutes}
                  legMode={currentLeg.mode}
                  navigationUrl={currentNavigationUrl}
                  transitUrl={transitUrl}
                  locating={locating}
                  hungryLoading={hungryLoading}
                  notice={guideNotice}
                  onComplete={completeStop}
                  onArrive={arriveAtStop}
                  onTaxi={openTaxi}
                  onUpdateLocation={updateGuideLocation}
                  onStayLonger={stayLonger}
                  onSkip={() => currentStop && removeStop(currentStop)}
                  onHungry={hungry}
                  onAdjust={() => setAdjusting((v) => !v)}
                  onBackToPlanning={() => setGuideStarted(false)}
                />
              ) : route.length ? (
                <RouteActions
                  continuing={clockAnchor != null}
                  onStart={startGuide}
                  onAdjust={() => setAdjusting((v) => !v)}
                />
              ) : null}
              {!guideStarted && guideNotice && (
                <p className="guide-notice" role="status">
                  {guideNotice}
                </p>
              )}
              {undo && <UndoBanner undo={undo} onUndo={undoRemove} />}
              <RouteNote routeLive={routeLive} startDate={startDate} />
              {adjusting && schedule.omitted.length > 0 && (
                <OmittedStops
                  stops={schedule.omitted}
                  onPin={(p) => setPinnedIds((ids) => [...ids, p.id])}
                />
              )}
              <TimelineEdge edge="start" time={startTime} address={address} />
              {route.length > 0 && (
                <TipsSection
                  tips={tips}
                  loading={tipsLoading}
                  notice={tipsNotice}
                  onFind={findTips}
                  onAdd={addTip}
                />
              )}
              <RouteList
                route={route}
                active={active}
                onActivate={setActive}
                completedIds={completed.map((p) => p.id)}
                pinnedIds={pinnedIds}
                arrivedId={arrived?.id}
                adjusting={adjusting}
                routeTime={routeTime}
                legInfo={legInfo}
                onVisitMinutes={setVisitMinutes}
                onTogglePin={togglePin}
                onRemove={removeStop}
                onSwap={swapStop}
                onOpenAction={setBooking}
                selectedCount={selected.length}
                omittedCount={schedule.omitted.length}
              />
              <TimelineEdge edge="end" time={endTime} address={endAddress} />
            </div>
            <MapPanel
              city={city}
              address={address}
              endAddress={endAddress}
              mapDocument={mapDocument}
              hasRoute={schedule.route.length > 0}
              walking={walking}
              transportTitle={transportStop?.title || endAddress || 'Slutadressen'}
              canNavigate={canNavigate}
              transitUrl={transitUrl}
              navigationUrl={currentNavigationUrl}
              onTaxi={openTaxi}
              onOpenLarge={() => setMapOpen(true)}
            />
          </div>
        )}
      </section>

      <section className="directory" id="directory">
        <div className="directory-head">
          <div>
            <p className="overline">VÄLJ DINA PLATSER</p>
            <h2>Utforska {city}.</h2>
          </div>
          <p>
            Sök restauranger, sevärdheter, butiker och kultur. Lägg till dina val direkt i rutten.
          </p>
        </div>
        {catalogBrowser()}
      </section>

      <ExploreSection />
      <SiteFooter />
      <MobileTabs onMap={() => setMapOpen(true)} />

      {mapPickerTarget && (
        <MapPickerDialog
          target={mapPickerTarget}
          document={addressPickerDocument}
          loading={mapPickLoading}
          onClose={() => setMapPickerTarget(null)}
        />
      )}
      {activeCategory && (
        <CategoryPickerDialog
          category={activeCategory}
          mealTarget={mealTarget}
          draft={categoryDraft}
          onToggleOption={toggleCategoryDraft}
          onApply={applyCategoryPicker}
          canRemove={selected.includes(activeCategory.key)}
          onRemove={removeCategory}
          onClose={closeCategoryPicker}
          browser={catalogBrowser({ category: activeCategory.key, options: categoryDraft })}
        />
      )}
      {booking && (
        <PlaceDialog
          place={booking}
          city={city}
          startDate={startDate}
          plannedTime={routeTime(
            Math.max(
              0,
              route.findIndex((p) => p.id === booking.id),
            ),
          )}
          onClose={() => setBooking(null)}
        />
      )}
      {taxiOpen && (
        <TaxiDialog
          title={transportStop?.title || endAddress || 'slutadressen'}
          from={gpsOrigin ? 'din senast hämtade position' : completed.at(-1)?.title || address}
          pickup={taxiPickup}
          destination={taxiDestination}
          onPickup={setTaxiPickup}
          onDestination={setTaxiDestination}
          onClose={() => setTaxiOpen(false)}
        />
      )}
      {mapOpen && (
        <RouteMapDialog
          city={city}
          stops={route.length}
          address={address}
          endAddress={endAddress}
          document={mapDocument}
          navigationUrl={currentNavigationUrl}
          onClose={() => setMapOpen(false)}
        />
      )}
    </main>
  );
}
