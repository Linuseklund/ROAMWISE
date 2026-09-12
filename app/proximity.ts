import { distance, type Point } from './planner';
export const validPoint = (p: any): p is Point => p && typeof p.lat==='number' && typeof p.lon==='number' && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat)<=90 && Math.abs(p.lon)<=180;
export function proximity(p:Point, origin:Point, route:Point[], tempo='Normalt') {
  const km=distance(origin,p);
  const points=route.length?route:[origin];
  let detour=distance(origin,p)*2;
  if(points.length>1) detour=Math.min(...points.slice(1).map((b,i)=>Math.max(0,distance(points[i],p)+distance(p,b)-distance(points[i],b))));
  const nearRoute=Math.min(...points.map(a=>distance(a,p)));
  const speed=tempo==='Lugnt'?3.5:tempo==='Högt'?5.5:4.5;
  return {km,nearRoute,detourMinutes:Math.ceil(detour*1.3/speed*60)};
}
