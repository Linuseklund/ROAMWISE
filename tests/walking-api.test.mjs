import './register-ts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const {default:worker}=await import('../dist/server/index.js');
const env={ASSETS:{fetch:async()=>new Response('Missing',{status:404})}};
const run=p=>worker.fetch(new Request('https://example.test/api/walking?'+new URLSearchParams(p)),env,{waitUntil(){}});
await run({points:'[]'});
test('walking uses pedestrian costing, returns actual leg timing and rejects upstream errors',async()=>{
 const realFetch=globalThis.fetch;
 const points=[{lat:40.7536,lon:-73.9832},{lat:40.758,lon:-73.9855}];
 let requested;
 globalThis.fetch=async input=>{requested=JSON.parse(new URL(input).searchParams.get('json'));return Response.json({trip:{status:0,legs:[{summary:{time:587.013,length:.728},shape:'??'}]}});};
 try{
  const r=await run({points:JSON.stringify(points),tempo:'Lugnt'});assert.equal(r.status,200);const data=await r.json();
  assert.equal(requested.costing,'pedestrian');assert.equal(requested.costing_options.pedestrian.walking_speed,3.5);
  assert.equal(Object.values(data.legs)[0].minutes,10);assert.equal(Object.values(data.legs)[0].km,.728);
  globalThis.fetch=async()=>Response.json({error:'No path'},{status:400});
  assert.equal((await run({points:JSON.stringify(points)})).status,502);
  assert.equal((await run({points:JSON.stringify([{lat:999,lon:0},points[1]])})).status,400);
 }finally{globalThis.fetch=realFetch;}
});
