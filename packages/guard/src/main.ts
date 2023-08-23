import { parseArgs } from 'node:util';
import { basename, dirname, join, resolve } from 'node:path';

import loadProject from './project';
import {
  Stage,
  createSocketServer,
  updateProject,
  updateStage,
} from './server';

import download from './steps/download';
import run from './steps/run';
import upload from './steps/upload';

import ensureArgs from './utils/ensureArgs';
import type { IOssConfig } from './utils/ossutil';

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

const oss: IOssConfig = {
  accessKeyId: args.values['access-key-id']!,
  accessKeySecret: args.values['access-secret']!,
  endpoint: args.values['oss-endpoint']!,
  bucket: args.values['oss-bucket']!,
};

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

  console.log(`  - ${footage.source} -> ${output}`);
  await download(oss, i, footage.source, output);
}

console.log('* Run script');
updateStage(Stage.ENCODE);
const target = project.targets.find((target) => target.script === args.positionals[0]);
if (!target) {
  throw new Error(`Cannot find script: ${args.positionals[0]}`);
}
await run(target.script);

console.log(`* Uploading output...`);
updateStage(Stage.UPLOAD);
console.log(`  - ${target.output} -> ${project.upload.prefix}`);
await upload(oss, target.output, join(project.upload.prefix, basename(target.output)));

console.log('* Done');

server.close();
process.exit(0);
