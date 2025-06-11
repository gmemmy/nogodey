import '@testing-library/jest-dom'

// Global test utilities
declare global {
  const expect: typeof import('vitest').expect
  const test: typeof import('vitest').test
  const describe: typeof import('vitest').describe
  const it: typeof import('vitest').it
  const beforeEach: typeof import('vitest').beforeEach
  const afterEach: typeof import('vitest').afterEach
  const beforeAll: typeof import('vitest').beforeAll
  const afterAll: typeof import('vitest').afterAll
  const vi: typeof import('vitest').vi
}

// Test helpers
export const createMockPath = (filename: string): string => `/test/fixtures/${filename}`

export const createMockTransformArgs = (code: string, path: string) =>
  ({
    code,
    path,
    namespace: 'file',
  }) as const

// Console utilities for testing
export const captureConsoleOutput = () => {
  const logs: string[] = []
  const errors: string[] = []

  const originalLog = console.log
  const originalError = console.error

  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(' '))
  }

  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(' '))
  }

  return {
    logs,
    errors,
    restore: () => {
      console.log = originalLog
      console.error = originalError
    },
  }
}
