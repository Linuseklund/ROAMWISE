import test from 'node:test';
import assert from 'node:assert/strict';
import { plan, tripMinutes, timeLabel, directions } from '../app/planner.ts';
const origin = { lat: 41.387, lon: 2.1701 };
const destination = { lat: 41.4, lon: 2.18 };
const candidates = [
  { id: 'breakfast', category: 'Restauranger', minutes: 55, lat: 41.3818, lon: 2.1702 },
  { id: 'museum', category: 'Museum', minutes: 75, lat: 41.383, lon: 2.1669 },
  { id: 'shop', category: 'Klädbutiker', minutes: 50, lat: 41.3915, lon: 2.1651 },
  { id: 'lunch', category: 'Restauranger', minutes: 80, lat: 41.3853, lon: 2.1811 },
];
test('every accepted short or long route includes travel, return leg and buffer', () => {
  for (const duration of [30, 60, 180, 360, 600]) {
    const result = plan({ candidates, origin, destination, start: 540, deadline: 540 + duration });
    let previous = 540;
    for (const stop of result.route) {
      assert.equal(stop.arrival, previous + stop.travelMinutes);
      assert.equal(stop.departure, stop.arrival + stop.minutes);
      previous = stop.departure;
    }
    assert.equal(result.arrival, previous + result.home.minutes);
    if (result.feasible) assert.ok(result.arrival + 15 <= 540 + duration);
    else assert.equal(result.route.length, 0);
  }
});
test('never silently drops mandatory stops when impossible', () => {
  const result = plan({
    candidates,
    origin,
    destination,
    start: 540,
    deadline: 580,
    pinned: ['museum'],
  });
  assert.deepEqual(
    result.route.map((p) => p.id),
    ['museum'],
  );
  assert.equal(result.feasible, false);
});
test('extra time preserves current mandatory stop and recalculates the rest', () => {
  const base = {
    candidates,
    origin,
    destination,
    start: 540,
    deadline: 760,
    first: 'breakfast',
    pinned: ['breakfast'],
  };
  const before = plan(base);
  const after = plan({ ...base, extra: { breakfast: 20 } });
  assert.equal(after.route[0].id, 'breakfast');
  assert.equal(after.route[0].minutes, 75);
  assert.ok(after.route.length <= before.route.length);
  assert.ok(after.arrival + 15 <= 760);
});
test('shorter than one hour remains short; overnight is explicit; equal times mean zero', () => {
  assert.equal(tripMinutes('09:00', '09:20'), 20);
  assert.equal(tripMinutes('23:00', '01:00'), 120);
  assert.equal(tripMinutes('09:00', '09:00'), 0);
  assert.equal(timeLabel(1500), '01:00 (+1 dag)');
});
test('skipping removes only that stop; finished stops stay outside replanning', () => {
  const result = plan({
    candidates: candidates.slice(2),
    origin: candidates[0],
    destination,
    start: 590,
    deadline: 1000,
  });
  assert.ok(result.route.every((p) => !['breakfast', 'museum'].includes(p.id)));
  assert.equal(result.route.length, 2);
});
test('transit uses the same next destination as walking, not trip endpoint', () => {
  const walk = new URL(directions(origin, candidates[0]));
  const transit = new URL(directions(origin, candidates[0], 'transit'));
  assert.equal(
    transit.searchParams.get('destination'),
    `${candidates[0].lat},${candidates[0].lon}`,
  );
  assert.equal(walk.searchParams.get('destination'), transit.searchParams.get('destination'));
  assert.equal(transit.searchParams.get('travelmode'), 'transit');
});
test('slower walking changes the estimate; mandatory stops report lost margin', () => {
  const input = {
    candidates,
    origin,
    destination,
    start: 540,
    deadline: 1000,
    pinned: candidates.map((p) => p.id),
  };
  assert.ok(
    plan({ ...input, tempo: 'Lugnt' }).transport > plan({ ...input, tempo: 'Högt' }).transport,
  );
});
test('visit countdown does not shift planned departure as time passes', () => {
  const stop = candidates[0],
    until = 640;
  const before = plan({
    candidates: [{ ...stop, minutes: until - 600 }],
    origin: stop,
    destination,
    start: 600,
    deadline: 800,
    pinned: [stop.id],
  });
  const after = plan({
    candidates: [{ ...stop, minutes: until - 620 }],
    origin: stop,
    destination,
    start: 620,
    deadline: 800,
    pinned: [stop.id],
  });
  assert.equal(before.route[0].departure, after.route[0].departure);
});
test('actual walking legs including return leg control feasibility', async () => {
  const { legKey } = await import('../app/walking.ts');
  const stop = candidates[0];
  const legs = {
    [legKey(origin, stop, 'Normalt')]: { minutes: 35, km: 2, shape: [] },
    [legKey(stop, destination, 'Normalt')]: { minutes: 80, km: 5, shape: [] },
  };
  const result = plan({
    candidates: [stop],
    origin,
    destination,
    start: 600,
    deadline: 780,
    pinned: [stop.id],
    walkingLegs: legs,
  });
  assert.equal(result.route[0].arrival, 635);
  assert.equal(result.arrival, 770);
  assert.equal(result.transport, 115);
  assert.equal(result.feasible, false);
});
test('New York clock handles local date and overnight without using device timezone', async () => {
  const { localClock, minuteOnTrip } = await import('../app/trip-time.ts');
  assert.deepEqual(localClock('America/New_York', new Date('2026-09-05T02:30:00Z')), {
    date: '2026-09-04',
    minutes: 1350,
  });
  assert.equal(
    minuteOnTrip('2026-09-04', 'America/New_York', new Date('2026-09-05T05:30:00Z')),
    1530,
  );
  assert.equal(
    minuteOnTrip('2026-09-05', 'America/New_York', new Date('2026-09-05T05:30:00Z')),
    90,
  );
  assert.deepEqual(localClock('America/New_York', new Date('2026-12-05T15:00:00Z')), {
    date: '2026-12-05',
    minutes: 600,
  });
});
