const map = new maplibregl.Map({
  container: 'map',
  style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  center: [30, 20],
  zoom: 2.2,
  canvasContextAttributes: { antialias: true },
});

// The basemap style doesn't declare a projection, so set it once the style is in.
map.on('style.load', () => {
  map.setProjection({ type: 'globe' });
  // Space backdrop plus a soft atmospheric rim so the globe edge isn't a hard cut-out.
  map.setSky({
    'sky-color': '#05070d',
    'horizon-color': '#2a5f9e',
    'fog-color': '#0d1a2e',
    'sky-horizon-blend': 0.6,
    'horizon-fog-blend': 0.6,
    'fog-ground-blend': 0.3,
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
  });
});

// Zoom buttons + compass; the compass icon tilts with the map's pitch.
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));

const statusEl = document.getElementById('status');

map.on('load', async () => {
  // Lane routes layer (below vessels). The dataset has three features — Major,
  // Middle and Minor — so weight them by importance rather than drawing all
  // 28k points at the same emphasis, which would just read as noise.
  const lanes = await fetch('data/shipping-lanes.geojson').then((r) => r.json());
  map.addSource('lanes', {
    type: 'geojson',
    data: lanes,
    attribution:
      'Shipping lanes: <a href="https://doi.org/10.5281/zenodo.6361763">Benden, P. (2022)</a>, CC BY-SA 4.0',
  });
  map.addLayer({
    id: 'lanes',
    type: 'line',
    source: 'lanes',
    paint: {
      'line-color': '#3aa0ff',
      'line-width': ['match', ['get', 'Type'], 'Major', 1.6, 'Middle', 1.0, 0.6],
      'line-opacity': ['match', ['get', 'Type'], 'Major', 0.75, 'Middle', 0.45, 0.25],
    },
  });

  // Vessels layer (above lanes).
  map.addSource('vessels', { type: 'geojson', data: emptyFC() });
  map.addLayer({
    id: 'vessels',
    type: 'circle',
    source: 'vessels',
    paint: {
      'circle-radius': 3,
      'circle-color': '#ffd23f',
      'circle-stroke-color': '#000',
      'circle-stroke-width': 0.5,
    },
  });

  map.on('click', 'vessels', (e) => {
    const p = e.features[0].properties;
    // AIS names are broadcast by the vessels themselves, so treat them as untrusted.
    const esc = (v) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    new maplibregl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(
        `<strong>${esc(p.name || 'Unknown')}</strong><br/>` +
        `MMSI: ${esc(p.mmsi)}<br/>` +
        `Speed: ${esc(p.sog ?? '—')} kn<br/>` +
        `Heading: ${esc(p.heading ?? '—')}°<br/>` +
        `Type: ${esc(p.shipType ?? '—')}`
      )
      .addTo(map);
  });
  map.on('mouseenter', 'vessels', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'vessels', () => { map.getCanvas().style.cursor = ''; });

  connect();
});

function emptyFC() {
  return { type: 'FeatureCollection', features: [] };
}

function toFC(vessels) {
  return {
    type: 'FeatureCollection',
    features: vessels.map((v) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [v.lon, v.lat] },
      properties: {
        mmsi: v.mmsi, name: v.name, sog: v.sog, heading: v.heading, shipType: v.shipType,
      },
    })),
  };
}

function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}`);

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === 'snapshot') {
      const src = map.getSource('vessels');
      if (src) src.setData(toFC(msg.vessels));
      statusEl.textContent = `live — ${msg.vessels.length} vessels`;
    }
  };
  ws.onclose = () => {
    statusEl.textContent = 'disconnected — reconnecting…';
    setTimeout(connect, 2000);
  };
  ws.onerror = () => ws.close();
}
