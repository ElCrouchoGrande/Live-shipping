import { WebSocketServer } from 'ws';

const MAX_CLIENTS = 200;
// Clients are receive-only, so inbound frames can be tiny.
const MAX_INBOUND_BYTES = 1024;
// A snapshot can be several MB; skip clients that haven't drained the last one
// instead of queueing more behind it.
const MAX_BUFFERED_BYTES = 8 * 1024 * 1024;

// Browsers always send Origin on WebSocket handshakes; accept only the page's own origin.
// Non-browser clients (no Origin header) are allowed through.
function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

export function createRelay({ server, getSnapshot, intervalMs, maxClients = MAX_CLIENTS }) {
  const wss = new WebSocketServer({
    server,
    maxPayload: MAX_INBOUND_BYTES,
    verifyClient: ({ req }, done) => {
      if (!isSameOrigin(req)) return done(false, 403, 'Forbidden origin');
      if (wss.clients.size >= maxClients) return done(false, 503, 'Too many connections');
      done(true);
    },
  });

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
      if (client.readyState === client.OPEN && client.bufferedAmount < MAX_BUFFERED_BYTES) {
        client.send(payload);
      }
    }
  }, intervalMs);

  return {
    stop() {
      clearInterval(timer);
      wss.close();
    },
  };
}
