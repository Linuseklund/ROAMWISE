import test from 'node:test';
import assert from 'node:assert/strict';
import {plan} from '../app/planner.ts';
import {withMeals} from '../app/meals.ts';
import {midtownBackup,downtownBackup} from '../app/midtown-backup.ts';
const origin={lat:40.758,lon:-73.9855},destination={lat:40.7186,lon:-73.988};
test('unresolved endpoints cannot produce a plausible partial route',()=>{
 for(const endpoints of [{origin:null,destination},{origin,destination:null}]){
 const result=plan({...endpoints,candidates:[{id:1,category:'Sevärdheter',minutes:20,...origin}],start:540,deadline:1320});
 assert.equal(result.route.length,0);assert.equal(result.feasible,false);assert.equal(result.km,0);
 }
});
test('corridor reserve includes vintage and a dinner near the destination at 20:00',()=>{
 const places=[...midtownBackup,...downtownBackup].filter(p=>p.category==='Restauranger'||p.id==='reserve-buffalo-east'||p.id==='reserve-nypl').map(p=>({...p,minutes:p.visitMinutes}));
 const assigned=withMeals(places,{Frukost:'09:00',Lunch:'12:30',Middag:'20:00'},540,'2026-09-08',[],{origin,destination}).filter(p=>p.category!=='Restauranger'||p.meal);
 const result=plan({candidates:assigned,origin,destination,start:540,deadline:1320,date:'2026-09-08',pinned:assigned.filter(p=>p.meal).map(p=>p.id)});
 assert.equal(result.feasible,true);assert.equal(result.route.find(p=>p.meal==='Middag').id,'reserve-freemans');assert.equal(result.route.find(p=>p.meal==='Middag').arrival,1200);
 assert.ok(result.route.some(p=>p.id==='reserve-buffalo-east'));assert.ok(result.km>4);
});
