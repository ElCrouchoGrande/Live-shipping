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

test('TrueHeading 511 (not available) maps to null', () => {
  const msg = {
    MessageType: 'PositionReport',
    MetaData: { MMSI: 1, ShipName: 'X' },
    Message: { PositionReport: { Latitude: 1, Longitude: 2, Sog: 5, TrueHeading: 511 } },
  };
  assert.equal(parseAisMessage(msg).heading, null);
});

test('Sog 102.3 (not available) maps to null', () => {
  const msg = {
    MessageType: 'PositionReport',
    MetaData: { MMSI: 1, ShipName: 'X' },
    Message: { PositionReport: { Latitude: 1, Longitude: 2, Sog: 102.3, TrueHeading: 90 } },
  };
  assert.equal(parseAisMessage(msg).sog, null);
});

test('out-of-range position (Latitude 91, not available) returns null', () => {
  const msg = {
    MessageType: 'PositionReport',
    MetaData: { MMSI: 1, ShipName: 'X' },
    Message: { PositionReport: { Latitude: 91, Longitude: 2, Sog: 5, TrueHeading: 90 } },
  };
  assert.equal(parseAisMessage(msg), null);
});

test('an AISStream error frame returns null instead of being treated as a report', () => {
  assert.equal(parseAisMessage({ error: 'Api Key Is Not Valid' }), null);
});

// Math.abs(undefined) is NaN and NaN > 90 is false, so a bare range check would
// let a missing coordinate through as {lat: undefined} — which would then wipe a
// vessel's previously-good position in the store.
test('a PositionReport with a missing Latitude returns null', () => {
  const msg = {
    MessageType: 'PositionReport',
    MetaData: { MMSI: 1, ShipName: 'X' },
    Message: { PositionReport: { Longitude: 2, Sog: 5, TrueHeading: 90 } },
  };
  assert.equal(parseAisMessage(msg), null);
});

test('a PositionReport with a non-numeric Latitude returns null', () => {
  const msg = {
    MessageType: 'PositionReport',
    MetaData: { MMSI: 1, ShipName: 'X' },
    Message: { PositionReport: { Latitude: '12.3', Longitude: 2, Sog: 5, TrueHeading: 90 } },
  };
  assert.equal(parseAisMessage(msg), null);
});

test('a negative Sog maps to null', () => {
  const msg = {
    MessageType: 'PositionReport',
    MetaData: { MMSI: 1, ShipName: 'X' },
    Message: { PositionReport: { Latitude: 1, Longitude: 2, Sog: -3, TrueHeading: 90 } },
  };
  assert.equal(parseAisMessage(msg).sog, null);
});
