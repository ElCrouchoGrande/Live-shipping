function trimOrNull(s) {
  if (typeof s !== 'string') return null;
  const t = s.trim();
  return t.length ? t : null;
}

// AIS TrueHeading uses 511 to mean "not available".
function headingOrNull(h) {
  return typeof h === 'number' && h >= 0 && h <= 359 ? h : null;
}

export function parseAisMessage(msg) {
  if (!msg || typeof msg !== 'object') return null;
  const meta = msg.MetaData || {};
  const mmsi = meta.MMSI;
  if (typeof mmsi !== 'number') return null;

  if (msg.MessageType === 'PositionReport') {
    const p = msg.Message?.PositionReport;
    if (!p) return null;
    return {
      kind: 'position',
      mmsi,
      lat: p.Latitude,
      lon: p.Longitude,
      cog: typeof p.Cog === 'number' ? p.Cog : null,
      sog: typeof p.Sog === 'number' ? p.Sog : null,
      heading: headingOrNull(p.TrueHeading),
      name: trimOrNull(meta.ShipName),
    };
  }

  if (msg.MessageType === 'ShipStaticData') {
    const s = msg.Message?.ShipStaticData;
    return {
      kind: 'static',
      mmsi,
      name: trimOrNull(meta.ShipName),
      shipType: typeof s?.Type === 'number' ? s.Type : null,
    };
  }

  return null;
}
