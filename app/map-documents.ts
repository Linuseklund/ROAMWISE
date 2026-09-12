// HTML documents rendered inside sandboxed iframes (srcDoc). Keeping Leaflet out of the
// React bundle keeps the main page light; the iframe only receives plain data.
import { categoryLabel } from './labels';
import { pointOf, type Point } from './planner';
import type { Place, ScheduledPlace } from './types';
import { legKey, type WalkingLegs } from './walking';

const LEAFLET_VERSION = '1.9.4';
const LEAFLET_CSS = `<link rel="stylesheet" href="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">`;
const LEAFLET_JS = `<script src="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>`;
const TILES = `L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);`;
const CONTROL_CSS =
  '.leaflet-control-attribution{font-size:10px}.leaflet-control-zoom a{width:44px!important;height:44px!important;line-height:44px!important}.leaflet-popup-content{font-size:14px}';

export const MAP_PICK_MESSAGE = 'roamwise-map-pick';

/** Map of the planned route with numbered stops and fetched or estimated walking legs. */
export function routeMapDocument(
  route: ScheduledPlace[],
  start: Point | null,
  end: Point | null,
  city: string,
  walkingLegs: WalkingLegs,
  tempo: string,
  offset = 0,
) {
  const locations = [start, ...route.map(pointOf), end].filter((p): p is Point => !!p);
  const paths = locations.slice(1).map((b, i) => {
    const a = locations[i];
    const walking = route[i]?.travelMode !== 'transit' && walkingLegs[legKey(a, b, tempo)];
    return {
      points: walking
        ? walking.shape
        : [
            [a.lat, a.lon],
            [b.lat, b.lon],
          ],
      real: !!walking,
    };
  });
  const points = route
    .filter((p) => p.lat != null && p.lon != null)
    .map((p) => ({ lat: p.lat, lon: p.lon, title: p.title, category: categoryLabel(p.category) }));
  const payload = JSON.stringify({ points, start, end, city, paths, offset }).replace(
    /</g,
    '\\u003c',
  );
  const style = `html,body,#map{height:100%;margin:0}body{font-family:Helvetica,Arial,sans-serif}.leaflet-tile{filter:grayscale(1)}.num{width:30px;height:30px;border-radius:50%;background:#111;color:#fff;border:2px solid #fff;display:grid;place-items:center;font:800 12px Helvetica,Arial}.start,.end{width:14px;height:14px;border-radius:50%;background:#fff;border:4px solid #111}.end{background:#111;border-color:#fff;box-shadow:0 0 0 2px #111}.leaflet-popup-content{font:700 12px Helvetica,Arial;line-height:1.25}${CONTROL_CSS}`;
  const script = `const d=${payload};const center=d.start||d.points[0]||{lat:40.7536,lon:-73.9832};const map=L.map('map',{zoomControl:true}).setView([center.lat,center.lon],13);${TILES}const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const coords=[];if(d.start){coords.push([d.start.lat,d.start.lon]);L.marker([d.start.lat,d.start.lon],{icon:L.divIcon({className:'',html:'<div class="start"></div>',iconSize:[22,22],iconAnchor:[11,11]})}).addTo(map).bindPopup('<b>Startadress</b>');}d.points.forEach((p,i)=>{coords.push([p.lat,p.lon]);L.marker([p.lat,p.lon],{icon:L.divIcon({className:'',html:'<div class="num">'+(i+1+d.offset)+'</div>',iconSize:[34,34],iconAnchor:[17,17]})}).addTo(map).bindPopup('<b>'+(i+1+d.offset)+'. '+esc(p.title)+'</b><br>'+esc(p.category));});if(d.end){coords.push([d.end.lat,d.end.lon]);L.marker([d.end.lat,d.end.lon],{icon:L.divIcon({className:'',html:'<div class="end"></div>',iconSize:[22,22],iconAnchor:[11,11]})}).addTo(map).bindPopup('<b>Slutadress</b>');}if(coords.length>1){d.paths.forEach(p=>L.polyline(p.points,{color:'#111',weight:4,opacity:.85,dashArray:p.real?null:'2 9'}).addTo(map));map.fitBounds(coords,{padding:[40,40]});}`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${LEAFLET_CSS}<style>${style}</style></head><body><div id="map"></div>${LEAFLET_JS}<script>${script}</script></body></html>`;
}

/** World map where a tap sends the chosen coordinate back to the parent window. */
export function mapPickerDocument(center: Point | null, target: 'start' | 'end') {
  const point = center || { lat: 20, lon: 0 };
  const zoom = center ? 14 : 2;
  const label = target === 'start' ? 'startadress' : 'slutadress';
  const style = `html,body,#map{height:100%;margin:0}body{font-family:Arial,sans-serif}.leaflet-tile{filter:grayscale(.75)}.hint{position:fixed;z-index:1000;left:50%;top:14px;transform:translateX(-50%);width:max-content;max-width:calc(100% - 28px);padding:11px 15px;border-radius:999px;background:#171713;color:#fff;font:800 11px Arial;box-shadow:0 8px 25px #0004}${CONTROL_CSS}`;
  const marker = center ? `L.marker([${point.lat},${point.lon}]).addTo(map)` : 'null';
  const script = `const map=L.map('map').setView([${point.lat},${point.lon}],${zoom});${TILES}let marker=${marker};map.on('click',e=>{if(marker)marker.setLatLng(e.latlng);else marker=L.marker(e.latlng).addTo(map);window.parent.postMessage({type:'${MAP_PICK_MESSAGE}',lat:e.latlng.lat,lon:e.latlng.lng},'*')});`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${LEAFLET_CSS}<style>${style}</style></head><body><div class="hint">Tryck på kartan för att välja ${label}</div><div id="map"></div>${LEAFLET_JS}<script>${script}</script></body></html>`;
}

export type { Place };
