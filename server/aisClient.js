import WebSocket from 'ws';
import { parseAisMessage } from './aisMessage.js';

const AIS_URL = 'wss://stream.aisstream.io/v0/stream';

export function nextBackoff(attempt) {
  return Math.min(30000, 1000 * 2 ** attempt);
}

// Global bounding box: whole world.
const GLOBAL_BBOX = [[[-90, -180], [90, 180]]];

export function startAisClient({ apiKey, onReport, log = () => {} }) {
  let ws = null;
  let attempt = 0;
  let stopped = false;
  let reconnectTimer = null;

  function connect() {
    if (stopped) return;
    ws = new WebSocket(AIS_URL);

    ws.on('open', () => {
      attempt = 0;
      log('AIS connected');
      ws.send(JSON.stringify({
        APIKey: apiKey,
        BoundingBoxes: GLOBAL_BBOX,
        FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
      }));
    });

    ws.on('message', (data) => {
      let parsed;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        return;
      }
      const report = parseAisMessage(parsed);
      if (report) onReport(report, Date.now());
    });

    ws.on('close', scheduleReconnect);
    ws.on('error', (err) => {
      log(`AIS error: ${err.message}`);
      // 'close' will follow and trigger reconnect.
    });
  }

  function scheduleReconnect() {
    if (stopped) return;
    const delay = nextBackoff(attempt++);
    log(`AIS reconnecting in ${delay}ms`);
    reconnectTimer = setTimeout(connect, delay);
  }

  connect();

  return {
    stop() {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
    },
  };
}
