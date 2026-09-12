import './register-ts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { withMeals, defaultMeals } from '../app/meals.ts';
import { plan } from '../app/planner.ts';
import { backupResults, midtownBackup } from '../app/midtown-backup.ts';
const origin = { lat: 40.7536, lon: -73.9832 };
test('meal matching finds viable assignment regardless of restaurant order', () => {
  const places = [
    ['dinner', '17:00-23:00'],
    ['breakfast', '08:00-12:00'],
    ['lunch', '12:00-16:00'],
  ].map(([id, hours]) => ({
    id,
    category: 'Restauranger',
    minutes: 45,
    ...origin,
    openingHours: 'Mo-Su ' + hours,
  }));
  const assigned = withMeals(places, defaultMeals, 540, '2026-09-09');
  assert.equal(assigned[0].meal, 'Middag');
  assert.equal(assigned[1].meal, 'Frukost');
  assert.equal(assigned[2].meal, 'Lunch');
  const result = plan({
    candidates: assigned,
    origin,
    destination: origin,
    start: 540,
    deadline: 1260,
    date: '2026-09-09',
    pinned: assigned.map((p) => p.id),
  });
  assert.equal(result.feasible, true);
});
test('finished meals stay assigned when a new restaurant is added', () => {
  const places = ['new', 'done', 'next'].map((id) => ({
    id,
    category: 'Restauranger',
    minutes: 45,
    ...origin,
  }));
  const assigned = withMeals(places, defaultMeals, 540, '2026-09-09', [
    { id: 'done', meal: 'Frukost' },
  ]);
  assert.equal(assigned[1].meal, 'Frukost');
  assert.notEqual(assigned[0].meal, 'Frukost');
});
test('reserve supports three meals, shopping and culture within a full day', () => {
  const candidates = withMeals(
    midtownBackup.map((p) => ({ ...p, minutes: p.visitMinutes })),
    defaultMeals,
    540,
    '2026-09-09',
  );
  const r = plan({
    candidates,
    origin,
    destination: origin,
    start: 540,
    deadline: 1260,
    date: '2026-09-09',
    pinned: candidates.map((p) => p.id),
  });
  assert.equal(r.feasible, true);
  assert.equal(r.route.length, 6);
  assert.equal(r.route.filter((p) => p.meal).length, 3);
  assert.ok(r.arrival + 15 <= 1260);
});
test('reserve never invents matches for other cities or unsupported filters', () => {
  for (const query of [
    'city=Paris&category=Museum',
    'city=New%20York&category=Museum&options=Teknik',
    'city=New%20York&category=Restauranger&borough=Queens',
  ])
    assert.equal(backupResults(new Request('http://localhost/?' + query)), null);
});
