import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import WebSocket from 'ws';
import { createRelay } from '../server/relay.js';

function once(emitter, event) {
  return new Promise((resolve) => emitter.once(event, resolve));
}

test('client receives a snapshot on connect', async () => {
  const server = http.createServer();
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const vessels = [{ mmsi: 1, lat: 10, lon: 20 }];
  const relay = createRelay({ server, getSnapshot: () => vessels, intervalMs: 100000 });

  const client = new WebSocket(`ws://localhost:${port}`);
  const raw = await once(client, 'message');
  const msg = JSON.parse(raw.toString());
  assert.equal(msg.type, 'snapshot');
  assert.deepEqual(msg.vessels, vessels);

  client.close();
  relay.stop();
  await new Promise((r) => server.close(r));
});
