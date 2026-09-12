import './register-ts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROUTE_AREA,
  areaDistrict,
  areaPoint,
  cityAreas,
  cityConfig,
  cityDistricts,
  cityFromAddress,
  cityZone,
  geocodeLocation,
  isNewYork,
  landmark,
  stripCityWords,
} from '../app/cities.ts';

test('New York aliases resolve to one configuration with districts and neighbourhoods', () => {
  for (const spelling of ['New York', ' new york city ', 'NYC']) {
    assert.equal(cityConfig(spelling)?.key, 'new-york');
    assert.equal(isNewYork(spelling), true);
  }
  assert.equal(cityZone('nyc'), 'America/New_York');
  assert.deepEqual(cityDistricts('New York').slice(0, 3), [
    'Hela New York',
    'Manhattan',
    'Brooklyn',
  ]);
  assert.deepEqual(cityAreas('New York'), [
    ROUTE_AREA,
    'Williamsburg',
    'Brooklyn',
    'Manhattan',
    'Harlem',
  ]);
  assert.deepEqual(areaPoint('New York', 'Harlem'), { lat: 40.8081, lon: -73.9448 });
  assert.equal(areaPoint('New York', 'Brooklyn'), undefined, 'Brooklyn uses the start point');
  assert.equal(areaDistrict('New York', 'Williamsburg'), 'Brooklyn');
  assert.equal(areaDistrict('New York', 'Harlem'), 'Manhattan');
  assert.equal(areaDistrict('New York', ROUTE_AREA), undefined);
  assert.equal(geocodeLocation('New York'), 'New York City, New York, USA');
  assert.equal(geocodeLocation('New York', 'Queens'), 'Queens, New York City, New York, USA');
});

test('other cities get a time zone but no invented neighbourhoods', () => {
  assert.equal(cityZone('Stockholm'), 'Europe/Stockholm');
  assert.deepEqual(cityAreas('Paris'), [ROUTE_AREA]);
  assert.deepEqual(cityDistricts('Paris'), ['Hela Paris']);
  assert.equal(geocodeLocation('Paris'), 'Paris');
});

test('unknown cities fall back to the typed name and no assumptions', () => {
  assert.equal(cityConfig('Reykjavik'), undefined);
  assert.equal(cityZone('Reykjavik'), undefined);
  assert.equal(isNewYork('Reykjavik'), false);
  assert.deepEqual(cityAreas('Reykjavik'), [ROUTE_AREA]);
  assert.deepEqual(cityDistricts('Reykjavik'), ['Hela Reykjavik']);
  assert.equal(geocodeLocation('Reykjavik'), 'Reykjavik');
});

test('addresses reveal their city and can be reduced to an exact place name', () => {
  const config = cityFromAddress('Red Rooster Harlem, Manhattan, New York, USA');
  assert.equal(config?.key, 'new-york');
  assert.equal(
    stripCityWords('Red Rooster Harlem, Manhattan, New York, USA', config),
    'red rooster harlem',
  );
  assert.equal(stripCityWords('310 Lenox Avenue,, Harlem', config), '310 lenox avenue');
  assert.equal(cityFromAddress('Sveavägen 1, Stockholm')?.key, 'stockholm');
  assert.equal(cityFromAddress('Somewhere, Nowhere'), undefined);
});

test('landmarks are exact names only and say when they are preferred over the geocoder', () => {
  const config = cityConfig('New York');
  assert.equal(
    landmark(config, 'Times Square')?.label,
    'Times Square · ungefärlig punkt på torget',
  );
  assert.equal(landmark(config, 'Times Square')?.preferred, undefined);
  assert.equal(landmark(config, 'williamsburg')?.preferred, true);
  assert.equal(landmark(config, '42nd street'), undefined, 'street addresses are never guessed');
});
