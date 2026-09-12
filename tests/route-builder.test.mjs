import './register-ts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoute } from '../app/route-builder.ts';

const origin = { lat: 40.7536, lon: -73.9832 };
const place = (id, category, overrides = {}) => ({
  id,
  name: id,
  category,
  area: 'Manhattan',
  address: '1 Test Street',
  lat: origin.lat + 0.001,
  lon: origin.lon + 0.001,
  details: [category],
  source: 'test',
  ...overrides,
});

const baseInput = {
  city: 'New York',
  address: 'Bryant Park',
  endAddress: 'Bryant Park',
  startPoint: origin,
  endPoint: origin,
  selected: ['Restauranger', 'Museum', 'Sevärdheter'],
  chosenPlaces: [],
  mealPreferences: {},
  activityPreferences: {},
  categoryPreferences: { Restauranger: ['Alla'], Museum: ['Konst'], Sevärdheter: ['Alla'] },
  mealTimes: { Lunch: '12:30', Middag: '18:00' },
  excludedIds: [],
};

function catalogue(results, log = []) {
  return async (query) => {
    log.push(Object.fromEntries(query));
    const category = query.get('category');
    const items = results[category];
    if (!items) throw new Error('down');
    return { items, nextCursor: null, source: 'test', sourceUrl: '', note: '' };
  };
}

test('known points skip geocoding; one stop per activity and many restaurants are picked', async () => {
  const log = [];
  const restaurants = Array.from({ length: 30 }, (_, i) => place(`r${i}`, 'Restauranger'));
  const result = await buildRoute(baseInput, {
    geocode: async () => assert.fail('should not geocode known points'),
    searchCatalog: catalogue(
      {
        Restauranger: restaurants,
        Museum: [place('m1', 'Museum'), place('m2', 'Museum')],
        Sevärdheter: [place('s1', 'Sevärdheter')],
      },
      log,
    ),
  });
  assert.deepEqual(result.origin, origin);
  assert.equal(result.picked.filter((p) => p.category === 'Restauranger').length, 24);
  assert.deepEqual(
    result.picked.filter((p) => p.category !== 'Restauranger').map((p) => p.id),
    ['m1', 's1'],
  );
  assert.equal(result.routeWarning, '');
  const museum = log.find((q) => q.category === 'Museum');
  assert.equal(museum.options, 'Konst');
  assert.equal(museum.borough, 'Hela New York');
  assert.equal(museum.purpose, 'route');
});

test('chosen places come first and are not searched for again', async () => {
  const chosen = place('my-museum', 'Museum');
  const result = await buildRoute(
    { ...baseInput, selected: ['Museum'], chosenPlaces: [chosen] },
    {
      geocode: async () => [],
      searchCatalog: async () => assert.fail('museum already chosen'),
    },
  );
  assert.deepEqual(
    result.picked.map((p) => p.id),
    ['my-museum'],
  );
});

test('a category without suggestions is reported but does not block the others', async () => {
  const result = await buildRoute(baseInput, {
    geocode: async () => [],
    searchCatalog: catalogue({
      Restauranger: [place('r1', 'Restauranger')],
      Sevärdheter: [place('s1', 'Sevärdheter')],
    }),
  });
  assert.deepEqual(
    result.picked.map((p) => p.id),
    ['r1', 's1'],
  );
  assert.match(result.routeWarning, /Förslag saknas för Museum/);
});

test('meal and activity areas map to the city districts and search centres', async () => {
  const log = [];
  await buildRoute(
    {
      ...baseInput,
      selected: ['Restauranger', 'Klädbutiker'],
      mealPreferences: { Lunch: { area: 'Harlem', food: 'Grönt & lätt' } },
      activityPreferences: { Klädbutiker: { area: 'Williamsburg' } },
    },
    {
      geocode: async () => [],
      searchCatalog: catalogue(
        {
          Restauranger: [place('r1', 'Restauranger')],
          Klädbutiker: [place('k1', 'Klädbutiker', { area: 'Brooklyn · Williamsburg' })],
        },
        log,
      ),
    },
  );
  const lunch = log.find((q) => q.category === 'Restauranger' && q.borough === 'Manhattan');
  assert.ok(lunch, 'Harlem lunch searches Manhattan');
  assert.equal(lunch.options, 'Vegetariskt|Veganskt');
  assert.deepEqual(JSON.parse(lunch.origin), { lat: 40.8081, lon: -73.9448 });
  const clothes = log.find((q) => q.category === 'Klädbutiker');
  assert.equal(clothes.borough, 'Brooklyn');
  assert.deepEqual(JSON.parse(clothes.origin), { lat: 40.7178, lon: -73.958 });
});

test('dinner at the destination requires a restaurant that is actually there', async () => {
  const dinnerInput = {
    ...baseInput,
    selected: ['Restauranger'],
    mealPreferences: { Middag: { atDestination: true } },
  };
  await assert.rejects(
    buildRoute(dinnerInput, {
      geocode: async () => [{ lat: String(origin.lat), lon: String(origin.lon) }],
      searchCatalog: catalogue({ Restauranger: [] }),
    }),
    /Välj middagsrestaurangen/,
  );
  const saved = place('reserve-x', 'Restauranger', { lat: origin.lat, lon: origin.lon });
  const result = await buildRoute(dinnerInput, {
    geocode: async () => [
      { lat: String(origin.lat), lon: String(origin.lon), place: saved, warning: 'Sparad plats' },
    ],
    searchCatalog: catalogue({ Restauranger: [place('r1', 'Restauranger')] }),
  });
  assert.equal(result.dinner?.id, 'reserve-x');
  assert.equal(result.locationWarning, 'Sparad plats');
  assert.equal(result.picked[0].id, 'reserve-x');
  const far = place('reserve-far', 'Restauranger', { lat: origin.lat + 0.1, lon: origin.lon });
  await assert.rejects(
    buildRoute(
      {
        ...dinnerInput,
        chosenPlaces: [far],
        mealPreferences: { Middag: { atDestination: true, placeId: 'reserve-far' } },
      },
      { geocode: async () => [], searchCatalog: catalogue({ Restauranger: [] }) },
    ),
    /ligger inte vid slutadressen/,
  );
});

test('unknown addresses fail clearly and nothing at all fails clearly', async () => {
  await assert.rejects(
    buildRoute(
      { ...baseInput, startPoint: null },
      { geocode: async () => [], searchCatalog: async () => ({ items: [] }) },
    ),
    /Adressen hittades inte/,
  );
  await assert.rejects(
    buildRoute(
      { ...baseInput, selected: ['Museum'] },
      {
        geocode: async () => [],
        searchCatalog: async () => {
          throw new Error('down');
        },
      },
    ),
    /Inga platser kunde hämtas/,
  );
});
