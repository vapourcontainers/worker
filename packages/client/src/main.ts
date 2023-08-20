import { dirname, join, resolve } from 'node:path';
import { WebSocket } from 'ws';

const rootPath = resolve(dirname(new URL(import.meta.url).pathname), '../../../');
const sockPath = join(rootPath, 'ws-guard.sock');

const ws = new WebSocket(`ws+unix://${sockPath}`);

ws.on('message', (message: string) => {
  const line = message.toString();
  console.log(line);

  const event = parseEvent(line);
  switch (event?.name) {
    case 'stage': {
      switch (event.data) {
        case Stage.DOWNLOAD: {
          ws.send(buildEvent('download-progress'));
        } break;
        case Stage.ENCODE: {
          ws.send(buildEvent('format'));
          ws.send(buildEvent('progress'));
        } break;
        case Stage.UPLOAD: {
          ws.send(buildEvent('upload-progress'));
        } break;
      }
    } break;
  }
});

ws.once('open', () => {
  ws.send(buildEvent('project'));
  ws.send(buildEvent('stage'));
});

interface IEvent<T = unknown> {
  name: string;
  data: T | undefined;
}

function parseEvent(message: string): IEvent | undefined {
  try {
    const { name, data } = JSON.parse(message);
    return { name, data };
  } catch (e) {
    return undefined;
  }
}

function buildEvent(name: string, data?: unknown): string {
  return JSON.stringify({ name, data });
}

enum Stage {
  DOWNLOAD = 'download',
  ENCODE = 'encode',
  UPLOAD = 'upload',
}
