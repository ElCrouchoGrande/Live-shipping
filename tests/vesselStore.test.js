import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVesselStore } from '../server/vesselStore.js';

const pos = (mmsi, lat, lon) => ({ kind: 'position', mmsi, lat, lon, cog: null, sog: 5, heading: 90, name: 'X' });

test('apply then snapshot returns the vessel', () => {
  const s = createVesselStore({ staleMs: 1000 });
  s.apply(pos(1, 10, 20), 1000);
  const snap = s.snapshot();
  assert.equal(snap.length, 1);
  assert.equal(snap[0].mmsi, 1);
  assert.equal(snap[0].lat, 10);
});

test('position updates dedupe by MMSI', () => {
  const s = createVesselStore({ staleMs: 1000 });
  s.apply(pos(1, 10, 20), 1000);
  s.apply(pos(1, 11, 21), 1500);
  assert.equal(s.size(), 1);
  assert.equal(s.snapshot()[0].lat, 11);
});

test('static data merges shipType without creating a positionless snapshot entry', () => {
  const s = createVesselStore({ staleMs: 1000 });
  s.apply({ kind: 'static', mmsi: 2, name: 'Y', shipType: 70 }, 1000);
  assert.equal(s.snapshot().length, 0); // no position yet
  s.apply(pos(2, 5, 6), 1100);
  const v = s.snapshot()[0];
  assert.equal(v.shipType, 70);
});

test('pruneStale removes vessels older than staleMs', () => {
  const s = createVesselStore({ staleMs: 1000 });
  s.apply(pos(1, 10, 20), 1000);
  s.apply(pos(2, 10, 20), 1800);
  const removed = s.pruneStale(2100); // vessel 1 lastSeen 1000, older than 2100-1000=1100
  assert.equal(removed, 1);
  assert.equal(s.size(), 1);
  assert.equal(s.snapshot()[0].mmsi, 2);
});
