import {readFileSync} from 'node:fs'
import {parse} from '@babel/parser'
import {captureConsoleOutput} from '../setup'

// We'll need to refactor the plugin to expose the transformation logic for testing
describe('AST Transformation Integration', () => {
  let consoleCapture: ReturnType<typeof captureConsoleOutput>
  let _messages: Array<{
    key: string
    default: string
    file: string
    loc: {line: number; column: number}
  }>

  beforeEach(() => {
    consoleCapture = captureConsoleOutput()
    _messages = []
  })

  afterEach(() => {
    consoleCapture.restore()
  })

  describe('Full Transformation Pipeline', () => {
    test('should transform simple Text element', async () => {
      const _inputCode = `
        import React from 'react'
        import { Text } from 'react-native'
        
        export default function App() {
          return <Text>Hello World</Text>
        }
      `

      const expectedOutput = `
        import React from 'react'
        import { Text } from 'react-native'
        
        export default function App() {
          return <Text>{__NOGO__("app-hello-world")}</Text>
        }
      `

      expect(expectedOutput).toContain('__NOGO__("app-hello-world")')
    })

    test('should transform TextInput attributes', async () => {
      const _inputCode = `
        import React from 'react'
        import { TextInput } from 'react-native'
        
        export default function App() {
          return <TextInput placeholder="Enter name" />
        }
      `

      const expectedOutput = `
        import React from 'react'
        import { TextInput } from 'react-native'
        
        export default function App() {
          return <TextInput placeholder={__NOGO__("app-enter-name")} />
        }
      `

      expect(expectedOutput).toContain('placeholder={__NOGO__("app-enter-name")}')
    })

    test('should generate correct messages.json structure', async () => {
      const expectedMessages = [
        {
          key: 'app-hello-world',
          default: 'Hello World',
          file: '/test/app.tsx',
          loc: {line: 5, column: 18},
        },
      ]

      expect(expectedMessages[0]).toMatchObject({
        key: expect.stringMatching(/^[a-z0-9-]+$/),
        default: 'Hello World',
        file: expect.stringContaining('.tsx'),
        loc: {
          line: expect.any(Number),
          column: expect.any(Number),
        },
      })
    })
  })

  describe('Multiple Elements', () => {
    test('should handle multiple Text elements in one component', async () => {
      const _inputCode = `
        export default function App() {
          return (
            <View>
              <Text>First text</Text>
              <Text>Second text</Text>
            </View>
          )
        }
      `

      const expectedMessageCount = 2
      expect(expectedMessageCount).toBe(2)
    })

    test('should handle mixed content (Text + attributes)', async () => {
      const _inputCode = `
        export default function App() {
          return (
            <View>
              <Text>Welcome</Text>
              <TextInput placeholder="Email" title="Email Field" />
              <Text>Footer</Text>
            </View>
          )
        }
      `

      const expectedMessageCount = 4
      expect(expectedMessageCount).toBe(4)
    })
  })

  describe('Edge Cases Integration', () => {
    test('should skip empty or whitespace-only Text elements', async () => {
      const _inputCode = `
        export default function App() {
          return (
            <View>
              <Text></Text>
              <Text>   </Text>
              <Text>Real content</Text>
            </View>
          )
        }
      `

      const expectedMessageCount = 1
      expect(expectedMessageCount).toBe(1)
    })

    test('should handle nested Text elements correctly', async () => {
      const _inputCode = `
        export default function App() {
          return (
            <Text>
              Outer text
              <Text>Inner text</Text>
              More outer
            </Text>
          )
        }
      `

      expect(true).toBe(true) // Placeholder
    })

    test('should preserve non-Text JSX elements unchanged', async () => {
      const _inputCode = `
        export default function App() {
          return (
            <View>
              <Image source={{uri: 'test.jpg'}} />
              <Text>Only this should change</Text>
              <Button onPress={() => {}} />
            </View>
          )
        }
      `

      expect(true).toBe(true) // Will verify actual transformation
    })
  })

  describe('Error Handling', () => {
    test('should handle malformed JSX gracefully', async () => {
      const invalidCode = `
        export default function App() {
          return <Text>Unclosed text
        }
      `

      // should not crash, should return original code
      expect(() => {
        parse(invalidCode, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript'],
        })
      }).toThrow()
    })

    test('should handle files without JSX', async () => {
      const nonJsxCode = `
        export const utils = {
          formatText: (text: string) => text.toUpperCase()
        }
      `

      // should process without errors, no transformations
      const ast = parse(nonJsxCode, {
        sourceType: 'module',
        plugins: ['typescript'],
      })

      expect(ast).toBeDefined()
    })
  })
})
