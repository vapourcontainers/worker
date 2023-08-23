import { createInterface } from 'node:readline';
import { execa } from 'execa';

export interface IOssConfig {
  accessKeyId: string;
  accessKeySecret: string;
  endpoint: string;
  bucket: string;
}

function baseArgs(config: IOssConfig): string[] {
  return [
    '--access-key-id', config.accessKeyId,
    '--access-key-secret', config.accessKeySecret,
    '--endpoint', config.endpoint,
  ];
}

export type ICopyProgress = (bytes: number, totalBytes: number) => void;

export async function cp(config: IOssConfig, source: string, target: string, onprogress?: ICopyProgress): Promise<void> {
  const proc = execa('ossutil', [
    ...baseArgs(config),
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

export interface IStat {
  acl: string;
  acceptRanges: string;
  contentLength: number;
  contentMd5: string;
  contentType: string;
  etag: string;
  lastModified: string;
  owner: string;
  headers: Record<string, string>;
}

export async function stat(config: IOssConfig, target: string): Promise<IStat> {
  const output = await execa('ossutil', [
    ...baseArgs(config),
    'stat', `oss://${config.bucket}/${target}`,
  ], {
    all: true,
  });

  const stat: Partial<IStat> = {
    headers: {},
  };

  for (const line of output.all!.split('\n')) {
    const match = line.match(/^([^:\s]+)\s*: (.+)$/);
    if (!match || !match[1] || !match[2]) continue;

    switch (match[1]) {
      case 'ACL': stat.acl = match[2]; break;
      case 'Accept-Ranges': stat.acceptRanges = match[2]; break;
      case 'Content-Length': stat.contentLength = parseInt(match[2]); break;
      case 'Content-Md5': stat.contentMd5 = match[2]; break;
      case 'Content-Type': stat.contentType = match[2]; break;
      case 'Etag': stat.etag = match[2]; break;
      case 'Last-Modified': stat.lastModified = match[2]; break;
      case 'Owner': stat.owner = match[2]; break;
      default: stat.headers![match[1].toLowerCase()] = match[2]; break;
    }
  }

  return stat as IStat;
}
