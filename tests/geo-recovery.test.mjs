import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../app/api/geo/route.ts';
test('outage resolves only known neighborhood names with an explicit approximation warning', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('offline');
  };
  try {
    const r = await GET(
      new Request('http://localhost/api/geo?q=Lower%20East%20Side,%20New%20York,%20New%20York'),
    );
    assert.equal(r.status, 200);
    const data = await r.json();
    assert.match(data[0].warning, /ungefärlig/);
    assert.equal(Number(data[0].lat), 40.7186);
    const unknown = await GET(
      new Request('http://localhost/api/geo?q=123%20Unknown%20Street,%20New%20York'),
    );
    assert.equal(unknown.status, 502);
  } finally {
    globalThis.fetch = original;
  }
});
