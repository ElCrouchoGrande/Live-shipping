export const positionReport = {
  MessageType: 'PositionReport',
  MetaData: { MMSI: 477000000, ShipName: 'EVER GIVEN', latitude: 1.26, longitude: 103.8 },
  Message: {
    PositionReport: { Latitude: 1.26, Longitude: 103.8, Cog: 145.2, Sog: 12.4, TrueHeading: 143 },
  },
};

export const shipStaticData = {
  MessageType: 'ShipStaticData',
  MetaData: { MMSI: 477000000, ShipName: 'EVER GIVEN' },
  Message: { ShipStaticData: { Type: 70 } },
};

export const unsupported = {
  MessageType: 'AidsToNavigationReport',
  MetaData: { MMSI: 999 },
  Message: {},
};
