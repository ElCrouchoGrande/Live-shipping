import { WebSocketServer } from 'ws';

export function createRelay({ server, getSnapshot, intervalMs }) {
  const wss = new WebSocketServer({ server });

  function send(client) {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify({ type: 'snapshot', vessels: getSnapshot() }));
    }
  }

  wss.on('connection', (client) => {
    send(client); // immediate snapshot on connect
  });

  const timer = setInterval(() => {
    for (const client of wss.clients) send(client);
  }, intervalMs);

  return {
    stop() {
      clearInterval(timer);
      wss.close();
    },
  };
}
