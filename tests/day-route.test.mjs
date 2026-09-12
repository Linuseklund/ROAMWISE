import './register-ts.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {plan} from '../app/planner.ts';
import {withMeals,defaultMeals} from '../app/meals.ts';
import {openingIntervals} from '../app/opening.ts';
const origin={lat:40.7536,lon:-73.9832};
const places=[0,1,2,3,4].map((n)=>({id:n,category:n<3?'Restauranger':n===3?'Klädbutiker':'Sevärdheter',lat:40.754+n*.001,lon:-73.9832,minutes:n<3?70:45,openingHours:'Mo-Su 08:00-22:00'}));
test('New York day separates three meals and fits shopping and sightseeing before return',()=>{
 const candidates=withMeals(places,defaultMeals,540);
 const r=plan({candidates,origin,destination:origin,start:540,deadline:1260,date:'2026-09-07',pinned:candidates.map(p=>p.id)});
 assert.equal(r.feasible,true);assert.equal(r.route.length,5);
 assert.ok(r.route.find(p=>p.meal==='Frukost').arrival>=540);
 assert.ok(r.route.find(p=>p.meal==='Lunch').arrival>=750);
 assert.ok(r.route.find(p=>p.meal==='Middag').arrival>=1080);
 assert.ok(r.arrival+15<=1260);
 console.log(r.route.map(p=>({meal:p.meal||p.category,arrival:p.arrival,departure:p.departure})));
});
test('closed shop is not scheduled; late opening waits and entire visit must fit',()=>{
 const p={...places[3],openingHours:'Mo 14:00-15:00'};
 const r=plan({candidates:[p],origin,destination:origin,start:540,deadline:1260,date:'2026-09-07',pinned:[p.id]});
 assert.equal(r.route[0].arrival,840);
 const closed=plan({candidates:[{...p,minutes:90}],origin,destination:origin,start:540,deadline:1260,date:'2026-09-07',pinned:[p.id]});
 assert.equal(closed.route.length,0);assert.equal(closed.feasible,false);assert.equal(closed.conflicts.length,1);
});
test('weekly hours, night openings and unsupported holiday rules are conservative',()=>{
 assert.deepEqual(openingIntervals('Mo off','2026-09-07'),[]);
 assert.ok(openingIntervals('Su 22:00-02:00','2026-09-07').some(([a,b])=>a<0&&b===120));
 assert.equal(openingIntervals('Mo-Fr 09:00-17:00; PH off','2026-09-07'),null);
 assert.equal(openingIntervals(undefined,'2026-09-07'),null);
});
