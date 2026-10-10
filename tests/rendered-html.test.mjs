import './register-ts.mjs';
import assert from "node:assert/strict";
import test from "node:test";

test("renders the Roamwise mobile planning controls", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /Roamwise — Din personliga stadsguide/);
  assert.match(html, /MIN POSITION/);
  assert.match(html, /New York/);
  assert.match(html, /Bryant Park/);
  assert.match(html, /Utforska/);

  assert.doesNotMatch(html, /Låg kö just nu|Få biljetter|Tiden är tillgänglig/);
  assert.match(html, /STARTADRESS/);
  assert.match(html, /SLUTADRESS/);
  assert.match(html, /class="map-pick-button">KARTA/);
  assert.match(html, /<em>Kläder<\/em>/);
  assert.match(html, /aria-haspopup="dialog"/);
});

test("renders the New York house vinyl guide", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-vinyl`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/vinyl", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /House på vinyl — Roamwise New York/);
  assert.match(html, /A-1 Record Shop/);
  assert.match(html, /Superior Elevation/);
  assert.match(html, /690 Woodward Garage/);
  assert.match(html, /Casa Amadeo/);
  assert.match(html, /Majors Records &amp; Video/);
  assert.match(html, /Staten Island-färjan/);
  assert.match(html, /Öppettider okända/);
  assert.match(html, /RIDGEWOOD(<!-- -->)? · (<!-- -->)?QUEENS/);
  assert.match(html, /SUBWAY FRÅN MIN POSITION/);
  assert.match(html, /BEGAGNAT/);
  assert.match(html, /Närmaste station/);
});

test("renders the New York sneaker guide", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-sneakers`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/sneakers", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Sneakers på linjen — Roamwise New York/);
  assert.match(html, /Kith Manhattan/);
  assert.match(html, /Flight Club/);
  assert.match(html, /STREETWEAR 2ND HAND/);
  assert.match(html, /Mr\. Throwback/);
  assert.match(html, /Närmaste station/);
});

test("renders the combined vinyl and sneaker guide", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-nyc`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/nyc", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Vinyl &amp; sneakers på linjen — Roamwise New York/);
  assert.match(html, /A-1 Record Shop/);
  assert.match(html, /Flight Club/);
  assert.match(html, /VINYL · HOUSE/);
  assert.match(html, /SNEAKERS &amp; STREETWEAR/);
});
