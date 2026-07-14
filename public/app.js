const map = new maplibregl.Map({
  container: 'map',
  style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  center: [30, 20],
  zoom: 1.6,
});

const statusEl = document.getElementById('status');

map.on('load', async () => {
  // Lane routes layer (below vessels).
  const lanes = await fetch('data/shipping-lanes.geojson').then((r) => r.json());
  map.addSource('lanes', { type: 'geojson', data: lanes });
  map.addLayer({
    id: 'lanes',
    type: 'line',
    source: 'lanes',
    paint: { 'line-color': '#3aa0ff', 'line-width': 1.5, 'line-opacity': 0.5 },
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
    new maplibregl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(
        `<strong>${p.name || 'Unknown'}</strong><br/>` +
        `MMSI: ${p.mmsi}<br/>` +
        `Speed: ${p.sog ?? '—'} kn<br/>` +
        `Heading: ${p.heading ?? '—'}°<br/>` +
        `Type: ${p.shipType ?? '—'}`
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
