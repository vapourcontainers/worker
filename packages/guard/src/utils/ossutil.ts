import { createInterface } from 'node:readline';
import { execa } from 'execa';

export interface IOssConfig {
  accessKeyId: string;
  accessKeySecret: string;
  endpoint: string;
  bucket: string;
}

export type ICopyProgress = (bytes: number, totalBytes: number) => void;

export async function cp(config: IOssConfig, source: string, target: string, onprogress?: ICopyProgress): Promise<void> {
  const proc = execa('ossutil', [
    '--access-key-id', config.accessKeyId,
    '--access-key-secret', config.accessKeySecret,
    '--endpoint', config.endpoint,
    '--force',
    'cp', source, target,
  ], {
    all: true,
  });

  const rl = createInterface({
    input: proc.all!,
    historySize: 0,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!onprogress) {
      continue;
    }

    const match = line.match(/size: ([\d,]+)\..+OK size: ([\d,]+),/);
    if (!match) {
      continue;
    }

    const totalBytes = parseInt(match[1]!.replace(/,/g, ''));
    const bytes = parseInt(match[2]!.replace(/,/g, ''));
    onprogress(bytes, totalBytes);
  }
}

export async function download(config: IOssConfig, source: string, target: string, onprogress?: ICopyProgress): Promise<void> {
  return await cp(config, `oss://${config.bucket}/${source}`, target, onprogress);
}

export async function upload(config: IOssConfig, source: string, target: string, onprogress?: ICopyProgress): Promise<void> {
  return await cp(config, source, `oss://${config.bucket}/${target}`, onprogress);
}
