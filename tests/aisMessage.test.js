import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAisMessage } from '../server/aisMessage.js';
import { positionReport, shipStaticData, unsupported } from './fixtures/aisMessages.js';

test('parses a PositionReport', () => {
  const r = parseAisMessage(positionReport);
  assert.equal(r.kind, 'position');
  assert.equal(r.mmsi, 477000000);
  assert.equal(r.lat, 1.26);
  assert.equal(r.lon, 103.8);
  assert.equal(r.heading, 143);
  assert.equal(r.sog, 12.4);
  assert.equal(r.name, 'EVER GIVEN');
});

test('parses ShipStaticData', () => {
  const r = parseAisMessage(shipStaticData);
  assert.equal(r.kind, 'static');
  assert.equal(r.mmsi, 477000000);
  assert.equal(r.shipType, 70);
});

test('returns null for unsupported types', () => {
  assert.equal(parseAisMessage(unsupported), null);
  assert.equal(parseAisMessage({}), null);
  assert.equal(parseAisMessage(null), null);
});
