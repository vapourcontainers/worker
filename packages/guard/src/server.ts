import { createServer } from 'node:http';
import { promisify } from 'node:util';

import { WebSocketServer } from 'ws';
import { pathExists, remove } from 'fs-extra';

import type { IProject } from './project';

export enum Stage {
  IDLE = 'idle',
  DOWNLOAD = 'download',
  ENCODE = 'encode',
  UPLOAD = 'upload',
}

export interface IFileProgress {
  fileIndex: number;
  currentBytes: number;
  totalBytes: number;
}

export interface ITaskFormat {
  width: number;
  height: number;
  frames: number;
  fps: {
    numerator: number;
    denominator: number;
  };
  formatName: string;
  colorFamily: string;
  bitDepth: number;
}

export interface ITaskProgress {
  processedFrames: number;
  processedDurationMs: number;
  fps: number;
  currentBitrate: number;
  outputBytes: number;
  speed: number;
}

let wss: WebSocketServer | undefined;

let stage = Stage.IDLE;
let project: IProject | undefined;
let downloadProgress: IFileProgress | undefined;
let uploadProgress: IFileProgress | undefined;
let format: ITaskFormat | undefined;
let progress: ITaskProgress | undefined;

export async function createSocketServer(path = '/var/run/vc-guard.sock') {
  if (await pathExists(path)) {
    await remove(path);
  }

  const server = createServer();

  wss = new WebSocketServer({ server });
  wss.on('connection', (socket) => {
    socket.on('message', (message: string) => {
      const event = parseEvent(message);
      switch (event?.name) {
        case 'stage': {
          socket.send(buildEvent('stage', stage));
        } break;
        case 'project': {
          socket.send(buildEvent('project', project));
        } break;
        case 'download-progress': {
          socket.send(buildEvent('download-progress', downloadProgress));
        } break;
        case 'upload-progress': {
          socket.send(buildEvent('upload-progress', uploadProgress));
        } break;
        case 'format': {
          socket.send(buildEvent('format', format));
        } break;
        case 'progress': {
          socket.send(buildEvent('progress', progress));
        } break;
      }
    });
  });

  const listen = promisify(<(path: string, callback: () => void) => void>server.listen.bind(server));
  await listen(path);

  return server;
}

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

function broadcast(name: string, data?: unknown) {
  if (!wss) {
    return;
  }

  for (const socket of wss.clients) {
    socket.send(buildEvent(name, data));
  }
}

export function updateStage(value: Stage) {
  stage = value;
  broadcast('stage', stage);
}

export function updateProject(value: IProject) {
  project = value;
  broadcast('project', project);
}

export function updateDownloadProgress(value: IFileProgress) {
  downloadProgress = value;
  broadcast('download-progress', downloadProgress);
}

export function updateUploadProgress(value: IFileProgress) {
  uploadProgress = value;
  broadcast('upload-progress', uploadProgress);
}

export function updateFormat(value: ITaskFormat) {
  format = value;
  broadcast('format', format);
}

export function updateProgress(value: ITaskProgress) {
  progress = value;
  broadcast('progress', progress);
}
