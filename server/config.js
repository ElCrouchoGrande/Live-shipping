export function loadConfig(env) {
  const apiKey = (env.AISSTREAM_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error(
      'AISSTREAM_API_KEY is not set. Copy .env.example to .env and add your free key from https://aisstream.io/'
    );
  }
  return {
    apiKey,
    port: Number(env.PORT) || 3000,
    snapshotIntervalMs: 2500,
    staleMs: 600000,
  };
}
