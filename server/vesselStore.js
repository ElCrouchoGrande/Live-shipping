function round4(n) {
  return Math.round(n * 10000) / 10000;
}

export function createVesselStore({ staleMs }) {
  const vessels = new Map(); // mmsi -> record

  function get(mmsi) {
    let v = vessels.get(mmsi);
    if (!v) {
      v = { mmsi, lat: null, lon: null, heading: null, sog: null, name: null, shipType: null, lastSeen: 0 };
      vessels.set(mmsi, v);
    }
    return v;
  }

  return {
    apply(report, now) {
      if (!report) return;
      const v = get(report.mmsi);
      v.lastSeen = now;
      if (report.name) v.name = report.name;
      if (report.kind === 'position') {
        v.lat = report.lat;
        v.lon = report.lon;
        v.heading = report.heading;
        v.sog = report.sog;
      } else if (report.kind === 'static') {
        if (report.shipType != null) v.shipType = report.shipType;
      }
    },
    pruneStale(now) {
      let removed = 0;
      for (const [mmsi, v] of vessels) {
        if (v.lastSeen < now - staleMs) {
          vessels.delete(mmsi);
          removed++;
        }
      }
      return removed;
    },
    snapshot() {
      const out = [];
      for (const v of vessels.values()) {
        if (v.lat != null && v.lon != null) {
          out.push({ mmsi: v.mmsi, lat: round4(v.lat), lon: round4(v.lon), heading: v.heading, sog: v.sog, name: v.name, shipType: v.shipType, lastSeen: v.lastSeen });
        }
      }
      return out;
    },
    size() {
      return vessels.size;
    },
  };
}
