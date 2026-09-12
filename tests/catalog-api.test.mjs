import './register-ts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { default: worker } = await import('../dist/server/index.js');
const env = { ASSETS: { fetch: async () => new Response('Not found', { status: 404 }) } };
const ctx = { waitUntil() {}, passThroughOnException() {} };
const run = (query) => worker.fetch(new Request('http://localhost/api/catalog?' + query), env, ctx);
// Initialize the framework fetch wrapper before installing test doubles.
await run('category=invalid');
test('restaurant endpoint applies borough, cuisine and stable pagination', async () => {
  const realFetch = globalThis.fetch;
  let requested;
  globalThis.fetch = async (input) => {
    requested = new URL(input);
    return Response.json(
      Array.from({ length: 101 }, (_, i) => ({
        camis: String(50000000 + i),
        name: `Restaurant ${i}`,
        borough: 'Manhattan',
        street: 'BROADWAY',
        building: '1',
        cuisine: 'Italian',
        lat: '40.76',
        lon: '-73.99',
      })),
    );
  };
  try {
    const r = await run(
      'city=New%20York&category=Restauranger&borough=Manhattan&options=Italienskt',
    );
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.items.length, 100);
    assert.equal(body.nextCursor, '50000099');
    assert.equal(body.items[0].lat, 40.76);
    assert.match(requested.searchParams.get('$where'), /boro = 'Manhattan'/);
    assert.match(requested.searchParams.get('$where'), /ITALIAN/);
    assert.equal(requested.searchParams.get('$group'), 'camis');
  } finally {
    globalThis.fetch = realFetch;
  }
});
test('OSM endpoint exposes all matches through pages, beyond previous 140 limit', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input) =>
    String(input).includes('nominatim')
      ? Response.json([{ osm_type: 'relation', osm_id: 175905, boundingbox: [40, 41, -74, -73] }])
      : Response.json({
          elements: Array.from({ length: 241 }, (_, i) => ({
            type: 'node',
            id: i,
            lat: 40.75 + i * 0.0001,
            lon: -73.98,
            tags: { name: `Record ${String(i).padStart(3, '0')}`, shop: 'music' },
          })),
        });
  try {
    const r = await run('city=New%20York&category=Butiker&options=Skivor%20%26%20vinyl&cursor=200');
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.total, 241);
    assert.equal(body.items.length, 41);
    assert.equal(body.nextCursor, null);
    assert.equal(body.items[0].name, 'Record 200');
  } finally {
    globalThis.fetch = realFetch;
  }
});
test('partial upstream results yield a labelled reserve rather than a complete catalogue', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input) =>
    String(input).includes('nominatim')
      ? Response.json([{ osm_type: 'relation', osm_id: 175905, boundingbox: [40, 41, -74, -73] }])
      : Response.json({ remark: 'timeout', elements: [] });
  try {
    const r = await run('city=New%20York&category=Museum');
    assert.equal(r.status, 200);
    assert.match((await r.json()).warning, /reservutbud/);
  } finally {
    globalThis.fetch = realFetch;
  }
});
test('nearby food ranks the complete matching coordinate set before fetching details', async () => {
  const realFetch = globalThis.fetch;
  const queries = [];
  globalThis.fetch = async (input) => {
    const q = new URL(input).searchParams;
    queries.push(q);
    if (q.get('$select') === 'camis,max(latitude) as lat,max(longitude) as lon')
      return Response.json([
        { camis: '50000001', lat: '40.770', lon: '-73.9832' },
        { camis: '50000002', lat: '40.754', lon: '-73.9832' },
      ]);
    return Response.json([
      { camis: '50000001', name: 'Far', lat: '40.770', lon: '-73.9832' },
      { camis: '50000002', name: 'Near', lat: '40.754', lon: '-73.9832' },
    ]);
  };
  try {
    const r = await run(
      new URLSearchParams({
        city: 'New York',
        category: 'Restauranger',
        sort: 'near',
        origin: JSON.stringify({ lat: 40.7536, lon: -73.9832 }),
        radius: '3',
      }),
    );
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.items[0].name, 'Near');
    assert.equal(body.total, 2);
    assert.match(queries[0].get('$where'), /latitude between/);
    assert.match(queries[1].get('$where'), /camis in/);
  } finally {
    globalThis.fetch = realFetch;
  }
});
