import { dirname, join, resolve } from 'node:path';
import { WebSocket } from 'ws';

const rootPath = resolve(dirname(new URL(import.meta.url).pathname), '../../../');
const sockPath = join(rootPath, 'ws-guard.sock');

const ws = new WebSocket(`ws+unix://${sockPath}`);

ws.on('message', (message: string) => {
  console.log(message.toString());
});

ws.once('open', () => {
  ws.send(buildEvent('stage'));
  ws.send(buildEvent('format'));
  ws.send(buildEvent('progress'));
});

function buildEvent(name: string, data?: unknown): string {
  return JSON.stringify({ name, data });
}
