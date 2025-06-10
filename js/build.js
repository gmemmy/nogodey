import * as esbuild from 'esbuild';
import { wrapPlugins } from 'esbuild-extra';
import { nogodeyPlugin } from './plugin.js';

const opts = wrapPlugins({
  entryPoints: ['src/index.tsx'],
  bundle: true,
  outfile: 'bundle.js',
  sourcemap: true,
  format: 'esm',
  plugins: [nogodeyPlugin],
});

esbuild.build(opts).catch(err => {
  console.error(err);
  process.exit(1);
}); 