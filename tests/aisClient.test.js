import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextBackoff, buildSubscription } from '../server/aisClient.js';

test('nextBackoff grows exponentially and caps at 30s', () => {
  assert.equal(nextBackoff(0), 1000);
  assert.equal(nextBackoff(1), 2000);
  assert.equal(nextBackoff(2), 4000);
  assert.equal(nextBackoff(5), 30000);
  assert.equal(nextBackoff(10), 30000);
});

test('buildSubscription uses [lat, lon] bounding box ordering (AISStream, not GeoJSON)', () => {
  const sub = buildSubscription('my-key');
  // AISStream uses [lat, lon]; GeoJSON uses [lon, lat]. This ordering is
  // correct as-is — a future "fix" flipping it would silently return zero
  // vessels forever, so pin the exact shape here.
  assert.deepEqual(sub.BoundingBoxes, [[[-90, -180], [90, 180]]]);
  assert.equal(sub.APIKey, 'my-key');
  assert.deepEqual(sub.FilterMessageTypes, ['PositionReport', 'ShipStaticData']);
});
