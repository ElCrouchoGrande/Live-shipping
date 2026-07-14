import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextBackoff } from '../server/aisClient.js';

test('nextBackoff grows exponentially and caps at 30s', () => {
  assert.equal(nextBackoff(0), 1000);
  assert.equal(nextBackoff(1), 2000);
  assert.equal(nextBackoff(2), 4000);
  assert.equal(nextBackoff(5), 30000);
  assert.equal(nextBackoff(10), 30000);
});
