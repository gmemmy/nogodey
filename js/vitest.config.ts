import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'bundle.js'],
    typecheck: {
      checker: 'tsc',
      include: ['tests/**/*.test.ts'],
    },
  },
  resolve: {
    alias: {
      '@nogodey/plugin': './plugin.ts',
      '@nogodey/build': './build.ts',
      '@nogodey/types': './types.ts',
    },
  },
  esbuild: {
    target: 'es2022',
  },
})
