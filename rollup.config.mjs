import typescript from '@rollup/plugin-typescript';

export default {
  input: 'lib/cli.ts',
  output: {
    file: 'bin/wait-on',
    format: 'cjs',
    banner: '#!/usr/bin/env node'
  },
  plugins: [typescript()]
};
