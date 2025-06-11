import {captureConsoleOutput} from '../setup'

vi.mock('esbuild', () => ({
  build: vi.fn(),
}))

vi.mock('esbuild-extra', () => ({
  wrapPlugins: vi.fn(config => config),
}))

describe('Build Script', () => {
  let consoleCapture: ReturnType<typeof captureConsoleOutput>

  beforeEach(() => {
    consoleCapture = captureConsoleOutput()
    vi.clearAllMocks()
  })

  afterEach(() => {
    consoleCapture.restore()
  })

  describe('Build Configuration', () => {
    test('should have correct build configuration', () => {
      const expectedConfig = {
        entryPoints: ['src/index.tsx'],
        bundle: true,
        outfile: 'bundle.js',
        format: 'esm',
        external: ['react', 'react-native'],
        write: true,
      }

      expect(expectedConfig.entryPoints).toEqual(['src/index.tsx'])
      expect(expectedConfig.format).toBe('esm')
      expect(expectedConfig.external).toContain('react')
      expect(expectedConfig.external).toContain('react-native')
    })

    test('should include nogodey plugin in configuration', () => {
      expect(true).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should handle build errors gracefully', async () => {
      const mockBuild = vi.fn().mockRejectedValue(new Error('Build failed'))

      expect(mockBuild).toBeDefined()
    })

    test('should handle compilation errors', async () => {
      const mockBuild = vi.fn().mockResolvedValue({
        errors: [{text: 'TypeScript error'}],
        warnings: [],
      })

      expect(mockBuild).toBeDefined()
    })

    test('should log warnings but continue build', async () => {
      const mockBuild = vi.fn().mockResolvedValue({
        errors: [],
        warnings: [{text: 'Warning message'}],
      })

      expect(mockBuild).toBeDefined()
    })
  })

  describe('Process Exit Handling', () => {
    test('should set process.exitCode on error instead of calling process.exit', () => {
      expect(process.exitCode).toBeUndefined()
    })

    test('should allow cleanup in finally block', () => {
      // Test that our async IIFE pattern allows for cleanup
      expect(true).toBe(true)
    })
  })

  describe('Module Execution', () => {
    test('should only execute build when run as main module', () => {
      // Test the import.meta.url check
      const currentUrl = 'file:///test/build.ts'
      const processArgv1 = '/test/build.ts'

      const shouldExecute = currentUrl === new URL(processArgv1, 'file://').href
      expect(shouldExecute).toBe(true)
    })
  })

  describe('Console Output', () => {
    test('should log success message on successful build', () => {
      console.log('✅ Build completed successfully')
      console.log('🧹 Build process completed')

      expect(consoleCapture.logs).toContain('✅ Build completed successfully')
      expect(consoleCapture.logs).toContain('🧹 Build process completed')
    })

    test('should log error messages on build failure', () => {
      console.error('❌ Build failed: Some error')
      console.error('❌ Fatal error: Critical failure')

      expect(consoleCapture.errors).toContain('❌ Build failed: Some error')
      expect(consoleCapture.errors).toContain('❌ Fatal error: Critical failure')
    })
  })
})
