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
