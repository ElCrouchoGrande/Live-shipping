# Live Shipping Map

A local web app showing live AIS vessels moving over the major global shipping lanes.

- **Lanes** — 9 major corridors (Suez, Panama, Malacca, transpacific, transatlantic…) drawn as a static layer.
- **Vessels** — live positions from [AISStream.io](https://aisstream.io/), updated every 2.5s. Click a ship for name, speed, heading, type.

## Setup

1. Get a free API key at https://aisstream.io/
2. Put it in `.env` (already created for you — it's a hidden dotfile, so Finder won't show it by default):
   ```
   AISSTREAM_API_KEY=your-real-key
   PORT=3001
   ```
   `.env` is gitignored; the key never reaches the browser or git.
3. `npm install`
4. `npm start`
5. Open http://localhost:3001

Port 3000 is in use on this machine by an unrelated process, hence 3001.

## Test

`npm test` — 22 tests.

## Troubleshooting

**The map loads with lanes but no ships, and the log repeats `AIS closed 1006` / `AIS reconnecting`.**
That's a rejected API key. AISStream does not send an error message — it just drops the
connection, so a bad key looks like a reconnect loop. Check for a stray trailing space or
newline in `.env` (the loader trims, but check anyway), and confirm the key on your
aisstream.io dashboard.

**No ships in mid-ocean.** Expected. AISStream's free tier is largely terrestrial
(coastal receivers), so coverage is dense near coastlines and thin in open ocean. The lane
layer is static and always renders regardless of feed status.

**Status indicator** (top-left) tells you which half is working: `connecting…` → `live — N vessels`.
Lanes rendering + `live — 0 vessels` means the map is fine and the feed is not.

## Architecture

```
AISStream WS → ingestor (in-memory latest position per MMSI) → 2.5s snapshot
  → local WS relay → browser → MapLibre vessel layer
```

- `server/aisClient.js` — one WebSocket to AISStream, exponential-backoff reconnect, 60s
  silence watchdog. Subscribes to a global bounding box.
  **Note:** AISStream's `BoundingBoxes` uses `[lat, lon]` ordering, *not* GeoJSON's
  `[lon, lat]`. Flipping it silently returns zero vessels. A test locks this in.
- `server/aisMessage.js` — normalizes AIS frames; drops the 511/102.3/91/181 "not available" sentinels.
- `server/vesselStore.js` — latest position per MMSI, ages out after 10 min.
- `server/relay.js` — batched snapshot broadcast to browsers.
- `public/app.js` — MapLibre map, lanes layer below vessels layer.
