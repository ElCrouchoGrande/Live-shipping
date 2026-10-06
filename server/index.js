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
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.geojson': 'application/json', '.json': 'application/json' };

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://unpkg.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' ws: wss: https:",
    "worker-src blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join('; '),
};

function serveStatic(req, res) {
  const reqPath = req.url.split('?')[0];
  const urlPath = reqPath === '/' ? '/index.html' : reqPath;
  const filePath = path.join(publicDir, path.normalize(urlPath));
  if (!filePath.startsWith(publicDir + path.sep)) { res.writeHead(403, SECURITY_HEADERS).end(); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, SECURITY_HEADERS).end('Not found'); return; }
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
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

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use — set PORT in .env`);
    process.exit(1);
  }
  console.error(`Server error (${err.code || 'unknown'}): ${err.message}`);
  throw err;
});

server.listen(config.port, () => {
  console.log(`Live Shipping Map running at http://localhost:${config.port}`);
});
