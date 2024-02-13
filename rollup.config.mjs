import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';
import del from 'rollup-plugin-delete';

const config = [
  {
    input: 'lib/cli.ts',
    output: {
      file: 'bin/wait-on',
      format: 'cjs',
      banner: '#!/usr/bin/env node'
    },
    plugins: [typescript()]
  },
  {
    input: 'bin/dist/wait-on.d.ts',
    output: [{ file: 'index.d.ts', format: 'es' }],
    plugins: [dts()]
  }
];
export default config;
