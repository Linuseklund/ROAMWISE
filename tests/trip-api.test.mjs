import './register-ts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('../drizzle/0000_past_pride.sql', import.meta.url), 'utf8'));
const db = {
  prepare(sql) {
    return {
      bind(...values) {
        return {
          first: async () => sqlite.prepare(sql).get(...values) || null,
          run: async () => ({
            meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) },
          }),
        };
      },
    };
  },
};
globalThis.__testCloudflareEnv = { DB: db };
const { default: worker } = await import('../dist/server/index.js');
const env = { ASSETS: { fetch: async () => new Response('Missing', { status: 404 }) } };
const run = (method = 'GET', cookie = '', body, origin = 'https://example.test') =>
  worker.fetch(
    new Request('https://example.test/api/trip', {
      method,
      headers: { cookie, origin, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }),
    env,
    { waitUntil() {} },
  );
const state = {
  version: 1,
  city: 'New York',
  routeSource: [{ id: 'a' }],
  chosenPlaces: [],
  completed: [{ id: 'done' }],
  clockAnchor: 1000,
};
test('private trip saves, restores progress and refuses cross-visitor access and stale writes', async () => {
  const r = await run();
  assert.equal(r.status, 200);
  const cookie = r.headers.get('set-cookie').split(';')[0];
  assert.match(r.headers.get('set-cookie'), /HttpOnly/);
  assert.match(r.headers.get('set-cookie'), /Secure/);
  assert.equal((await r.json()).state, null);
  const saved = await run('PUT', cookie, { state, revision: 0 });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).revision, 1);
  const restored = await run('GET', cookie);
  assert.deepEqual((await restored.json()).state, state);
  const stranger = await run();
  assert.equal((await stranger.json()).state, null);
  assert.equal((await run('PUT', cookie, { state, revision: 0 })).status, 409);
  assert.equal(
    (await run('PUT', cookie, { state, revision: 1 }, 'https://other.test')).status,
    403,
  );
  assert.equal((await run('PUT', '', { state, revision: 1 })).status, 401);
  assert.equal(
    (
      await run('PUT', cookie, {
        state: { ...state, completed: [{ id: 'done' }, { id: 'second' }] },
        revision: 1,
      })
    ).status,
    200,
  );
  assert.equal((await (await run('GET', cookie)).json()).state.completed.length, 2);
});
