import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'bundle.js'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html', 'lcov'],
      all: true,
      include: ['src/**/*.{ts,tsx}', 'build.ts', 'plugin.ts'],
    },
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
      '@formatjs/icu-messageformat-parser': './tests/mocks/icu-parser.ts',
      'intl-messageformat': './tests/mocks/intl-messageformat.ts',
    },
  },
  esbuild: {
    target: 'es2022',
  },
})
