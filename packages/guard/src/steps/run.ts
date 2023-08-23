import { createInterface } from 'node:readline';

import fs from 'fs-extra';
import { execa } from 'execa';

import { updateFormat, type ITaskFormat, type ITaskProgress, updateProgress } from '../server';

export default async function run(script: string): Promise<void> {
  if (!await fs.pathExists(script)) {
    throw new Error(`Cannot find script: ${script}`);
  }

  let stage = RunStage.START;
  let proc = execa('/bin/bash', [script], {
    all: true,
  });

  const rl = createInterface({
    input: proc.all!,
    historySize: 0,
    crlfDelay: Infinity,
  });

  const format: Partial<ITaskFormat> = {};
  const progress: Partial<ITaskProgress> = {};

  for await (const line of rl) {
    switch (stage) {
      case RunStage.START: {
        console.log(`  ${line}`);

        if (line.startsWith('+ vspipe') && line.includes('--info')) {
          stage = RunStage.VSPIPE_INFO;
          continue;
        }
      } break;

      case RunStage.VSPIPE_INFO: {
        console.log(`  ${line}`);

        if (line.startsWith('+ vspipe')) {
          stage = RunStage.VSPIPE_PIPE;
          continue;
        }

        let match: RegExpMatchArray | null;
        if (match = line.match(/^Width: (\d+)$/)) {
          format.width = parseInt(match[1]!);
        } else if (match = line.match(/^Height: (\d+)$/)) {
          format.height = parseInt(match[1]!);
        } else if (match = line.match(/^Frames: (\d+)$/)) {
          format.frames = parseInt(match[1]!);
        } else if (match = line.match(/^FPS: (\d+)\/(\d+)/)) {
          format.fps = {
            numerator: parseInt(match[1]!),
            denominator: parseInt(match[2]!),
          };
        } else if (match = line.match(/^Format Name: (\S+)$/)) {
          format.formatName = match[1]!;
        } else if (match = line.match(/^Color Family: (\S+)$/)) {
          format.colorFamily = match[1]!;
        } else if (match = line.match(/^Bits: (\d+)$/)) {
          format.bitDepth = parseInt(match[1]!);
        }
      } break;

      case RunStage.VSPIPE_PIPE: {
        console.log(`  ${line}`);

        updateFormat(format as ITaskFormat);

        if (line.startsWith('+ ffmpeg')) {
          stage = RunStage.FFMPEG;
          continue;
        }
      } break;

      case RunStage.FFMPEG: {
        const match = line.match(/^([^=]+)=([^=]+)$/);
        if (match) {
          const k = match[1]!.trim();
          const v = match[2]!.trim();

          if (k == 'frame') {
            progress.processedFrames = parseInt(v);
          } else if (k == 'out_time_us') {
            progress.processedDurationMs = parseInt(v) / 1000;
          } else if (k == 'fps') {
            progress.fps = parseFloat(v);
          } else if (k == 'bitrate') {
            progress.currentBitrate = parseFloat(v) * 1024;
          } else if (k == 'total_size') {
            progress.outputBytes = parseInt(v);
          } else if (k == 'speed') {
            progress.speed = parseFloat(v);
          } else if (k == 'progress') {
            if (progress.processedDurationMs! < 0 || isNaN(progress.speed!)) {
              continue;
            }
            updateProgress(progress as ITaskProgress);
          }
        } else {
          console.log(`  ${line}`);
        }
      } break;
    }
  }
}

enum RunStage {
  START,
  VSPIPE_INFO,
  VSPIPE_PIPE,
  FFMPEG,
}
