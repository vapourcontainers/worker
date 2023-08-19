import { parseArgs } from 'node:util';

import ensureArgs from './utils/ensureArgs';

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
