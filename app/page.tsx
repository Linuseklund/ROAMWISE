"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMobileDialogs } from "./use-mobile-dialogs";
import DayControls from './day-controls';
import {activityWindows,matchesArea,matchesFood,type MealPreferences,type ActivityPreferences} from './day-preferences';
import {journeyLeg,type TransportMode} from './planner';
import CatalogBrowser from "./catalog-browser";
import { defaultMeals, withMeals, type MealTimes } from "./meals";
import { useWalkingPaths } from "./use-walking-paths";
import { legKey, type WalkingLegs } from "./walking";
import { useTripSave } from "./use-trip-save";
import { cityZone, localClock, minuteOnTrip } from "./trip-time";
import { categoryDefinitions, optionQueries, matchesCategory, type CategoryDefinition, type CatalogPlace } from "./catalog";
import { plan, distance, directions, pointOf, walkLeg, timeMinutes, timeLabel, tripMinutes, type Point, type Scheduled } from "./planner";

type Place = {
  id: number | string; time: string; minutes: number; category: string; title: string;
  mealTypes?:string[]; terminal?:boolean;finishBy?:number;afterMeal?:string; meal?:string;notBefore?:number;notAfter?:number; area: string; description: string; meta: string; action?: string; price?: string; cuisine?: string; lat?: number; lon?: number; openingHours?: string; website?: string; tags?: Record<string,string>;
};

const categoryLabel = (key: string) => categoryDefinitions.find((category) => category.key === key)?.label || key;
const categoryGlyphs: Record<string,string> = { Restauranger:"♨", Klädbutiker:"▱", Sneakers:"◒", Museum:"△", Utställningar:"▣", Sevärdheter:"◎", Konserter:"♫", Nattklubbar:"✦", Butiker:"▱" };
const categoryImages: Record<string,string> = {
  Restauranger:"https://images.unsplash.com/photo-1517248135467-4c7edcad34c5?auto=format&fit=crop&w=220&q=80",
  Klädbutiker:"https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=220&q=80",
  Sneakers:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=220&q=80",
  Museum:"https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=220&q=80",
  Utställningar:"https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=220&q=80",
  Sevärdheter:"https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=220&q=80",
  Konserter:"https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=220&q=80",
  Nattklubbar:"https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?auto=format&fit=crop&w=220&q=80",
  Butiker:"https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=220&q=80",
};
const cuisineLabel = (value?: string) => {
  if (!value) return "Lokalt & blandat";
  const first = value.split(";")[0].replaceAll("_", " ").trim().toLowerCase();
  const translated: Record<string, string> = { catalan: "Katalanskt", spanish: "Spanskt", italian: "Italienskt", japanese: "Japanskt", chinese: "Kinesiskt", indian: "Indiskt", mexican: "Mexikanskt", mediterranean: "Medelhav", pizza: "Pizza", burger: "Hamburgare", kebab: "Kebab", tapas: "Tapas", seafood: "Fisk & skaldjur", vegetarian: "Vegetariskt", vegan: "Veganskt" };
  return translated[first] || first.charAt(0).toUpperCase() + first.slice(1);
};
const priceLabel = (value?: string) => {
  if (!value) return undefined;
  const euros = value.match(/€/g)?.length;
  if (euros) return "€".repeat(Math.min(3, euros));
  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric >= 40 ? "€€€" : numeric >= 20 ? "€€" : "€" : undefined;
};


const routeMapDocument = (route: Place[], start: {lat:number;lon:number} | null, end: {lat:number;lon:number} | null, city: string, walkingLegs:WalkingLegs, tempo:string, offset=0) => {
  const locations=[start,...route.map(pointOf),end].filter((p):p is Point=>!!p);
  const paths=locations.slice(1).map((b,i)=>({points:(route[i] as Scheduled<Place>)?.travelMode!=='transit'&&walkingLegs[legKey(locations[i],b,tempo)]?.shape||[[locations[i].lat,locations[i].lon],[b.lat,b.lon]],real:(route[i] as Scheduled<Place>)?.travelMode!=='transit'&&!!walkingLegs[legKey(locations[i],b,tempo)]}));
  const points = route.filter((p) => p.lat != null && p.lon != null).map((p) => ({ lat:p.lat, lon:p.lon, title:p.title, category:categoryLabel(p.category) }));
  const payload = JSON.stringify({ points, start, end, city, paths, offset }).replace(/</g, "\\u003c");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0}body{font-family:Helvetica,Arial,sans-serif}.leaflet-tile{filter:grayscale(1)}.num{width:30px;height:30px;border-radius:50%;background:#111;color:#fff;border:2px solid #fff;display:grid;place-items:center;font:800 12px Helvetica,Arial}.start,.end{width:14px;height:14px;border-radius:50%;background:#fff;border:4px solid #111}.end{background:#111;border-color:#fff;box-shadow:0 0 0 2px #111}.leaflet-popup-content{font:700 12px Helvetica,Arial;line-height:1.25}.leaflet-control-attribution{font-size:10px}.leaflet-control-zoom a{width:44px!important;height:44px!important;line-height:44px!important}.leaflet-popup-content{font-size:14px}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const d=${payload};const center=d.start||d.points[0]||{lat:40.7536,lon:-73.9832};const map=L.map('map',{zoomControl:true}).setView([center.lat,center.lon],13);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const coords=[];if(d.start){coords.push([d.start.lat,d.start.lon]);L.marker([d.start.lat,d.start.lon],{icon:L.divIcon({className:'',html:'<div class="start"></div>',iconSize:[22,22],iconAnchor:[11,11]})}).addTo(map).bindPopup('<b>Startadress</b>');}d.points.forEach((p,i)=>{coords.push([p.lat,p.lon]);L.marker([p.lat,p.lon],{icon:L.divIcon({className:'',html:'<div class="num">'+(i+1+d.offset)+'</div>',iconSize:[34,34],iconAnchor:[17,17]})}).addTo(map).bindPopup('<b>'+(i+1+d.offset)+'. '+esc(p.title)+'</b><br>'+esc(p.category));});if(d.end){coords.push([d.end.lat,d.end.lon]);L.marker([d.end.lat,d.end.lon],{icon:L.divIcon({className:'',html:'<div class="end"></div>',iconSize:[22,22],iconAnchor:[11,11]})}).addTo(map).bindPopup('<b>Slutadress</b>');}if(coords.length>1){d.paths.forEach(p=>L.polyline(p.points,{color:'#111',weight:4,opacity:.85,dashArray:p.real?null:'2 9'}).addTo(map));map.fitBounds(coords,{padding:[40,40]});}</script></body></html>`;
};

const mapPickerDocument = (center: {lat:number;lon:number} | null, target: "start" | "end") => {
  const point = center || { lat: 20, lon: 0 };
  const zoom = center ? 14 : 2;
  const label = target === "start" ? "startadress" : "slutadress";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0}body{font-family:Arial,sans-serif}.leaflet-tile{filter:grayscale(.75)}.hint{position:fixed;z-index:1000;left:50%;top:14px;transform:translateX(-50%);width:max-content;max-width:calc(100% - 28px);padding:11px 15px;border-radius:999px;background:#171713;color:#fff;font:800 11px Arial;box-shadow:0 8px 25px #0004}.pin{width:22px;height:22px;border-radius:50% 50% 50% 0;background:#ff5a36;border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 9px #0005}.leaflet-control-attribution{font-size:10px}.leaflet-control-zoom a{width:44px!important;height:44px!important;line-height:44px!important}.leaflet-popup-content{font-size:14px}</style></head><body><div class="hint">Tryck på kartan för att välja ${label}</div><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const map=L.map('map').setView([${point.lat},${point.lon}],${zoom});L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);let marker=${center ? `L.marker([${point.lat},${point.lon}]).addTo(map)` : "null"};map.on('click',e=>{if(marker)marker.setLatLng(e.latlng);else marker=L.marker(e.latlng).addTo(map);window.parent.postMessage({type:'roamwise-map-pick',lat:e.latlng.lat,lon:e.latlng.lng},'*')});</script></body></html>`;
};

const fetchJson = async (url: string, init: RequestInit = {}) => {
  if(url.startsWith('https://nominatim.openstreetmap.org/')) { const original=new URL(url);url='/api/geo?'+original.searchParams; }
  try {
    const response=await fetch(url,{...init,signal:AbortSignal.timeout(url.includes("purpose=route")?26000:50000)});const data=await response.json();
    if(!response.ok)throw new Error(data.error||'Platstjänsten svarar inte just nu. Försök igen.');
    return data;
  }catch(error){throw new Error(error instanceof Error&&!/timeout|fetch|internal error/i.test(error.message)?error.message:'Platstjänsten svarar inte just nu. Dina val är kvar. Försök igen.');}
};
const reverseCoordinates = async (lat: number, lon: number) => {
  const result = await fetchJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, { headers: { "Accept-Language": "sv" } });
  const details = result.address || {};
  const shortAddress = [details.road || details.pedestrian || details.neighbourhood || result.name, details.house_number].filter(Boolean).join(" ");
  return {
    label: shortAddress || result.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    city: details.city || details.town || details.village || details.municipality || details.county || details.country || "",
  };
};

function Icon({ name }: { name: "pin" | "clock" | "calendar" | "search" | "arrow" | "walk" | "close" | "check" | "sliders" }) {
  const paths = {
    pin: <><path d="M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="1"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
    walk: <><circle cx="12" cy="4" r="2"/><path d="m10 22 1-7-3-3 2-5 4 3 4 1m-3 11-2-7"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</g></svg>;
}

export default function Home() {
  const [city, setCity] = useState("New York");
  const [address, setAddress] = useState("Bryant Park, New York");
  const [endAddress, setEndAddress] = useState("Bryant Park, New York");
  const [timeZone, setTimeZone] = useState("America/New_York");
  const [clockBase, setClockBase] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  useEffect(() => { setStartDate(localClock("America/New_York").date); }, []);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("21:00");
  const [selected, setSelected] = useState(["Restauranger", "Klädbutiker", "Museum", "Sevärdheter"]);
  const [mealPreferences,setMealPreferences]=useState<MealPreferences>({});
  const [activityPreferences,setActivityPreferences]=useState<ActivityPreferences>({});
  const [transportMode,setTransportMode]=useState<TransportMode>('walking');
  const [mealTarget,setMealTarget]=useState<string|null>(null);
  const [mealTimes,setMealTimes]=useState<MealTimes>(defaultMeals);
  const [price, setPrice] = useState("Alla priser");
  const [active, setActive] = useState<number | string>(1);
  const [booking, setBooking] = useState<Place | null>(null);
  
  const [planned, setPlanned] = useState(true);
  const [taxiOpen, setTaxiOpen] = useState(false);
  const [taxiPickup, setTaxiPickup] = useState("");
  const [taxiDestination, setTaxiDestination] = useState("");
  const [walkingLegs,setWalkingLegs]=useState<WalkingLegs>({});
  const [routeSource, setRouteSource] = useState<Place[]>([]);
  const [chosenPlaces, setChosenPlaces] = useState<CatalogPlace[]>([]);
  const [startPoint, setStartPoint] = useState<{lat:number;lon:number} | null>({ lat: 40.7536, lon: -73.9832 });
  const [endPoint, setEndPoint] = useState<{lat:number;lon:number} | null>({ lat: 40.7536, lon: -73.9832 });
  const [routeError, setRouteError] = useState("");
  const [routeLive, setRouteLive] = useState(false);
  const [tips,setTips]=useState<Place[]>([]);
  const [tipsLoading,setTipsLoading]=useState(false);
  const [tipsNotice,setTipsNotice]=useState('');
  const tipRequest=useRef(0);
  const invalidateRoute=()=>{setExcludedIds([]);setRouteSource([]);setRouteLive(false);setLocationError('');setTips([]);setTipsNotice('');tipRequest.current++;resetGuide();};
  const [mapOpen, setMapOpen] = useState(false);
  const [mapPickerTarget, setMapPickerTarget] = useState<"start" | "end" | null>(null);
  const [mapPickLoading, setMapPickLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  useEffect(()=>{tipRequest.current++;setTips([]);setTipsNotice('');},[address,endAddress,mealTimes,startTime,endTime,startDate,selected,routeSource]);
  const [, setLastLoadedCity] = useState("New York");
  const [, setCurrentStopIndex] = useState(0);
  const [guideStarted, setGuideStarted] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Array<number | string>>([]);
  const [categoryPicker, setCategoryPicker] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<string[]>(["Alla"]);
  const [categoryPreferences, setCategoryPreferences] = useState<Record<string, string[]>>({
    Restauranger: ["Alla"], Klädbutiker: ["Alla"], Museum: ["Alla"], Utställningar: ["Alla"], Sevärdheter: ["Alla"], Konserter: ["Alla"], Sneakers: [], Nattklubbar: [], Butiker: [],
  });
  const [tempo, setTempo] = useState("Normalt");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Array<string | number>>([]);
  const [extraMinutes, setExtraMinutes] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState<Scheduled<Place>[]>([]);
  const [guideOrigin, setGuideOrigin] = useState<Point | null>(null);
  const [guideMinute, setGuideMinute] = useState<number | null>(null);
  const [clockAnchor, setClockAnchor] = useState<number | null>(null);
  const [clockElapsed, setClockElapsed] = useState(0);
  const [firstId, setFirstId] = useState<string | number | undefined>();
  const [arrived, setArrived] = useState<{ id: string | number; at: number; until: number; travelMinutes: number; km: number } | null>(null);
  const [guideNotice, setGuideNotice] = useState("");
  const [gpsOrigin, setGpsOrigin] = useState<Point | null>(null);
  useEffect(() => {
    if (clockAnchor == null) return;
    const update = () => setClockElapsed(Math.floor((Date.now() - clockAnchor) / 60000));
    const timer = setInterval(update, 15000); update();
    return () => clearInterval(timer);
  }, [clockAnchor]);
  const resetGuide = () => { setGuideStarted(false); setUndo(null); setClockBase(null); setCompleted([]); setGuideMinute(null); setGuideOrigin(null); setClockAnchor(null); setClockElapsed(0); setExtraMinutes({}); setFirstId(undefined); setGpsOrigin(null); setCurrentStopIndex(0); setGuideNotice(""); setArrived(null); };
  const hours = useMemo(() => {
    return tripMinutes(startTime, endTime) / 60;
  }, [startTime,endTime]);
  const setTripLength = (minutes: number) => {
    const [hour, minute] = startTime.split(":").map(Number);
    const end = hour * 60 + minute + minutes;
    setEndTime(`${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`);
  };

  const restaurantPreferences = categoryPreferences.Restauranger || ["Alla"];
  const candidates = useMemo(() => activityWindows(withMeals(routeSource.filter(p=>!excludedIds.includes(p.id)),selected.includes("Restauranger")?mealTimes:{},timeMinutes(startTime),startDate,completed,startPoint&&endPoint?{origin:startPoint,destination:endPoint}:undefined,mealPreferences),activityPreferences,mealTimes).filter(place => !excludedIds.includes(place.id) && !completed.some(done => done.id === place.id)).filter(place => selected.includes(place.category)).filter(place=>place.category==='Restauranger'||matchesArea(place,activityPreferences[place.category]?.area)).filter(place=>place.category!=="Restauranger"||place.meal||!Object.keys(mealTimes).length||chosenPlaces.some(p=>p.id===place.id)).filter(place => chosenPlaces.some(p=>p.id===place.id) || ((!place.tags || matchesCategory(place.tags,place.category,categoryPreferences[place.category])) && (!place.price || price === "Alla priser" || place.price === price))), [routeSource, selected, categoryPreferences, price, excludedIds, completed, chosenPlaces, mealTimes, startTime, startDate,startPoint,endPoint,mealPreferences,activityPreferences]);
  const deadline = timeMinutes(startTime) + hours * 60;
  const guideNow = clockAnchor != null ? Math.max(guideMinute ?? timeMinutes(startTime), (clockBase ?? timeMinutes(startTime)) + clockElapsed) : timeMinutes(startTime);
  const schedule = useMemo(() => plan({ candidates: candidates.map(p => arrived?.id === p.id ? { ...p, minutes: Math.max(1, arrived.until - guideNow) } : p), origin: gpsOrigin || guideOrigin || startPoint, destination: endPoint, start: guideNow, deadline, tempo, transportMode, walkingLegs, date:startDate, pinned: [...pinnedIds,...candidates.filter(p=>p.meal).map(p=>p.id),...(arrived?[arrived.id]:[])], first: arrived?.id ?? firstId, extra: arrived ? { ...extraMinutes, [String(arrived.id)]: 0 } : extraMinutes }), [candidates, gpsOrigin, guideOrigin, startPoint, endPoint, guideNow, deadline, tempo, pinnedIds, firstId, extraMinutes, arrived, walkingLegs,startDate,transportMode]);
  const missingMeals=selected.includes("Restauranger")?Object.keys(mealTimes).filter(meal=>!completed.some(p=>p.meal===meal)&&!schedule.route.some(p=>p.meal===meal)):[];
  const missingActivities=selected.filter(c=>c!=='Restauranger'&&!completed.some(p=>p.category===c)&&!schedule.route.some(p=>p.category===c));
  const route = useMemo(() => startPoint&&endPoint?[...completed, ...schedule.route]:[], [completed, schedule.route,startPoint,endPoint]);
  const walking=useWalkingPaths((schedule.route.length?[gpsOrigin||guideOrigin||startPoint,...schedule.route.map(pointOf),endPoint]:[]).filter((p):p is Point=>!!p),tempo,walkingLegs,setWalkingLegs);
  const activeCategory = categoryDefinitions.find((category) => category.key === categoryPicker) || null;
  const totalPreferences = Object.values(categoryPreferences).reduce((sum, values) => sum + (values.includes("Alla") ? 0 : values.length), 0);
  const toRoutePlace = (p: CatalogPlace): Place => ({ id:p.id, time:"", minutes:p.visitMinutes ?? (p.category === "Restauranger" ? 70 : p.category === "Museum" ? 75 : 45), category:p.category, title:p.name, area:p.area, description:p.details.join(" · "), meta:`${p.address} · ${p.source}`, action:"Plats & öppettider", cuisine:p.cuisine, lat:p.lat, lon:p.lon, website:p.website, openingHours:p.openingHours, mealTypes:p.mealTypes });
  const toggleCatalogPlace = (p: CatalogPlace, priority = true) => {
    if(mealTarget){
      const meal=mealTarget;
      if(mealPreferences[meal]?.atDestination){setEndAddress(p.name+', '+p.address);setEndPoint(pointOf(toRoutePlace(p)));}
      setMealPreferences(old=>({...old,[meal]:{...old[meal],placeId:p.id,placeName:p.name}}));
      setChosenPlaces(old=>[...old.filter(v=>v.id!==p.id),p]);setPinnedIds(old=>[...new Set([...old,p.id])]);
      setSelected(old=>old.includes('Restauranger')?old:[...old,'Restauranger']);
      setCategoryPicker(null);setMealTarget(null);invalidateRoute();return;
    }
    if (chosenPlaces.some(item=>item.id===p.id)) {
      removeStop(toRoutePlace(p));
    } else {
      setChosenPlaces(items=>[...items,p]); setRouteSource(items=>[...items.filter(item=>item.id!==p.id),toRoutePlace(p)]); setPinnedIds(ids=>priority?[...ids.filter(id=>id!==p.id),p.id]:ids.filter(id=>id!==p.id)); setExcludedIds(ids=>ids.filter(id=>id!==p.id)); setSelected(items=>items.includes(p.category)?items:[...items,p.category]);
    }
    setRouteLive(true);
  };
  const openCategoryPicker = (category: CategoryDefinition) => {
    const saved = categoryPreferences[category.key];
    setCategoryDraft(saved?.length ? saved : ["Alla"]);
    setCategoryPicker(category.key);
  };
  const toggleCategoryDraft = (option: string) => setCategoryDraft((current) => {
    if (option === "Alla") return ["Alla"];
    const withoutAll = current.filter((item) => item !== "Alla");
    return withoutAll.includes(option) ? withoutAll.filter((item) => item !== option) : [...withoutAll, option];
  });
  const applyCategoryPicker = () => {
    if (!categoryPicker) return;
    const choices = categoryDraft.length ? categoryDraft : ["Alla"];
    setCategoryPreferences((current) => ({ ...current, [categoryPicker]: choices }));
    setSelected((current) => current.includes(categoryPicker) ? current : [...current, categoryPicker]);
    setCategoryPicker(null);setMealTarget(null);
  };
  const removeCategory = () => {
    if (!categoryPicker) return;
    setSelected((current) => current.filter((item) => item !== categoryPicker));
    setCategoryPreferences((current) => ({ ...current, [categoryPicker]: [] }));
    setCategoryPicker(null);setMealTarget(null);
  };
  useMobileDialogs(!!(categoryPicker || mapPickerTarget || booking || taxiOpen || mapOpen), () => {
    setCategoryPicker(null); setMealTarget(null); setMapPickerTarget(null);
    setBooking(null); setTaxiOpen(false); setMapOpen(false);
  });
  useEffect(() => {
    if (!mapPickerTarget) return;
    const receivePoint = async (event: MessageEvent) => {
      const data = event.data;
      if (data?.type !== "roamwise-map-pick" || !Number.isFinite(data.lat) || !Number.isFinite(data.lon)) return;
      setMapPickLoading(true); setLocationError("");
      try {
        const point = { lat: Number(data.lat), lon: Number(data.lon) };
        let label=`Kartpunkt ${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`;
        try{label=(await reverseCoordinates(point.lat, point.lon)).label;}catch{}
        invalidateRoute();
        if (mapPickerTarget === "start") { setAddress(label); setStartPoint(point); }
        else { setEndAddress(label); setEndPoint(point); }

        setMapPickerTarget(null);
      } catch {
        setLocationError("Platsen valdes, men adressen kunde inte läsas. Försök igen.");
      } finally { setMapPickLoading(false); }
    };
    window.addEventListener("message", receivePoint);
    return () => { window.removeEventListener("message", receivePoint); };
  }, [mapPickerTarget]);
  const useCurrentLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) { setLocationError("Din webbläsare kan inte dela aktuell position."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const point = { lat: coords.latitude, lon: coords.longitude };
      try {
        const resolved = await reverseCoordinates(point.lat, point.lon);
        setStartPoint(point); setAddress(resolved.label); if(clockAnchor!=null)setGpsOrigin(point);
      } catch { setStartPoint(point); setAddress(`${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`); }
      finally { setLocating(false); }
    }, () => { setLocationError("Positionen kunde inte hämtas. Kontrollera platsbehörigheten och försök igen."); setLocating(false); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 });
  };
  const buildRoute = async () => {
    if (!planned || !city.trim() || !selected.length || !hours || !address.trim() || !endAddress.trim()) return;
    setPlanned(false); setRouteError("");setTips([]);setTipsNotice('');tipRequest.current++;
    const locationWarnings:string[]=[];
    let destinationPlace:CatalogPlace|undefined;
    try {
      const resolve=async(value:string,point:Point|null,isEnd=false)=> {
        if(point&&!(isEnd&&mealPreferences.Middag?.atDestination&&!chosenPlaces.some(p=>p.id===mealPreferences.Middag?.placeId)))return point;
        const data=await fetchJson('/api/geo?'+new URLSearchParams({q:value+', '+city}));
        if(!data[0])throw new Error('Adressen hittades inte. Kontrollera adressen eller välj den på kartan.');
        if(data[0].warning)locationWarnings.push(data[0].warning);
        if(isEnd&&data[0].place)destinationPlace=data[0].place;
        return {lat:Number(data[0].lat),lon:Number(data[0].lon)};
      };
      const [origin,destination]=await Promise.all([resolve(address,startPoint),resolve(endAddress,endPoint,true)]);
      setLocationError(locationWarnings.join(' '));
      const picked:Place[]=chosenPlaces.map(toRoutePlace);
      if(mealPreferences.Middag?.atDestination){
        const selectedDinner=chosenPlaces.find(p=>p.id===mealPreferences.Middag.placeId);
        const dinner=selectedDinner||destinationPlace;
        if(!dinner)throw new Error('Välj middagsrestaurangen med knappen Välj restaurang för middag. En adress ensam räcker inte för att kontrollera måltid och öppettider.');
        if(!pointOf(toRoutePlace(dinner))||distance(pointOf(toRoutePlace(dinner))!,destination)>.25)throw new Error('Middagsrestaurangen ligger inte vid slutadressen. Ändra slutadressen eller välj rätt restaurang.');
        if(!picked.some(p=>p.id===dinner.id))picked.push(toRoutePlace(dinner));
        setChosenPlaces(old=>[...old.filter(p=>p.id!==dinner.id),dinner]);setPinnedIds(old=>[...new Set([...old,dinner.id])]);
        setMealPreferences(old=>({...old,Middag:{...old.Middag,placeId:dinner.id,placeName:dinner.name,strict:true}}));
      }
      {
        const needed=selected.filter(category=>chosenPlaces.filter(p=>p.category===category).length<(category==='Restauranger'?Math.max(1,Object.keys(mealTimes).length):1));
        const warnings:string[]=[],limited:string[]=[];
        const centers=distance(origin,destination)>1?[origin,{lat:(origin.lat+destination.lat)/2,lon:(origin.lon+destination.lon)/2},destination]:[origin];
        const results=await Promise.allSettled(needed.map(async category => {
          const areaPoints:Record<string,Point>={Williamsburg:{lat:40.7178,lon:-73.958},Brooklyn:origin,Manhattan:{lat:40.754,lon:-73.984},Harlem:{lat:40.8081,lon:-73.9448}};
          const activityArea=activityPreferences[category]?.area;
          const searchCenters=activityArea&&areaPoints[activityArea]?[areaPoints[activityArea]]:centers;
          const mealSearches=category==='Restauranger'?Object.values(mealPreferences).filter(p=>p.area||p.food).map(p=>({center:areaPoints[p.area||'']||origin,options:p.food==='Grönt & lätt'?'Vegetariskt|Veganskt':p.food||'Alla',borough:p.area==='Williamsburg'?'Brooklyn':p.area==='Harlem'?'Manhattan':p.area})):[];
          const searches=[...mealSearches,...searchCenters.map(center=>({center,options:(categoryPreferences[category]||['Alla']).join('|'),borough:activityArea==='Williamsburg'?'Brooklyn':activityArea==='Harlem'?'Manhattan':activityArea}))];
          const batches=await Promise.allSettled(searches.map(async ({center,options,borough})=>{
            const query=new URLSearchParams({city,category,options,borough:borough||'Hela New York',sort:'near',origin:JSON.stringify(center),radius:'3',purpose:'route'});
            try{return await fetchJson('/api/catalog?'+query);}catch{query.set('reserve','1');return await fetchJson('/api/catalog?'+query);}
          }));
          const items:CatalogPlace[]=[];let warning=false;
          batches.forEach(b=>{if(b.status==='rejected'){warning=true;return;}warning ||= !!b.value.warning;for(const p of b.value.items||[])if(!items.some(old=>old.id===p.id))items.push(p);});
          if(!items.length)throw new Error('Inga förslag längs sträckan.');
          return {items,warning};
        }));
        results.forEach((result,index)=>{
          const category=needed[index];
          if(result.status==='rejected'){warnings.push(categoryLabel(category));return;}
          const items:CatalogPlace[]=result.value.items || [];
          const available=items.filter(p=>(category==='Restauranger'||matchesArea(p,activityPreferences[category]?.area))&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&!picked.some(old=>old.id===p.id)&&!excludedIds.includes(p.id));
          if(!available.length)warnings.push(categoryLabel(category));
          else if(result.value.warning)limited.push(categoryLabel(category));
          picked.push(...available.slice(0,category==='Restauranger'?24:1).map(toRoutePlace));
        });
        if(warnings.length||limited.length)setRouteError([limited.length?'Begränsat underlag eller reservutbud används för '+limited.join(', ')+'. Kontrollera platsernas uppgifter före besöket.':'',warnings.length?'Förslag saknas för '+warnings.join(', ')+'. Övriga stopp visas.':''].filter(Boolean).join(' '));
      }
      if(!picked.length)throw new Error('Inga platser kunde hämtas. Prova igen eller sök enskilda platser i katalogen. Dina tidigare val är kvar.');
      setRouteSource([...completed,...picked.filter(p=>!completed.some(c=>c.id===p.id))]);
      setStartPoint(origin);setEndPoint(destination);setActive(picked[0].id);setRouteLive(true);setAdjusting(false);

    } catch (error) {
      setRouteSource([]);setRouteLive(false);
      setRouteError(error instanceof Error ? error.message : "Rutten kunde inte uppdateras just nu.");
    } finally {
      setPlanned(true); setTimeout(() => document.querySelector("#results")?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  };
  const openAction = (place: Place) => { setBooking(place) };
  const routeTime = (index: number) => timeLabel(route[index]?.arrival ?? schedule.arrival);
  const mapDocument = useMemo(() => routeMapDocument(schedule.route, gpsOrigin||guideOrigin||startPoint, endPoint, city, walkingLegs, tempo, completed.length), [schedule.route, gpsOrigin, guideOrigin, startPoint, endPoint, city, walkingLegs, tempo, completed.length]);
  const addressPickerDocument = useMemo(() => mapPickerDocument(mapPickerTarget === "end" ? (endPoint || startPoint) : (startPoint || endPoint), mapPickerTarget || "start"), [mapPickerTarget, startPoint, endPoint]);
  const routeKm = startPoint&&endPoint?schedule.km + completed.reduce((sum, stop) => sum + stop.km, 0):0;
  const currentStop = schedule.route[0];
  const currentOrigin = gpsOrigin || guideOrigin || startPoint;
  const transportStop = arrived ? schedule.route[1] : currentStop;
  const nextDestination = transportStop ? pointOf(transportStop) : endPoint;
  const currentLeg = journeyLeg(currentOrigin,nextDestination,tempo,transportMode,walkingLegs);
  const legMinutes = currentLeg.minutes;
  const currentNavigationUrl = directions(currentOrigin, nextDestination,currentLeg.mode);
  const transitUrl = directions(currentOrigin, nextDestination, "transit");
  const legInfo = (index: number) => ({ km: route[index]?.km || 0, minutes: route[index]?.travelMinutes || 0, mode: route[index]?.travelMode==='transit'?"min uppskattad lokaltrafik inkl. gång/väntan":"min uppskattad promenad" });
  const [undo, setUndo] = useState<{place:Place;chosen?:CatalogPlace;pinned:boolean;wasFirst:boolean}|null>(null);
  const removeStop = (place: Place) => {
    setUndo({place,chosen:chosenPlaces.find(p=>p.id===place.id),pinned:pinnedIds.includes(place.id),wasFirst:firstId===place.id});
    setChosenPlaces(items=>items.filter(p=>p.id!==place.id)); if(arrived?.id===place.id)setArrived(null);
    setExcludedIds(ids=>[...new Set([...ids,place.id])]);setPinnedIds(ids=>ids.filter(id=>id!==place.id));setFirstId(undefined);
    setGuideNotice(`${place.title} hoppades över. Du kan ångra borttagningen.`);
  };
  const undoRemove = () => {
    if(!undo)return;
    setExcludedIds(ids=>ids.filter(id=>id!==undo.place.id));
    setRouteSource(items=>items.some(p=>p.id===undo.place.id)?items:[...items,undo.place]);
    if(undo.chosen)setChosenPlaces(items=>items.some(p=>p.id===undo.place.id)?items:[...items,undo.chosen!]);
    if(undo.pinned)setPinnedIds(ids=>[...new Set([...ids,undo.place.id])]);
    if(undo.wasFirst)setFirstId(undo.place.id);
    setGuideNotice(`${undo.place.title} är tillbaka i rutten.`);setUndo(null);
  };
  const swapStop = (place: Place) => {
    const alternative = routeSource.find(p=>p.category===place.category&&p.id!==place.id&&!excludedIds.includes(p.id)&&!completed.some(c=>c.id===p.id)&&!route.some(r=>r.id===p.id));
    if(!alternative){setGuideNotice("Inget ersättningsförslag finns just nu. Ditt stopp är kvar. Sök ett alternativ i platslistan.");return;}
    removeStop(place);
    if(alternative){setExcludedIds(ids=>ids.filter(id=>id!==alternative.id));setFirstId(alternative.id);}
    setGuideNotice(alternative?`Bytt till ${alternative.title}.`:"Inga fler alternativ i sökningen. Du kan ångra borttagningen.");
  };
  const startGuide = () => {
    if(clockAnchor!=null){setGuideStarted(true);return;}
    const now=minuteOnTrip(startDate,timeZone);
    if(!Number.isFinite(now)||now<0||now>=deadline){setGuideNotice("Den lokala tiden ligger utanför resans datum och sluttid. Ändra datum eller sluttid innan du startar.");return;}
    setGuideStarted(true);setClockAnchor(Date.now());setClockBase(now);setGuideMinute(now);setGuideOrigin(startPoint);
    setGuideNotice(`Startad kl. ${timeLabel(now)} (${timeZone}). Sluttiden är fortfarande ${endTime}.`);
  };
  const completeStop = () => {
    if (!currentStop) return;
    const finish = guideNow;
    const arrival = arrived?.id === currentStop.id ? arrived.at : finish;
    setCompleted(items => [...items, { ...currentStop, arrival, departure: finish, minutes: Math.max(0, finish - arrival), travelMinutes: arrived?.travelMinutes ?? currentStop.travelMinutes, km: arrived?.km ?? currentStop.km }]);
    setArrived(null);
    setGuideOrigin(pointOf(currentStop)); setGpsOrigin(null); setGuideMinute(finish); setFirstId(undefined);
    setGuideNotice("Stoppet är klart. Tiderna för resten av dagen är omräknade.");
  };
  const stayLonger = () => {
    if (!currentStop) return;
    if (arrived?.id === currentStop.id) setArrived(value => value ? { ...value, until: value.until + 20 } : null);
    else setExtraMinutes(current => ({ ...current, [String(currentStop.id)]: (current[String(currentStop.id)] || 0) + 20 }));
    setPinnedIds(ids => ids.includes(currentStop.id) ? ids : [...ids, currentStop.id]); setFirstId(currentStop.id);
    setGuideNotice("20 minuter till vid nästa stopp. Stoppet behålls och resten av dagen räknas om.");
  };
  const [hungryLoading,setHungryLoading]=useState(false);
  const tripIdentity=useRef("");tripIdentity.current=JSON.stringify([city,startDate,endTime,chosenPlaces.map(p=>p.id),completed.map(p=>p.id)]);
  const hungry = async () => {
    if(arrived){setGuideNotice("Markera pågående besök klart innan du väljer nästa matstopp.");return;}
    if(!currentOrigin||hungryLoading)return;
    const identity=tripIdentity.current;
    setHungryLoading(true);setGuideNotice("Söker närliggande restauranger efter dina matval…");
    try{
      const params=new URLSearchParams({city,category:"Restauranger",options:restaurantPreferences.join('|'),sort:'near',origin:JSON.stringify(currentOrigin),radius:'3'});
      const response=await fetch(`/api/catalog?${params}`);const data=await response.json();if(!response.ok)throw new Error(data.error);
      if(identity!==tripIdentity.current)throw new Error("Planen ändrades under sökningen. Tryck på matknappen igen för aktuella förslag.");
      const fresh:CatalogPlace[]=data.items;
      const next=fresh.filter(p=>!completed.some(c=>c.id===p.id)&&!excludedIds.includes(p.id)).map(toRoutePlace).find(p=>plan({candidates:[...candidates.filter(c=>c.id!==p.id),p],origin:currentOrigin,destination:endPoint,start:guideNow,deadline,tempo,transportMode,pinned:[...pinnedIds,p.id],first:p.id}).feasible);
      if(!next){setGuideNotice("Ingen matchande restaurang inom 3 km ryms tillsammans med dina prioriterade stopp. Prova kortare besökstid, andra matval eller senare sluttid.");return;}
      const picked=fresh.find(p=>p.id===next.id)!;
      setChosenPlaces(items=>items.some(p=>p.id===picked.id)?items:[...items,picked]);
      setRouteSource(items=>[...items.filter(p=>p.id!==next.id),next]);setSelected(items=>items.includes("Restauranger")?items:[...items,"Restauranger"]);
      setFirstId(next.id);setPinnedIds(ids=>[...new Set([...ids,next.id])]);
      setGuideNotice(`${next.title} ligger nu först. Pris och öppettider behöver kontrolleras hos restaurangen.`);
    }catch(e){setGuideNotice(e instanceof Error?e.message:"Matförslagen kunde inte hämtas. Försök igen.");}finally{setHungryLoading(false);}
  };
  const updateGuideLocation = () => {
    if (!navigator.geolocation) { setGuideNotice("Position stöds inte i den här webbläsaren."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({coords}) => { setGpsOrigin({lat: coords.latitude, lon: coords.longitude}); setLocating(false); setGuideNotice("Rutten räknades om från din position. Tryck igen om du har flyttat dig."); }, () => { setLocating(false); setGuideNotice("Positionen kunde inte hämtas. Tillåt platsåtkomst eller använd den planerade startpunkten."); }, {timeout: 12000, maximumAge: 30000, enableHighAccuracy: true});
  };
  const arriveAtStop = () => {
    if (!currentStop) return;
    setArrived({ id: currentStop.id, at: guideNow, until: guideNow + currentStop.minutes, travelMinutes: currentStop.travelMinutes, km: currentStop.km });
    setGuideOrigin(pointOf(currentStop)); setGpsOrigin(null); setFirstId(currentStop.id);
    setGuideNotice("Besöket har startat. Återstående besökstid räknas ned.");
  };
  const canNavigate=route.length>0&&!!currentOrigin&&!!nextDestination&&distance(currentOrigin,nextDestination)>.01;
  const findTips=async()=>{
    if(!startPoint||!endPoint||!route.length||tipsLoading)return;
    const request=++tipRequest.current;
    setTipsLoading(true);setTips([]);setTipsNotice('');
    try{
      const gaps=schedule.route.filter(p=>(p.waitMinutes||0)>=30);
      const gap=gaps.sort((a,b)=>(b.waitMinutes||0)-(a.waitMinutes||0))[0];
      if(!gap){setTipsNotice('Ingen lucka på minst 30 minuter. Behåll marginalen till nästa stopp.');return;}
      const index=schedule.route.findIndex(p=>p.id===gap.id);
      const origin=index?pointOf(schedule.route[index-1])!:startPoint;
      const categories=selected.filter(c=>c!=='Restauranger');
      const results=await Promise.allSettled((categories.length?categories:['Sevärdheter']).map(async category=>{
        const query=new URLSearchParams({city,category,options:(categoryPreferences[category]||['Alla']).join('|'),origin:JSON.stringify(origin),sort:'near',radius:'3',purpose:'route'});
        try{return await fetchJson('/api/catalog?'+query);}catch{query.set('reserve','1');return fetchJson('/api/catalog?'+query);}
      }));
      if(request!==tipRequest.current){setTipsNotice('Planen ändrades under sökningen. Be om nya tips för den aktuella turen.');return;}
      const seen=new Set(route.map(p=>p.id));const found:Place[]=[];let limited=false;
      for(const result of results){
        if(result.status==='rejected'){limited=true;continue;}limited ||= !!result.value.warning;
        for(const item of result.value.items||[]){
          if(seen.has(item.id)||excludedIds.includes(item.id))continue;seen.add(item.id);
          const p={...toRoutePlace(item),notBefore:index?schedule.route[index-1].departure:guideNow,notAfter:gap.arrival};
          const trial=plan({candidates:[...schedule.route,p],origin:gpsOrigin||guideOrigin||startPoint,destination:endPoint,start:guideNow,deadline,tempo,transportMode,date:startDate,walkingLegs,pinned:[...schedule.route.map(s=>s.id),p.id]});
          if(trial.feasible&&trial.route.some(s=>s.id===p.id)&&schedule.route.every(old=>trial.route.some(s=>s.id===old.id&&(!old.meal||s.arrival<=old.arrival))))found.push(p);
        }
      }
      setTips(found.slice(0,3));setTipsNotice((limited?'Begränsat utbud. ':'')+(found.length?'Dessa förslag ryms utan att senarelägga dina planerade måltider. Välj ett i taget. Kontrollera öppettider.':'Inga nya passande platser kunde hittas. Dina befintliga stopp är kvar.'));
    }catch{setTipsNotice('Tipsen kunde inte hämtas. Försök igen.');}finally{setTipsLoading(false);}
  };
  const openTaxi = () => { if(!canNavigate)return; setTaxiPickup(currentOrigin ? `${currentOrigin.lat},${currentOrigin.lon}` : address); setTaxiDestination(nextDestination ? `${nextDestination.lat},${nextDestination.lon}` : endAddress); setTaxiOpen(true); };

  const storage=useTripSave({version:1,mealPreferences,activityPreferences,transportMode,locationError,city,address,endAddress,startDate,startTime,endTime,timeZone,selected,price,mealTimes,routeSource,chosenPlaces,startPoint,endPoint,routeLive,excludedIds,categoryPreferences,tempo,pinnedIds,extraMinutes,completed,guideOrigin,guideMinute,clockAnchor,clockBase,firstId,arrived,gpsOrigin},s=>{
    if(s.mealPreferences)setMealPreferences(s.mealPreferences);
    if(s.activityPreferences)setActivityPreferences(s.activityPreferences);
    if(s.transportMode==='walking'||s.transportMode==='mixed')setTransportMode(s.transportMode);
    if(s.mealTimes!==undefined)setMealTimes(s.mealTimes);
    if(typeof s.locationError==='string')setLocationError(s.locationError);
    if(s.city!==undefined)setCity(s.city);
    if(s.address!==undefined)setAddress(s.address);
    if(s.endAddress!==undefined)setEndAddress(s.endAddress);
    if(s.startDate!==undefined)setStartDate(s.startDate);
    if(s.startTime!==undefined)setStartTime(s.startTime);
    if(s.endTime!==undefined)setEndTime(s.endTime);
    if(s.timeZone!==undefined)setTimeZone(s.timeZone);
    if(s.selected!==undefined)setSelected(s.selected);
    if(s.price!==undefined)setPrice(s.price);
    if(s.routeSource!==undefined)setRouteSource(s.routeSource);
    if(s.chosenPlaces!==undefined)setChosenPlaces(s.chosenPlaces);
    if(s.startPoint!==undefined)setStartPoint(s.startPoint);
    if(s.endPoint!==undefined)setEndPoint(s.endPoint);
    if(s.routeLive!==undefined)setRouteLive(s.routeLive);
    if(s.excludedIds!==undefined)setExcludedIds(s.excludedIds);
    if(s.categoryPreferences!==undefined)setCategoryPreferences(s.categoryPreferences);
    if(s.tempo!==undefined)setTempo(s.tempo);
    if(s.pinnedIds!==undefined)setPinnedIds(s.pinnedIds);
    if(s.extraMinutes!==undefined)setExtraMinutes(s.extraMinutes);
    if(s.completed!==undefined)setCompleted(s.completed);
    if(s.guideOrigin!==undefined)setGuideOrigin(s.guideOrigin);
    if(s.guideMinute!==undefined)setGuideMinute(s.guideMinute);
    if(s.clockAnchor!==undefined)setClockAnchor(s.clockAnchor);
    if(s.clockBase!==undefined)setClockBase(s.clockBase);
    if(s.firstId!==undefined)setFirstId(s.firstId);
    if(s.arrived!==undefined)setArrived(s.arrived);
    if(s.gpsOrigin!==undefined)setGpsOrigin(s.gpsOrigin);
    setGuideStarted(false);setGuideNotice("Din sparade tur är återställd. Genomförda stopp finns kvar.");
  });

  return <main className={guideStarted ? "guiding" : ""}>
    <header className="header">
      <a href="#top" className="wordmark">ROAMWISE<span>®</span></a>
      <nav><a href="#results">RUTT</a><a href="#directory">INDEX</a><button className="circle-button" aria-label="Profil">LE</button></nav>
    </header>

    <section className="setup" id="top">
      <div className="setup-intro"><p className="overline">PERSONLIG STADSGUIDE</p><h1>Planera din dag.</h1><p>Välj plats, tid och upplevelser.</p></div>
      <div className="trip-save" role="status"><span>{storage.status}</span>{storage.error&&<button onClick={()=>storage.reloadRequired?window.location.reload():storage.retry()}>{storage.reloadRequired?"LADDA OM SPARAD TUR":"FÖRSÖK SPARA IGEN"}</button>}{storage.restored&&routeSource.length>0&&<button onClick={()=>{if(clockAnchor!=null)setGuideStarted(true);document.querySelector('#results')?.scrollIntoView({behavior:'smooth'});}}>FORTSÄTT MIN TUR →</button>}<button disabled={!storage.ready&&!storage.error} onClick={()=>{resetGuide();setExcludedIds([]);setStartDate(localClock(timeZone).date);}}>NY TUR MED SAMMA PLATSER</button><small>Turen sparas privat och återfinns med en cookie i den här webbläsaren.</small></div>
      <fieldset className="setup-panel" disabled={!planned || (!storage.ready&&!storage.error)}>
        <div className="planner-steps" aria-label="Tre steg till färdig rutt"><span className="active"><b>1</b> Plats & tid</span><span><b>2</b> Intressen</span><span><b>3</b> Färdig rutt</span></div>
        <div className="journey-fields" aria-label="Resans tider och adresser">
          <label><span>VILKEN STAD?</span><div><Icon name="search"/><input autoComplete="off" enterKeyHint="done" list="cities" value={city} onChange={(e) => { resetGuide(); setRouteSource([]); setChosenPlaces([]); setPinnedIds([]); setCity(e.target.value); setTimeZone(cityZone(e.target.value)||Intl.DateTimeFormat().resolvedOptions().timeZone); setStartPoint(null); setEndPoint(null); }} onKeyDown={(e) => e.key === "Enter" && buildRoute()} placeholder="Sök stad i hela världen"/><datalist id="cities"><option value="Barcelona"/><option value="Stockholm"/><option value="Paris"/><option value="London"/><option value="Tokyo"/><option value="New York"/></datalist><button type="button" className="locate-button" aria-label="Använd min position" onClick={(event) => { event.preventDefault(); useCurrentLocation(); }} disabled={locating}><Icon name="pin"/><span>{locating ? "SÖKER" : "MIN POSITION"}</span></button></div></label>
          <label className="address-field"><span>STARTADRESS</span><div><Icon name="pin"/><input autoComplete="off" enterKeyHint="done" value={address} onChange={(e) => { invalidateRoute(); setAddress(e.target.value); setStartPoint(null); }} placeholder="Hotell, station eller adress"/><button type="button" className="map-pick-button" onClick={(event) => { event.preventDefault(); setMapPickerTarget("start"); }}>KARTA</button></div></label>
          <label><span>DATUM</span><div><Icon name="calendar"/><input type="date" disabled={clockAnchor!=null} value={startDate} onInput={(e) => { setStartDate(e.currentTarget.value); }}/></div></label><label><span>STARTTID</span><div><Icon name="clock"/><input type="time" disabled={clockAnchor!=null} value={startTime} onInput={(e) => { setStartTime(e.currentTarget.value); }}/></div></label>
          <label className="address-field"><span>SLUTADRESS <button type="button" className="same-address" onClick={() => { invalidateRoute(); setEndAddress(address); setEndPoint(startPoint); }}>SAMMA SOM START</button></span><div><Icon name="pin"/><input autoComplete="off" enterKeyHint="done" value={endAddress} onChange={(e) => { invalidateRoute(); setEndAddress(e.target.value); setEndPoint(null);setMealPreferences(old=>({...old,Middag:{...old.Middag,placeId:undefined,placeName:undefined}})); }} placeholder="Där rutten ska avslutas"/><button type="button" className="map-pick-button" onClick={(event) => { event.preventDefault(); setMapPickerTarget("end"); }}>KARTA</button></div></label>
          <label><span>SLUTTID</span><div><Icon name="clock"/><input type="time" value={endTime} onInput={(e) => { setEndTime(e.currentTarget.value); }}/></div></label>
        </div>
        {locationError && <div className="location-message" role="status">{locationError}</div>}
        <label className="trip-timezone">TIDER I STADENS TIDSZON<select value={timeZone} onChange={e=>setTimeZone(e.target.value)} disabled={clockAnchor!=null}>{Array.from(new Set([timeZone,...Intl.supportedValuesOf('timeZone')])).map(zone=><option key={zone}>{zone}</option>)}</select></label>
        <div className="trip-shortcuts"><span>SNABBVAL</span><div><button onClick={() => setTripLength(180)}>3 TIM</button><button onClick={() => setTripLength(360)}>6 TIM</button><button onClick={() => setTripLength(600)}>HELDAG</button></div><b>{Math.floor(hours)} tim{hours % 1 ? ` ${Math.round((hours % 1) * 60)} min` : ""}</b></div>
        <div className="category-block">
          <div className="field-title"><span>2 · VAD VILL DU GÖRA?</span><small>{selected.length} valda</small></div>
          <div className="category-grid">{categoryDefinitions.map((category) => {
            const preferences = categoryPreferences[category.key] || [];
            const summary = !selected.includes(category.key)?"Välj":preferences.includes("Alla") ? "Alla" : preferences.length ? `${preferences.length} val` : "Välj";
            return <button key={category.key} onClick={() => openCategoryPicker(category)} className={selected.includes(category.key) ? "chosen" : ""} aria-haspopup="dialog" aria-label={`${category.label}: ${summary}`}><span className="category-glyph">{categoryGlyphs[category.key]}</span><em>{category.label}</em><b>+</b></button>;
          })}</div>
        </div>
        <DayControls city={city} meals={mealTimes} onMeals={v=>{setMealTimes(v);if(mealPreferences.Middag?.atDestination&&v.Middag)setEndTime(v.Middag);}} preferences={mealPreferences} onPreferences={v=>{setMealPreferences(v);invalidateRoute();}} activities={activityPreferences} onActivities={v=>{setActivityPreferences(v);invalidateRoute();}} selected={selected} transport={transportMode} onTransport={setTransportMode} endAddress={endAddress} endTime={endTime} onChoose={meal=>{setMealTarget(meal);openCategoryPicker(categoryDefinitions[0]);}}/>

        <div className="chosen-summary"><b>{chosenPlaces.length} platser valda</b><p>Öppna en kategori för att välja namngivna platser. Välj Prioriterad för stopp som ska behållas, eller Om tiden räcker för flexibla besök. Utan egna val föreslår appen närliggande platser.</p>{chosenPlaces.length > 0 && <div>{chosenPlaces.map(p=><button key={p.id} onClick={()=>toggleCatalogPlace(p)} aria-label={`Ta bort ${p.name}`}>{p.name} ×</button>)}</div>}</div>
        <button className="advanced-toggle" onClick={() => setAdvancedOpen((open) => !open)} aria-expanded={advancedOpen}><span><Icon name="sliders"/> FLER VAL</span><b>{advancedOpen ? "−" : "+"}</b></button>
        {advancedOpen && <div className="advanced-settings">
          <div className="tempo-control"><span>TEMPO</span><div>{["Lugnt","Normalt","Högt"].map((item) => <button key={item} className={tempo === item ? "active" : ""} onClick={() => setTempo(item)}>{item}</button>)}</div></div>
          <label><span>PRISNIVÅ (NÄR UPPGIFT FINNS)</span><select value={price} onChange={(e) => setPrice(e.target.value)}><option>Alla priser</option><option value="€">Låg</option><option value="€€">Mellan</option><option value="€€€">Hög</option></select></label>
          <p>{totalPreferences ? `${totalPreferences} underkategorier valda` : "Alla underkategorier visas"}</p>
        </div>}
        <button className="primary simple-primary" onClick={buildRoute} disabled={!planned || !city.trim() || !selected.length || !hours || !startDate || !address.trim() || !endAddress.trim()}>{planned ? <>SKAPA MIN RUTT <span>{chosenPlaces.length ? `${chosenPlaces.length} valda platser` : `${selected.length} intressen`} · {Math.round(hours)} tim</span></> : "SKAPAR DIN RUTT…"}<Icon name="arrow"/></button>
      </fieldset>
    </section>

    <section className="results" id="results">
      <div className="results-head">
        <div><p className="overline">DIN OPTIMERADE RUTT · {routeLive ? "VALDA PLATSER" : "VÄLJ PLATSER FÖR ATT BÖRJA"}</p><h2>{city || "Din stad"}, på ditt sätt.</h2><p>{address || "Start"} → {endAddress || "Slut"} · {startDate} · {startTime}–{endTime}{endTime < startTime ? " (+1 dag)" : ""}</p></div>
        <div className="metrics"><div><b>{route.length}</b><span>STOPP</span></div><div><b>{route.length?routeKm.toFixed(1).replace(".",",")+' KM':'—'}</b><span>TOTALT</span></div><div><b>{route.length?(schedule.transport + completed.reduce((sum, p) => sum + p.travelMinutes, 0))+' MIN':'—'}</b><span>UPPSKATTAD RESTID</span></div></div>
      </div>
      {(!startPoint||!endPoint)&&<p role="status">Start- och slutpunkt måste hittas innan avstånd, karta och tur kan beräknas. Skapa rutten eller välj punkterna på kartan. Dina valda platser finns kvar.</p>}
      {locationError&&<p role="status">{locationError}</p>}
      {routeError && <div className="route-error"><b>{route.length ? "RUTTEN VISAS MED BEGRÄNSAT UNDERLAG" : "INGEN NY RUTT KUNDE SKAPAS"}</b><span>{routeError}</span><button onClick={buildRoute} disabled={!planned}>{planned ? "FÖRSÖK IGEN" : "SÖKER PLATSER…"}</button></div>}
      {!planned ? <div className="loading"><span></span><p>Hämtar platser och beräknar avstånd och besökstider…</p></div> : <div className="route-layout">
        <div className="itinerary">
          {startPoint && endPoint && routeSource.length > 0 && <div className={`schedule-status${schedule.feasible&&!missingMeals.length&&!missingActivities.length ? "" : " time-warning"}`} role="status">
            <div><span>VID SLUTADRESSEN</span><b>{timeLabel(schedule.arrival)}</b></div><div><span>{schedule.margin < 0 ? "EFTER SLUTTID" : "MARGINAL"}</span><b>{Math.abs(schedule.margin)} min</b></div>
            <p>{schedule.feasible ? "Planen ryms med minst 15 minuters marginal. Restider är uppskattade; kontrollera avgångar när lokaltrafik ingår." : schedule.margin>=15 ? "Ett prioriterat stopp passar inte inom registrerade öppettider eller måltidstider. Byt plats eller ändra besökstiden." : "Tiden räcker inte med 15 minuters marginal. Korta ett prioriterat stopp, ändra sluttiden eller välj snabbare transport och kontrollera restiden."}</p>
            {missingActivities.length>0&&<p role="alert">Önskemål som saknas i planen: {missingActivities.map(categoryLabel).join(', ')}. Välj en plats eller ändra område och tid.</p>}{missingMeals.length>0&&<p role="alert">Måltider utan ett passande planerat stopp: {missingMeals.join(', ')}. Lägg till restauranger, ändra tiderna eller välj bort måltiden.</p>}
            {schedule.conflicts.length>0&&<p role="alert">Kan inte läggas in inom registrerade öppettider eller måltidstider: {schedule.conflicts.map(p=>p.title).join(', ')}.</p>}
            {schedule.route.some(p=>p.openingStatus==='Öppettider måste kontrolleras')&&<p>Öppettider saknas eller kräver manuell kontroll för vissa stopp. Tidsmässigt möjlig betyder inte att alla platser är öppna.</p>}
            {schedule.omitted.length > 0 && <p>{schedule.omitted.length} valfria stopp ryms inte just nu. <button onClick={() => setAdjusting(v => !v)}>VISA ALTERNATIV</button></p>}
          </div>}
          {guideStarted ? <section className={currentStop ? "quick-guide" : "quick-guide finished"}>
            <div className="guide-label"><span>{arrived ? "DU ÄR HÄR" : currentStop ? "NÄSTA STOPP" : "TILL SLUTADRESSEN"}</span><b>{completed.length} KLARA · {schedule.route.length} KVAR</b></div>
            <h3>{currentStop?.title || endAddress || "Slutpunkt"}</h3>
            <p>{currentStop ? `${categoryLabel(currentStop.category)} · ${currentStop.area}` : (schedule.omitted.length ? "Inga fler valfria stopp ryms. Fortsätt till slutadressen." : "Dagens stopp är klara. Sista sträckan återstår.")}</p>
            <div className="guide-leg"><span><b>{legMinutes} min</b><small>{currentLeg.mode==='transit'?'LOKALTRAFIK · UPPSKATTAT':'UPPSKATTAD PROMENAD'}</small></span><span><b>{arrived ? timeLabel(currentStop?.departure ?? guideNow) : currentStop ? timeLabel(currentStop.arrival) : timeLabel(schedule.arrival)}</b><small>{arrived ? "PLANERAD AVGÅNG" : "BERÄKNAD ANKOMST"}</small></span></div>
            <div className="guide-actions"><a href={currentNavigationUrl} target="_blank" rel="noreferrer">{transportStop ? `TILL ${transportStop.title.toUpperCase()}` : "TILL SLUTADRESSEN"} <Icon name="arrow"/></a>{currentStop && <button onClick={completeStop}>KLAR — NÄSTA STOPP <Icon name="check"/></button>}</div>
            <div className="guide-tools">{currentStop && !arrived && <button onClick={arriveAtStop}>JAG ÄR FRAMME</button>}{arrived && <span className="visit-countdown">{Math.max(0, arrived.until - guideNow)} min kvar av besöket</span>}<a href={transitUrl} target="_blank" rel="noreferrer">LOKALTRAFIK</a><button onClick={openTaxi}>TAXI</button><button onClick={updateGuideLocation} disabled={locating || !!arrived}>{locating ? "HÄMTAR POSITION…" : "FRÅN MIN POSITION"}</button>{currentStop && <><button onClick={stayLonger}>+20 MIN HÄR</button><button onClick={() => removeStop(currentStop)}>HOPPA ÖVER</button><button onClick={hungry} disabled={hungryLoading}>{hungryLoading?"SÖKER MAT…":"JAG ÄR HUNGRIG"}</button></>}<button onClick={() => setAdjusting(v => !v)}>JUSTERA PLANEN</button><button onClick={()=>setGuideStarted(false)}>TILL PLANERING</button></div>
            {guideNotice && <p className="guide-notice" role="status">{guideNotice}</p>}
          </section> : route.length ? <div className="route-actions"><button className="start-guide" onClick={startGuide}>{clockAnchor!=null?"FORTSÄTT MIN TUR":"STARTA NU"} <Icon name="arrow"/></button><button className="adjust-route" onClick={() => setAdjusting(v => !v)}><Icon name="sliders"/> JUSTERA</button></div> : null}
          {!guideStarted&&guideNotice&&<p className="guide-notice" role="status">{guideNotice}</p>}{undo&&<div className="undo-stop" role="status"><span>{undo.place.title} togs bort.</span><button onClick={undoRemove}>ÅNGRA</button></div>}
          <div className="route-note"><Icon name="walk"/><p><b>{routeLive ? "Platser från register eller ett tydligt märkt reservutbud." : "Din personliga rutt."}</b> Kontrollera öppettider för {startDate || "valt datum"}. Aktuella program och öppettider är inte verifierade. Heldragen linje visar hämtad gångväg. Prickad linje visar en uppskattad förbindelse, inte en verifierad gångväg eller linjesträckning.</p></div>
          {adjusting && schedule.omitted.length > 0 && <div className="omitted-stops"><b>OM TIDEN RÄCKER</b>{schedule.omitted.map(p => <div key={p.id}><span>{p.title} · {p.minutes} min</span><button onClick={() => setPinnedIds(ids => [...ids, p.id])}>PRIORITERAD</button></div>)}</div>}
          <div className="timeline-edge start-edge"><span></span><div><small>START · {startTime}</small><b>{address || "Startadress"}</b></div></div>
          {route.length>0&&<section className="omitted-stops" aria-label="Tips för ledig tid"><h3>Tid över längs turen?</h3><button onClick={findTips} disabled={tipsLoading}>{tipsLoading?'SÖKER TIPS…':'GE MIG TIPS LÄNGS TUREN'}</button><p role="status">{tipsNotice}</p>{tips.map(p=><div key={p.id}><span>{p.title} · {p.minutes} min · {p.openingHours||'Kontrollera öppettider'}</span><button onClick={()=>{setRouteSource(old=>[...old.filter(s=>s.id!==p.id),p]);setSelected(old=>old.includes(p.category)?old:[...old,p.category]);setTips([]);setTipsNotice('Stoppet är tillagt. Tiderna har räknats om.');}}>LÄGG TILL</button></div>)}</section>}
          {route.length ? route.map((place, index) => <article key={place.id} className={`place${active === place.id ? " active" : ""}${completed.some(p => p.id === place.id) ? " completed" : ""}`} onClick={() => setActive(place.id)}>
            <div className="number">{String(index + 1)}</div><img className="place-thumb" src={categoryImages[place.category]} alt=""/><div className="place-time"><b>{routeTime(index)}</b><span>{place.minutes} MIN</span></div>
            <div className="place-copy"><div className="place-top"><span>{categoryLabel(place.category)} · {place.area}</span>{place.price && <em>{place.price} · {place.cuisine}</em>}</div><h3>{place.meal?place.meal+" · ":""}{place.title}</h3>{place.openingStatus&&<p>{place.openingStatus}</p>}{!!place.waitMinutes&&<p>{place.waitMinutes} min fri tid före besöket</p>}<small className="place-window">{routeTime(index)} – {timeLabel(place.departure)}</small><p>{place.description}</p><small>{place.meta}</small>{place.openingHours && <p className="opening-hours">Registrerade öppettider: {place.openingHours} · kontrollera avvikelser för valt datum.</p>}<div className="leg-summary"><span>{legInfo(index).minutes} {legInfo(index).mode}</span><span>{place.minutes} min här</span></div>{adjusting && !completed.some(p => p.id === place.id) ? <div className="adjust-controls"><label className="visit-duration">BESÖK (MIN)<input type="number" min="5" max="360" step="5" disabled={arrived?.id===place.id} value={place.minutes} onClick={e=>e.stopPropagation()} onChange={e=>{const minutes=Number(e.target.value);if(minutes>=5&&minutes<=360){setExtraMinutes(values=>({...values,[String(place.id)]:0}));setRouteSource(items=>items.map(p=>p.id===place.id?{...p,minutes}:p));setChosenPlaces(items=>items.map(p=>p.id===place.id?{...p,visitMinutes:minutes}:p));}}}/></label><button aria-pressed={pinnedIds.includes(place.id)} onClick={e => { e.stopPropagation(); setPinnedIds(ids => ids.includes(place.id) ? ids.filter(id => id !== place.id) : [...ids, place.id]); }}>{pinnedIds.includes(place.id) ? "✓ PRIORITERAD" : "PRIORITERAD"}</button><button onClick={(e) => { e.stopPropagation(); removeStop(place) }}>TA BORT</button><button onClick={(e) => { e.stopPropagation(); swapStop(place) }}>BYT STOPP</button></div> : place.action && <button onClick={(e) => { e.stopPropagation(); openAction(place) }}>{place.action}<Icon name="arrow"/></button>}</div>
          </article>) : <div className="empty"><h3>{selected.length ? "Inga stopp att visa" : "Välj minst en kategori"}</h3><p>{schedule.omitted.length ? "Prova mer tid, ett snabbare tempo eller välj ett prioriterat stopp under alternativ." : "Välj stad, adresser och intressen och tryck Skapa min rutt."}</p></div>}
          <div className="timeline-edge end-edge"><span></span><div><small>SLUT · SENAST {endTime}</small><b>{endAddress || "Slutadress"}</b></div></div>
        </div>
        <aside className="map-panel">
          <div className="map-label-top"><span><b>{city || "Din stad"}</b><small>{address || "Start"} → {endAddress || "Slut"}</small></span><button onClick={() => setMapOpen(true)}><Icon name="sliders"/> STOR KARTA</button></div>
          <div className="walking-status" role="status">{!schedule.route.length?"Ingen aktiv rutt att visa.":walking.loading?"Hämtar gångvägar…":walking.complete?"Gångvägar hämtade · beräknad tid för ditt tempo":"En eller flera sträckor är uppskattade."}{schedule.route.length>0&&!walking.complete&&!walking.loading&&<button onClick={walking.retry}>FÖRSÖK HÄMTA GÅNGVÄGAR</button>}<a href="https://valhalla.openstreetmap.de" target="_blank" rel="noreferrer">Valhalla · © OpenStreetMap</a></div><div className="real-map-wrap"><iframe srcDoc={mapDocument} className="route-map" title={`Interaktiv karta för rutten i ${city}`}/><button className="map-expand" onClick={() => setMapOpen(true)}>ÖPPNA STOR KARTA ↗</button></div>
          <div className="map-bottom"><span><b>TRANSPORT TILL NÄSTA STOPP</b><small>{transportStop?.title || endAddress || "Slutadressen"}</small></span>{canNavigate?<div className="map-actions"><button className="taxi-button" onClick={openTaxi}>BOKA TAXI</button><a className="transit-button" href={transitUrl} target="_blank" rel="noreferrer">LOKALTRAFIK <Icon name="arrow"/></a><a href={currentNavigationUrl} target="_blank" rel="noreferrer">NAVIGERA NÄSTA <Icon name="arrow"/></a></div>:<p>Navigation blir tillgänglig när det finns en sträcka att följa.</p>}</div>
        </aside>
      </div>}
    </section>

    <section className="directory" id="directory">
      <div className="directory-head"><div><p className="overline">VÄLJ DINA PLATSER</p><h2>Utforska {city}.</h2></div><p>Sök restauranger, sevärdheter, butiker och kultur. Lägg till dina val direkt i rutten.</p></div>
      {planned&&(storage.ready||storage.error)&&<CatalogBrowser city={city} origin={currentOrigin} routePoints={[currentOrigin,...schedule.route.map(pointOf),endPoint].filter((p):p is Point=>!!p)} tempo={tempo} onLocate={updateGuideLocation} selectedIds={chosenPlaces.map(p=>p.id)} onToggle={toggleCatalogPlace}/>}
    </section>

    <section className="explore" id="explore"><div><p className="overline">ALLT PÅ ETT STÄLLE</p><h2>Från första kaffet<br/>till sista låten.</h2></div><div className="explore-list">{["Plan med besökstid och gångtid","Slutadress med tidsmarginal","Stopp du kan prioritera","Kontrollera öppettider hos verksamheten","Navigation och lokaltrafik till nästa stopp"].map((text,i) => <p key={text}><span>{String(i+1).padStart(2,"0")}</span>{text}<Icon name="check"/></p>)}</div></section>
    <footer><a href="#top" className="wordmark">ROAMWISE<span>®</span></a><p>DIN STAD. DIN TID. DIN RUTT.</p><small>© 2026</small></footer>
    <nav className="mobile-tabs" aria-label="Huvudnavigering"><a href="#top"><span>⌂</span>PLAN</a><a href="#results"><span>①</span>RUTT</a><button onClick={() => setMapOpen(true)}><span>◇</span>KARTA</button><a href="#directory"><span>☷</span>LISTA</a></nav>

    {mapPickerTarget && <div className="address-picker-backdrop">
      <section className="address-picker" role="dialog" aria-modal="true" aria-label={mapPickerTarget === "start" ? "Välj startadress på karta" : "Välj slutadress på karta"}>
        <div className="address-picker-head"><div><small>{mapPickerTarget === "start" ? "STARTADRESS" : "SLUTADRESS"}</small><b>Tryck på valfri plats i världen</b></div><button onClick={() => setMapPickerTarget(null)} aria-label="Stäng kartan"><Icon name="close"/></button></div>
        <div className="address-picker-map-wrap"><iframe srcDoc={addressPickerDocument} title="Välj adress på världskartan" className="address-picker-map"/>{mapPickLoading && <div className="address-picker-loading"><span></span><b>LÄSER ADRESS…</b></div>}</div>
        <div className="address-picker-foot"><span>GLOBAL KARTDATA</span><b>© OpenStreetMap contributors</b></div>
      </section>
    </div>}

    {activeCategory && <div className="category-picker-backdrop" onMouseDown={() => {setCategoryPicker(null);setMealTarget(null);}}>
      <section className="category-picker" role="dialog" aria-modal="true" aria-labelledby="category-picker-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="category-picker-handle" aria-hidden="true"></div>
        <button className="category-picker-close" onClick={() => {setCategoryPicker(null);setMealTarget(null);}} aria-label="Stäng kategorivalet"><Icon name="close"/></button>
        <p className="overline">{activeCategory.label.toUpperCase()} / UNDERKATEGORIER</p>
        <h2 id="category-picker-title">{mealTarget?`Välj restaurang för ${mealTarget.toLowerCase()}`:activeCategory.eyebrow}</h2>
        <p className="category-picker-lead">Välj inriktningar och sök bland platserna nedan. Lägg till de platser du vill besöka.</p>
        <div className="category-choice-grid">{activeCategory.options.map((option) => <button key={option} className={categoryDraft.includes(option) ? "active" : ""} aria-pressed={categoryDraft.includes(option)} onClick={() => toggleCategoryDraft(option)}><span>{option}</span><b>{categoryDraft.includes(option) ? "✓" : "+"}</b></button>)}</div>

        {planned&&(storage.ready||storage.error)&&<CatalogBrowser selectionLabel={mealTarget?`VÄLJ FÖR ${mealTarget.toUpperCase()}`:undefined} city={city} fixedCategory={activeCategory.key} fixedOptions={categoryDraft} origin={currentOrigin} routePoints={[currentOrigin,...schedule.route.map(pointOf),endPoint].filter((p):p is Point=>!!p)} tempo={tempo} onLocate={updateGuideLocation} selectedIds={chosenPlaces.map(p=>p.id)} onToggle={toggleCatalogPlace}/>}
        <p className="catalog-coverage">Alla betyder alla matchningar i den valda datakällan. Undertyper kräver att informationen finns registrerad. Sök på namn under Alla om en plats saknas.</p>

        <div className="category-picker-actions">
          <button className="category-picker-apply" onClick={applyCategoryPicker}>ANVÄND {categoryDraft.includes("Alla") ? "ALLA" : categoryDraft.length || 1} VAL <Icon name="arrow"/></button>
          {selected.includes(activeCategory.key) && <button className="category-picker-remove" onClick={removeCategory}>TA BORT KATEGORIN</button>}
        </div>
      </section>
    </div>}

    {booking && <div className="modal-backdrop" onMouseDown={() => setBooking(null)}><div className="modal" role="dialog" aria-modal="true" aria-label="Platsinformation" onMouseDown={e => e.stopPropagation()}>
      <button className="modal-close" onClick={() => setBooking(null)} aria-label="Stäng"><Icon name="close"/></button>
      <p className="overline">ÖPPETTIDER & BOKNING</p><h2>{booking.title}</h2><p className="modal-lead">Planerat besök: {startDate} kl. {routeTime(Math.max(0, route.findIndex(p => p.id === booking.id)))}. Kontrollera öppettider och eventuell bokning hos verksamheten.</p>
      <p>{booking.openingHours ? `Registrerade öppettider: ${booking.openingHours}` : "Öppettider saknas i kartinformationen."}</p>
      {booking.website && <a className="external-action" href={booking.website} target="_blank" rel="noreferrer">ÖPPNA VERKSAMHETENS WEBBPLATS ↗</a>}
      <a className="external-action" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${booking.title}, ${city}`)}`} target="_blank" rel="noreferrer">VISA PLATSEN I GOOGLE MAPS ↗</a>
      <small className="demo-note">Ingen bokning har gjorts. Roamwise kan inte verifiera lediga bord eller biljetter.</small>
    </div></div>}

    {taxiOpen && <div className="modal-backdrop" onMouseDown={() => setTaxiOpen(false)}><div className="modal taxi-modal" role="dialog" aria-modal="true" aria-label="Taxi till nästa stopp" onMouseDown={e => e.stopPropagation()}>
      <button className="modal-close" onClick={() => setTaxiOpen(false)} aria-label="Stäng"><Icon name="close"/></button>
      <p className="overline">TRANSPORT / TAXI</p><h2>Till {transportStop?.title || endAddress || "slutadressen"}.</h2><p className="modal-lead">Sträckan är förberedd från {gpsOrigin ? "din senast hämtade position" : completed.at(-1)?.title || address}. Öppna din taxitjänst för aktuellt pris och bokning.</p>
      <div className="booking-fields taxi-fields"><label><span>HÄMTAS VID</span><input value={taxiPickup} onChange={e => setTaxiPickup(e.target.value)}/></label><label><span>DESTINATION</span><input value={taxiDestination} onChange={e => setTaxiDestination(e.target.value)}/></label></div>
      <a className="external-action" href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(taxiPickup)}&destination=${encodeURIComponent(taxiDestination)}&travelmode=driving`} target="_blank" rel="noreferrer">VISA BILRUTT ↗</a>
      <p>Ingen taxitjänst är ansluten för bokning. Kopiera upphämtning och destination till den taxitjänst du använder.</p><small className="demo-note">Ingen bil är bokad. Planens gångtider ändras inte när du öppnar en extern transporttjänst.</small>
    </div></div>}

    {mapOpen && <div className="modal-backdrop map-backdrop" onMouseDown={() => setMapOpen(false)}><div className="route-map-modal" role="dialog" aria-modal="true" aria-label="Ruttkarta" onMouseDown={(e) => e.stopPropagation()}>
      <div className="route-map-modal-head"><span><small>PERSONLIG RUTT / {city.toUpperCase()}</small><b>{route.length} stopp · {address || "Start"} → {endAddress || "Slut"}</b></span><button onClick={() => setMapOpen(false)} aria-label="Stäng kartan"><Icon name="close"/></button></div>
      <iframe srcDoc={mapDocument} className="route-map-large" title={`Stor interaktiv karta för rutten i ${city}`}/>
      <div className="route-map-modal-foot"><p><b>Interaktiv karta.</b> Zooma, dra och klicka på stoppen för information.</p><a href={currentNavigationUrl} target="_blank" rel="noreferrer">NAVIGERA NÄSTA <Icon name="arrow"/></a></div>
    </div></div>}
  </main>
}
