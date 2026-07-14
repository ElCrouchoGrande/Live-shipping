import { WebSocketServer } from 'ws';

export function createRelay({ server, getSnapshot, intervalMs }) {
  const wss = new WebSocketServer({ server });

  function send(client) {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify({ type: 'snapshot', vessels: getSnapshot() }));
    }
  }

  wss.on('connection', (client) => {
    client.on('error', (e) => console.error('[relay]', e.message));
    send(client); // immediate snapshot on connect
  });

  wss.on('error', (e) => console.error('[relay] server', e.message));

  const timer = setInterval(() => {
    // Nobody listening: don't pay to serialize a 50k-vessel snapshot every tick
    // on an idle server with no browser tab open.
    if (wss.clients.size === 0) return;
    // Build the payload once per tick, not once per client — with a global
    // bbox the snapshot can be 50k+ vessels, and JSON.stringify is not cheap.
    const payload = JSON.stringify({ type: 'snapshot', vessels: getSnapshot() });
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) client.send(payload);
    }
  }, intervalMs);

  return {
    stop() {
      clearInterval(timer);
      wss.close();
    },
  };
}
