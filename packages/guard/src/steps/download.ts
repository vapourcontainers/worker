import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';

import OSS, { GetObjectRequest, GetObjectMetaRequest } from '@alicloud/oss20190517';
import { ensureDir } from 'fs-extra';

import crc64File from '../utils/crc64File';

export default async function download(source: string, output: string, oss: OSS, bucket: string): Promise<void> {
  const meta = await oss.getObjectMeta(bucket, source, new GetObjectMetaRequest());
  const hash = meta.headers['x-oss-hash-crc64ecma'];

  await ensureDir(dirname(output));

  const get = await oss.getObject(bucket, source, new GetObjectRequest());
  await pipeline(get.body, createWriteStream(output));

  const actualHash = await crc64File(output);

  if (hash !== actualHash) {
    throw new Error(`Hash mismatch: ${hash} (expected) vs ${actualHash} (actual)`);
  }
}
