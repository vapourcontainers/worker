import { parseArgs } from 'node:util';
import { basename, join } from 'node:path';

import { Config } from '@alicloud/openapi-client';
import OSS from '@alicloud/oss20190517';

import loadProject from './project';
import download from './steps/download';
import run from './steps/run';
import upload from './steps/upload';

import ensureArgs from './utils/ensureArgs';
import alicloud from './utils/alicloud';

const args = parseArgs({
  options: {
    'access-key-id': { type: 'string' },
    'access-secret': { type: 'string' },
    'oss-endpoint': { type: 'string' },
    'oss-bucket': { type: 'string' },
  },
  allowPositionals: true,
});

ensureArgs(args.values, [
  'access-key-id',
  'access-secret',
  'oss-endpoint',
  'oss-bucket',
]);

const client = new (alicloud(OSS))(new Config({
  accessKeyId: args.values['access-key-id'],
  accessKeySecret: args.values['access-secret'],
  endpoint: args.values['oss-endpoint'],
}));

const bucket = args.values['oss-bucket']!;

const project = await loadProject();

console.log('* Downloading footages...');
for (const footage of project.footages) {
  const output = footage.target.endsWith('/')
    ? join(footage.target, basename(footage.source))
    : footage.target;

  console.log(`  - ${footage.source} -> ${output}...`);
  await download(footage.source, output, client, bucket);
}

console.log('* Run script');
const target = project.targets.find((target) => target.script === args.positionals[0]);
if (!target) {
  throw new Error(`Cannot find script: ${args.positionals[0]}`);
}
await run(target.script);

console.log('* Uploading output...');
await upload(target.output, project.upload.prefix, client, bucket);

console.log('* Done');

process.exit(0);
