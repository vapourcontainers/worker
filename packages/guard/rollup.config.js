import typescript from '@rollup/plugin-typescript';

import { readFile } from 'fs/promises';
const { dependencies } = JSON.parse(await readFile('./package.json', 'utf-8'));

export default {
  input: 'src/main.ts',
  output: {
    dir: 'dist',
    format: 'es',
  },
  plugins: [
    typescript(),
  ],
  external: [
    ...Object.keys(dependencies || {}),
  ],
};
