import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../server/config.js';

test('loadConfig throws when API key missing', () => {
  assert.throws(() => loadConfig({}), /AISSTREAM_API_KEY/);
});

test('loadConfig returns defaults with a key present', () => {
  const cfg = loadConfig({ AISSTREAM_API_KEY: 'abc' });
  assert.equal(cfg.apiKey, 'abc');
  assert.equal(cfg.port, 3000);
  assert.equal(cfg.snapshotIntervalMs, 2500);
  assert.equal(cfg.staleMs, 600000);
});

test('loadConfig honors PORT override', () => {
  const cfg = loadConfig({ AISSTREAM_API_KEY: 'abc', PORT: '8080' });
  assert.equal(cfg.port, 8080);
});
