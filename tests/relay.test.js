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

test('with no clients connected, the interval does not build a snapshot', async () => {
  const server = http.createServer();
  await new Promise((r) => server.listen(0, r));

  let calls = 0;
  const relay = createRelay({
    server,
    getSnapshot: () => {
      calls++;
      return [];
    },
    intervalMs: 20,
  });

  // Let several ticks elapse with nobody connected.
  await new Promise((r) => setTimeout(r, 120));
  assert.equal(calls, 0, 'getSnapshot should not run when there are no clients');

  relay.stop();
  await new Promise((r) => server.close(r));
});

test('a connected client still receives periodic broadcasts', async () => {
  const server = http.createServer();
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const relay = createRelay({ server, getSnapshot: () => [{ mmsi: 7 }], intervalMs: 20 });

  const client = new WebSocket(`ws://localhost:${port}`);
  await once(client, 'message'); // the on-connect snapshot
  const raw = await once(client, 'message'); // a periodic tick
  const msg = JSON.parse(raw.toString());
  assert.equal(msg.type, 'snapshot');
  assert.deepEqual(msg.vessels, [{ mmsi: 7 }]);

  client.close();
  relay.stop();
  await new Promise((r) => server.close(r));
});
