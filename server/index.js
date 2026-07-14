import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { createVesselStore } from './vesselStore.js';
import { startAisClient } from './aisClient.js';
import { createRelay } from './relay.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

// Minimal .env loader (no dependency).
function loadDotEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.geojson': 'application/json', '.json': 'application/json' };

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(publicDir, path.normalize(urlPath));
  if (!filePath.startsWith(publicDir)) { res.writeHead(403).end(); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

loadDotEnv();
const config = loadConfig(process.env); // throws with a clear message if key missing

const store = createVesselStore({ staleMs: config.staleMs });
const server = http.createServer(serveStatic);

createRelay({ server, getSnapshot: () => store.snapshot(), intervalMs: config.snapshotIntervalMs });

startAisClient({
  apiKey: config.apiKey,
  onReport: (report, now) => store.apply(report, now),
  log: (m) => console.log(`[ais] ${m}`),
});

// Periodically age out stale vessels.
setInterval(() => store.pruneStale(Date.now()), 60000);

server.listen(config.port, () => {
  console.log(`Live Shipping Map running at http://localhost:${config.port}`);
});
