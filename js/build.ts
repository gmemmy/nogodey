import type { BuildResult, BuildOptions } from 'esbuild';
import { build } from 'esbuild';
import { wrapPlugins } from 'esbuild-extra';
import nogodeyPlugin from './plugin.js';

const BUILD_CONFIG = {
  entryPoints: ['src/index.tsx'],
  bundle: true,
  outfile: 'bundle.js',
  plugins: [nogodeyPlugin],
  format: 'esm',
  external: ['react', 'react-native'],
  write: true,
} as const satisfies BuildOptions;

class BuildError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'BuildError';
  }
}

const buildProject = async (): Promise<void> => {
  try {
    const result: BuildResult = await build(wrapPlugins(BUILD_CONFIG));

    if (result.errors.length > 0) {
      throw new BuildError('Build compilation failed', result.errors);
    }
    
    if (result.warnings.length > 0) {
      console.warn('⚠️ Build warnings:', result.warnings);
    }
    
    console.log('✅ Build completed successfully');
  } catch (error) {
    if (error instanceof BuildError) {
      console.error('❌ Build failed:', error.message);
      if (error.details) {
        console.error('Details:', error.details);
      }
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Unexpected build error:', errorMessage);
    }
    
    // using process.exitCode instead of process.exit for better testing
    process.exitCode = 1;
    return;
  }
};

// only execute if this is the main module
if (import.meta.url === new URL(process.argv[1]!, `file://`).href) {
  ;(async (): Promise<void> => {
    try {
      await buildProject()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('❌ Fatal error:', errorMessage)
      process.exitCode = 1
    } finally {
      // Any cleanup or teardown logic can go here
      console.log('🧹 Build process completed')
    }
  })()
} 