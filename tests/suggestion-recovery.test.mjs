import './register-ts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../app/api/catalog/route.ts';
const request = (category, purpose = 'route') =>
  new Request(
    'http://localhost/api/catalog?' +
      new URLSearchParams({
        city: 'New York',
        category,
        purpose,
        origin: JSON.stringify({ lat: 40.7536, lon: -73.9832 }),
        radius: '3',
        sort: 'near',
      }),
  );
const place = {
  type: 'node',
  id: 1,
  lat: 40.754,
  lon: -73.983,
  tags: { name: 'Test venue', tourism: 'museum' },
};
test('nearby suggestions recover using a second map server and bounded local queries', async () => {
  const original = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(new URL(url));
    if (urls.length === 1) throw new Error('timeout');
    return Response.json({ elements: [place] });
  };
  try {
    const res = await GET(request('Museum'));
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.items.length, 1);
    assert.equal(urls.length, 2);
    assert.notEqual(urls[0].host, urls[1].host);
    assert.match(urls[0].searchParams.get('data'), /around:3000/);
    assert.match(urls[0].searchParams.get('data'), /timeout:5/);
    assert.match(body.note, /urval/);
  } finally {
    globalThis.fetch = original;
  }
});
test('a timed out map query with usable results yields suggestions with an explicit warning', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ remark: 'timeout', elements: [place] });
  try {
    const res = await GET(request('Museum'));
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.items[0].name, 'Test venue');
    assert.match(body.warning, /avbröts/);
  } finally {
    globalThis.fetch = original;
  }
});
test('restaurant register failure falls back to genuine OSM results with correct attribution', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes('cityofnewyork')) throw new Error('timeout');
    return Response.json({
      elements: [{ ...place, tags: { name: 'Test cafe', amenity: 'cafe' } }],
    });
  };
  try {
    const res = await GET(request('Restauranger'));
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.items[0].source, 'OpenStreetMap');
  } finally {
    globalThis.fetch = original;
  }
});
test('incomplete catalogue uses clearly labelled reserve, not partial upstream data', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ remark: 'timeout', elements: [place] });
  try {
    const res = await GET(request('Museum', ''));
    assert.equal(res.status, 200);
    assert.match((await res.json()).warning, /reservutbud/);
  } finally {
    globalThis.fetch = original;
  }
});
test('total service outage returns the documented Midtown reserve', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('fetch failed');
  };
  try {
    const res = await GET(request('Museum'));
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.match(body.warning, /reservutbud/);
    assert.equal(body.items[0].id, 'reserve-moma');
  } finally {
    globalThis.fetch = original;
  }
});
test('failed detour ranking falls back to filtered catalogue with stable continuation', async () => {
  const original = globalThis.fetch;
  const queries = [];
  globalThis.fetch = async (input) => {
    const q = new URL(input).searchParams;
    queries.push(q);
    if (q.get('$select') === 'camis,max(latitude) as lat,max(longitude) as lon')
      throw new Error('ranking timeout');
    const next = q.get('$where').includes("camis > '50000099'");
    return Response.json(
      Array.from({ length: next ? 1 : 101 }, (_, i) => ({
        camis: String(50000000 + (next ? 100 : 0) + i),
        name: 'Venue ' + i,
        borough: 'Manhattan',
        lat: '40.754',
        lon: '-73.983',
      })),
    );
  };
  try {
    const params = new URLSearchParams({
      city: 'New York',
      category: 'Restauranger',
      borough: 'Manhattan',
      options: 'Italienskt',
      sort: 'detour',
      origin: JSON.stringify({ lat: 40.7536, lon: -73.9832 }),
    });
    const first = await GET(new Request('http://localhost/api/catalog?' + params));
    const body = await first.json();
    assert.equal(first.status, 200);
    assert.equal(body.items.length, 100);
    assert.equal(body.nextCursor, 'catalog:50000099');
    assert.match(body.warning, /katalogordning/);
    assert.equal(body.total, undefined);
    assert.match(queries[1].get('$where'), /Manhattan/);
    assert.match(queries[1].get('$where'), /ITALIAN/);
    params.set('cursor', body.nextCursor);
    const next = await (await GET(new Request('http://localhost/api/catalog?' + params))).json();
    assert.equal(queries.length, 3);
    assert.equal(next.items[0].id, 'nyc-50000100');
    assert.equal(next.nextCursor, null);
  } finally {
    globalThis.fetch = original;
  }
});
test('full catalogue uses backup map server if the primary rejects the request', async () => {
  const original = globalThis.fetch;
  const hosts = [];
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    if (url.host.includes('nominatim'))
      return Response.json([
        { osm_type: 'relation', osm_id: 175905, boundingbox: [40, 41, -74, -73] },
      ]);
    hosts.push(url.host);
    return hosts.length === 1
      ? new Response('Unavailable', { status: 503 })
      : Response.json({ elements: [place] });
  };
  try {
    const res = await GET(
      new Request('http://localhost/api/catalog?city=New%20York&category=Museum'),
    );
    assert.equal(res.status, 200);
    assert.equal((await res.json()).items.length, 1);
    assert.equal(hosts.length, 2);
    assert.notEqual(hosts[0], hosts[1]);
  } finally {
    globalThis.fetch = original;
  }
});
