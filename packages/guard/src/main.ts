import { parseArgs } from 'node:util';
import { basename, dirname, join, resolve } from 'node:path';

import { Config } from '@alicloud/openapi-client';
import OSS from '@alicloud/oss20190517';

import loadProject from './project';
import {
  Stage,
  createSocketServer,
  updateDownloadProgress,
  updateProject,
  updateStage,
} from './server';

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

const rootPath = resolve(dirname(new URL(import.meta.url).pathname), '../../../');
const sockPath = join(rootPath, 'ws-guard.sock');
const server = await createSocketServer(sockPath);

const project = await loadProject();
updateProject(project);

console.log('* Downloading footages...');
updateStage(Stage.DOWNLOAD);
for (const [i, footage] of project.footages.entries()) {
  const output = footage.target.endsWith('/')
    ? join(footage.target, basename(footage.source))
    : footage.target;

  console.log(`  - ${footage.source} -> ${output}...`);
  await download(footage.source, output, client, bucket, (bytes, totalBytes) => {
    updateDownloadProgress({
      fileIndex: i,
      currentBytes: bytes,
      totalBytes: totalBytes,
    });
  });
}

console.log('* Run script');
updateStage(Stage.ENCODE);
const target = project.targets.find((target) => target.script === args.positionals[0]);
if (!target) {
  throw new Error(`Cannot find script: ${args.positionals[0]}`);
}
await run(target.script);

console.log('* Uploading output...');
updateStage(Stage.UPLOAD);
await upload(target.output, project.upload.prefix, client, bucket);

console.log('* Done');

server.close();
process.exit(0);
