import WebSocket from 'ws';
import { parseAisMessage } from './aisMessage.js';

const AIS_URL = 'wss://stream.aisstream.io/v0/stream';

export function nextBackoff(attempt) {
  return Math.min(30000, 1000 * 2 ** attempt);
}

// Global bounding box: whole world.
// NOTE: AISStream expects [lat, lon] ordering here (unlike GeoJSON's [lon, lat]).
// Do NOT "fix" this to [lon, lat] — that would silently return zero vessels forever.
const GLOBAL_BBOX = [[[-90, -180], [90, 180]]];

// AISStream is a firehose; a minute of total silence means the connection is dead.
const WATCHDOG_MS = 60000;

export function buildSubscription(apiKey) {
  return {
    APIKey: apiKey,
    BoundingBoxes: GLOBAL_BBOX,
    FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
  };
}

export function startAisClient({ apiKey, onReport, log = () => {} }) {
  let ws = null;
  let attempt = 0;
  let stopped = false;
  let reconnectTimer = null;
  let watchdogTimer = null;
  let lastMessageAt = Date.now();

  function clearWatchdog() {
    if (watchdogTimer) {
      clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
  }

  function startWatchdog() {
    clearWatchdog();
    lastMessageAt = Date.now();
    watchdogTimer = setInterval(() => {
      if (Date.now() - lastMessageAt > WATCHDOG_MS) {
        log('AIS watchdog: no messages for 60s, terminating connection');
        if (ws) ws.terminate();
      }
    }, WATCHDOG_MS);
  }

  function connect() {
    if (stopped) return;
    ws = new WebSocket(AIS_URL);
    startWatchdog();

    ws.on('open', () => {
      attempt = 0;
      log('AIS connected');
      ws.send(JSON.stringify(buildSubscription(apiKey)));
    });

    ws.on('message', (data) => {
      lastMessageAt = Date.now();
      let parsed;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (parsed.error) {
        log(`AIS error from server: ${parsed.error}`);
        return;
      }
      const report = parseAisMessage(parsed);
      if (report) onReport(report, Date.now());
    });

    ws.on('close', (code, reason) => {
      log(`AIS closed ${code} ${reason}`);
      scheduleReconnect();
    });
    ws.on('error', (err) => {
      log(`AIS error: ${err.message}`);
      // 'close' will follow and trigger reconnect.
    });
  }

  function scheduleReconnect() {
    clearWatchdog();
    if (stopped) return;
    const delay = nextBackoff(attempt++);
    log(`AIS reconnecting in ${delay}ms`);
    reconnectTimer = setTimeout(connect, delay);
  }

  connect();

  return {
    stop() {
      stopped = true;
      clearWatchdog();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    },
  };
}
