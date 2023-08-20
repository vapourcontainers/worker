import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';

import OSS, { GetObjectRequest, GetObjectMetaRequest } from '@alicloud/oss20190517';
import { ensureDir, pathExists } from 'fs-extra';
import { throttle } from 'throttle-debounce';

import crc64File from '../utils/crc64File';

export default async function download(
  source: string,
  output: string,
  oss: OSS,
  bucket: string,
  onprogress: (bytes: number, totalBytes: number) => unknown
): Promise<void> {
  const meta = await oss.getObjectMeta(bucket, source, new GetObjectMetaRequest());
  const hash = meta.headers['x-oss-hash-crc64ecma'];

  await ensureDir(dirname(output));

  if (await pathExists(output)) {
    const actualHash = await crc64File(output);
    if (hash === actualHash) {
      return;
    }
  }

  const get = await oss.getObject(bucket, source, new GetObjectRequest());

  let currentBytes = 0;
  const totalBytes = parseInt(get.headers['content-length']!);
  const emitProgress = throttle(1000, onprogress);
  get.body.on('data', (chunk: Buffer) => {
    currentBytes += chunk.length;
    emitProgress(currentBytes, totalBytes);
  });

  await pipeline(get.body, createWriteStream(output));

  const actualHash = await crc64File(output);

  if (hash !== actualHash) {
    throw new Error(`Hash mismatch: ${hash} (expected) vs ${actualHash} (actual)`);
  }
}
