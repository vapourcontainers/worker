import { basename, join } from 'node:path';
import { createReadStream } from 'node:fs';

import { RuntimeOptions } from '@alicloud/tea-util';
import OSS, { PutObjectHeaders, PutObjectRequest } from '@alicloud/oss20190517';

import crc64File from '../utils/crc64File';

export default async function upload(source: string, prefix: string, oss: OSS, bucket: string): Promise<void> {
  const key = join(prefix, basename(source));
  const reader = createReadStream(source);

  const put = await oss.putObjectWithOptions(bucket, key,
    new PutObjectRequest({
      body: reader,
    }),
    new PutObjectHeaders(),
    new RuntimeOptions({
      // this brings some listener leaks in the OSS SDK,
      // so a process.exit() is required in the end of the program
      readTimeout: 1 * 60 * 60 * 1000,
    }));

  const hash = put.headers['x-oss-hash-crc64ecma'];
  const actualHash = await crc64File(source);

  if (hash !== actualHash) {
    throw new Error(`Hash mismatch: ${hash} (expected) vs ${actualHash} (actual)`);
  }
}
