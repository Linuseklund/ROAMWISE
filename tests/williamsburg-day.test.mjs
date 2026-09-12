import test from 'node:test';import assert from 'node:assert/strict';
import {plan,journeyLeg} from '../app/planner.ts';
import {withMeals} from '../app/meals.ts';
import {activityWindows} from '../app/day-preferences.ts';
import {reservePlaces,backupResults} from '../app/midtown-backup.ts';
import {GET} from '../app/api/geo/route.ts';
const origin={lat:40.7178,lon:-73.958},destination={lat:40.8081,lon:-73.9448};
const meals={Frukost:'09:00',Lunch:'13:00',Middag:'20:00'};
const preferences={Frukost:{area:'Williamsburg',food:'Grönt & lätt'},Lunch:{area:'Manhattan',strict:true},Middag:{placeId:'reserve-red-rooster',strict:true,atDestination:true}};
function story(mode='mixed',start=540,extra=false){
 const raw=reservePlaces.filter(p=>p.category==='Restauranger'||['reserve-buffalo-williamsburg','reserve-nike-nyc','reserve-nypl',...(extra?['reserve-moma']:[])].includes(p.id)).map(p=>({...p,minutes:p.visitMinutes,description:p.details.join(' ')}));
 const candidates=activityWindows(withMeals(raw,meals,540,'2026-09-10',[],{origin,destination},preferences),{Klädbutiker:{period:'Före lunch'},Sneakers:{period:'Efter lunch'},Sevärdheter:{period:'Efter lunch'}},meals).filter(p=>p.category!=='Restauranger'||p.meal);
 return plan({origin,destination,start,deadline:1200,transportMode:mode,candidates,date:'2026-09-10',pinned:candidates.map(p=>p.id)});
}
test('Williamsburg day includes every requested activity and protects Red Rooster at 20:00',()=>{
 const s=story();assert.equal(s.feasible,true);assert.equal(s.route.length,6);
 assert.match(s.route.find(p=>p.meal==='Frukost').name,/Butcher/);
 assert.equal(s.route.find(p=>p.meal==='Lunch').arrival,780);
 assert.ok(s.route.find(p=>p.category==='Klädbutiker').departure<=780);
 assert.ok(s.route.find(p=>p.category==='Sneakers').arrival>780);
 assert.equal(s.route.at(-1).id,'reserve-red-rooster');assert.equal(s.route.at(-1).arrival,1200);assert.equal(s.arrival,1185);
 assert.ok(s.route.some(p=>p.travelMode==='transit'));
});
test('late start cannot silently move a locked dinner or claim full success',()=>{const s=story('mixed',1190);assert.equal(s.feasible,false);assert.ok(!s.route.some(p=>p.meal==='Middag'&&p.arrival>1200));});
test('transport modes change time estimates without claiming a timetable',()=>{const walk=journeyLeg(origin,destination);const mixed=journeyLeg(origin,destination,'Normalt','mixed');assert.equal(walk.mode,'walking');assert.equal(mixed.mode,'transit');assert.ok(mixed.minutes<walk.minutes);});
test('reserve respects borough and named search even when far from origin',()=>{
 const result=backupResults(new Request('http://test/api/catalog?borough=Brooklyn&category=Klädbutiker&options=Vintage'));
 assert.ok(result.items.every(p=>p.area.includes('Brooklyn')));
 const rooster=backupResults(new Request('http://test/api/catalog?q=Red%20Rooster&origin='+JSON.stringify(origin)));
 assert.equal(rooster.items[0].id,'reserve-red-rooster');
});
test('known NYC start and venue remain available during geocoder outage',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('offline');};
 try{for(const q of ['Williamsburg, Brooklyn, New York','Red Rooster, Harlem, New York']){const r=await GET(new Request('http://test/api/geo?q='+encodeURIComponent(q)));assert.equal(r.status,200);assert.ok((await r.json())[0].warning);}}finally{globalThis.fetch=original;}
});

test('adding a flexible museum protects shopping before lunch and fixed dinner',()=>{const s=story('mixed',540,true);assert.equal(s.feasible,true);assert.equal(s.route.length,7);assert.ok(s.route.find(p=>p.id==='reserve-buffalo-williamsburg').departure<=780);assert.equal(s.route.at(-1).arrival,1200);});
