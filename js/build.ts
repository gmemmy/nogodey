import {mkdirSync} from 'node:fs'
import {dirname} from 'node:path'
import nogodeyPlugin from '@nogodey/plugin'
import type {BuildOptions, BuildResult} from 'esbuild'
import {build} from 'esbuild'
import {wrapPlugins} from 'esbuild-extra'
import * as logger from './src/logger.js'

const BUILD_CONFIG = {
  entryPoints: ['src/index.tsx'],
  bundle: true,
  outfile: 'dist/bundle.js',
  plugins: [nogodeyPlugin],
  format: 'esm',
  external: [
    'react',
    'react-native',
    'intl-messageformat',
    'intl-messageformat-parser',
    '../dist/messages.json',
  ],
  sourcemap: true,
  write: true,
} as const satisfies BuildOptions

class BuildError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'BuildError'
  }
}

const ensureOutputDirectory = (outfile: string): void => {
  const dir = dirname(outfile)
  try {
    mkdirSync(dir, {recursive: true})
    logger.info({directory: dir}, 'ensured output directory exists')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.warn(
      {
        directory: dir,
        error: errorMessage,
      },
      'failed to create output directory'
    )
  }
}

const buildProject = async (): Promise<void> => {
  const buildTimer = logger.startTimer('esbuild_execution')

  try {
    ensureOutputDirectory(BUILD_CONFIG.outfile)

    logger.info(
      {
        entryPoints: BUILD_CONFIG.entryPoints,
        outfile: BUILD_CONFIG.outfile,
        format: BUILD_CONFIG.format,
      },
      'starting esbuild compilation'
    )

    const result: BuildResult = await build(wrapPlugins(BUILD_CONFIG))
    buildTimer.observe()

    if (result.errors.length > 0) {
      logger.error(
        {
          errorCount: result.errors.length,
          errors: result.errors,
        },
        'build compilation failed'
      )
      throw new BuildError('Build compilation failed', result.errors)
    }

    if (result.warnings.length > 0) {
      logger.warn(
        {
          warningCount: result.warnings.length,
          warnings: result.warnings,
        },
        'build completed with warnings'
      )
    }

    logger.info(
      {
        status: 'success',
        outfile: BUILD_CONFIG.outfile,
      },
      'build completed successfully'
    )
  } catch (error) {
    buildTimer.observe()

    if (error instanceof BuildError) {
      logger.error(
        {
          errorType: 'BuildError',
          details: error.details,
        },
        error.message
      )
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(
        {
          errorType: 'UnexpectedError',
          errorMessage,
        },
        'unexpected build error occurred'
      )
    }

    // using process.exitCode instead of process.exit for better testing
    process.exitCode = 1
    return
  }
}

// only execute if this is the main module
if (import.meta.url === new URL(process.argv[1]!, 'file://').href) {
  ;(async (): Promise<void> => {
    const processTimer = logger.startTimer('build_process')

    logger.info({}, 'build process started')

    try {
      await buildProject()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(
        {
          errorMessage,
          errorType: 'FatalError',
        },
        'fatal error in build process'
      )
      process.exitCode = 1
    } finally {
      processTimer.observe()
      logger.info({}, 'build process completed')
    }
  })()
}
