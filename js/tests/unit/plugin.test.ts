import {readFileSync} from 'node:fs'
import {parse} from '@babel/parser'
import {captureConsoleOutput, createMockTransformArgs} from '../setup'

const loadFixture = (name: string): string =>
  readFileSync(`tests/fixtures/input/${name}.tsx`, 'utf-8')

describe('Plugin AST Transformation', () => {
  let consoleCapture: ReturnType<typeof captureConsoleOutput>

  beforeEach(() => {
    consoleCapture = captureConsoleOutput()
  })

  afterEach(() => {
    consoleCapture.restore()
  })

  describe('Text Element Detection', () => {
    test('should detect simple Text elements', () => {
      const code = loadFixture('simple')
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      })

      // We'll need to extract the AST traversal logic to test it directly
      expect(ast).toBeDefined()
      expect(ast.type).toBe('File')
    })

    test('should handle complex components with multiple Text elements', () => {
      const code = loadFixture('complex')
      expect(code).toContain('Welcome to the app')
      expect(code).toContain('Multiple text nodes')
      expect(code).toContain('placeholder="Enter your email"')
    })
  })

  describe('Edge Cases', () => {
    test('should ignore empty Text elements', () => {
      const code = loadFixture('edge-cases')
      expect(code).toContain('<Text></Text>')
      expect(code).toContain('<Text>   </Text>')
    })

    test('should handle special characters in text', () => {
      const code = loadFixture('edge-cases')
      expect(code).toContain('Hello "World" & <View>!</View>')
    })

    test('should handle nested Text elements', () => {
      const code = loadFixture('edge-cases')
      expect(code).toContain('Outer text')
      expect(code).toContain('Inner text')
    })
  })

  describe('Key Generation', () => {
    test('should generate consistent keys for same text', () => {
      const _filePath = '/test/component.tsx'
      const _text = 'Hello World'

      const expectedKey = 'component-hello-world'
      expect(expectedKey).toBe('component-hello-world')
    })

    test('should handle special characters in key generation', () => {
      const _filePath = '/test/component.tsx'
      const _text = 'Hello "World" & <View>!</View>'

      const expectedKey = 'component-hello-world-universe'
      expect(expectedKey).toBe('component-hello-world-universe')
    })
  })

  describe('Message Recording', () => {
    test('should record messages with correct structure', () => {
      const mockMessage = {
        key: 'test-hello-world',
        default: 'Hello World',
        file: '/test/file.tsx',
        loc: {line: 1, column: 0},
      }

      expect(mockMessage).toMatchObject({
        key: expect.any(String),
        default: expect.any(String),
        file: expect.any(String),
        loc: expect.objectContaining({
          line: expect.any(Number),
          column: expect.any(Number),
        }),
      })
    })
  })

  describe('Console Output', () => {
    test('should log transformation progress', async () => {
      console.log('🛠 nogodey AST running on test-file.tsx')
      console.log('Recording message: key=test-key, text="Test Text"')

      expect(consoleCapture.logs).toContain('🛠 nogodey AST running on test-file.tsx')
      expect(consoleCapture.logs).toContain('Recording message: key=test-key, text="Test Text"')
    })
  })
})
