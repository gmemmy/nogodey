import {writeFileSync} from 'node:fs'
import type {GeneratorOptions} from '@babel/generator'
import {type ParserOptions, parse} from '@babel/parser'
import type {NodePath, Visitor} from '@babel/traverse'
import type * as t from '@babel/types'
import type {Plugin, PluginBuild} from 'esbuild'
import {getBuildExtensions} from 'esbuild-extra'
import slug from 'slug'

async function loadBabelModules() {
  const [traverseModule, generateModule] = await Promise.all([
    import('@babel/traverse'),
    import('@babel/generator'),
  ])

  return {
    traverse: traverseModule.default as (ast: t.Node, visitor: Visitor<t.Node>) => void,
    generate: generateModule.default,
  }
}

type Message = {
  readonly key: string
  readonly default: string
  readonly file: string
  readonly loc: {readonly line: number; readonly column: number}
}

type TransformArgs = {
  readonly code: string
  readonly path: string
  readonly loader?: string
  readonly namespace?: string
  readonly pluginData?: unknown
  readonly suffix?: string
}

type TransformResult = {
  readonly code: string
  readonly map?: string
}

type Location = {
  readonly line: number
  readonly column: number
}

const PARSER_PLUGINS = [
  'jsx',
  'typescript',
  'decorators-legacy',
  'classProperties',
  'objectRestSpread',
  'asyncGenerators',
  'functionBind',
  'exportDefaultFrom',
  'exportNamespaceFrom',
  'dynamicImport',
  'nullishCoalescingOperator',
  'optionalChaining',
] as const

const TARGET_ATTRIBUTES = ['placeholder', 'label', 'title'] as const

const messages: Message[] = []

const buildKey = (filePath: string, text: string): string => {
  const cleanPath = filePath.replace(/^.*\//, '').replace(/\.[^.]+$/, '')
  const cleanText = text.replace(/[^\w\s]/g, '').trim()
  return slug(`${cleanPath}-${cleanText}`, {lower: true})
}

const recordMessage = (key: string, text: string, filePath: string, loc: Location): void => {
  messages.push({key, default: text, file: filePath, loc})
}

const createLocation = (node: t.Node): Location => {
  if (node.loc) {
    return {
      line: node.loc.start.line,
      column: node.loc.start.column,
    } as const
  }
  return {line: 0, column: 0} as const
}

const isTargetAttribute = (name: string): name is (typeof TARGET_ATTRIBUTES)[number] => {
  return (TARGET_ATTRIBUTES as readonly string[]).includes(name)
}

const createParserOptions = (): ParserOptions =>
  ({
    sourceType: 'module',
    plugins: [...PARSER_PLUGINS],
  }) as const

const plugin: Plugin = {
  name: 'nogodey-ast',
  setup(build: PluginBuild): void {
    const {onTransform} = getBuildExtensions(build, 'nogodey-ast')

    onTransform(
      {
        filter: /\.(tsx?|jsx?)$/,
        namespace: 'file',
      },
      async (args: TransformArgs): Promise<TransformResult> => {
        const {code, path: filePath} = args

        // Skip node_modules
        if (filePath.includes('node_modules')) {
          return {code}
        }

        console.log('🛠 nogodey AST running on', filePath)

        if (!code) {
          console.log('❌ No code provided in args')
          return {code}
        }

        try {
          const {traverse, generate} = await loadBabelModules()
          const ast = parse(code, createParserOptions())
          let transformCount = 0

          // Traverse the AST to find and transform JSX elements
          traverse(ast, {
            JSXElement(path: NodePath<t.JSXElement>): void {
              const node = path.node
              const openingElement = node.openingElement

              if (
                openingElement.name.type === 'JSXIdentifier' &&
                openingElement.name.name.toLowerCase() === 'text'
              ) {
                console.log('Found Text element with children:', node.children?.length)

                // Transform JSXText children
                node.children = node.children.map(child => {
                  if (child.type === 'JSXText' && child.value?.trim()) {
                    const txt = child.value.trim()
                    const key = buildKey(filePath, txt)
                    const loc = createLocation(child)

                    console.log(`Recording message: key=${key}, text="${txt}"`)
                    recordMessage(key, txt, filePath, loc)
                    transformCount++

                    // Replace with JSXExpressionContainer calling __NOGO__
                    return {
                      type: 'JSXExpressionContainer',
                      expression: {
                        type: 'CallExpression',
                        callee: {type: 'Identifier', name: '__NOGO__'},
                        arguments: [{type: 'StringLiteral', value: key}],
                      },
                    } as t.JSXExpressionContainer
                  }
                  return child
                })
              }
            },

            JSXAttribute(path: NodePath<t.JSXAttribute>): void {
              const node = path.node

              if (
                node.name.type === 'JSXIdentifier' &&
                isTargetAttribute(node.name.name) &&
                node.value?.type === 'StringLiteral'
              ) {
                const txt = node.value.value
                if (txt) {
                  const key = buildKey(filePath, txt)
                  const loc = createLocation(node)

                  console.log(`Recording attribute message: key=${key}, text="${txt}"`)
                  recordMessage(key, txt, filePath, loc)
                  transformCount++

                  // Replace with JSXExpressionContainer calling __NOGO__
                  node.value = {
                    type: 'JSXExpressionContainer',
                    expression: {
                      type: 'CallExpression',
                      callee: {type: 'Identifier', name: '__NOGO__'},
                      arguments: [{type: 'StringLiteral', value: key}],
                    },
                  } as t.JSXExpressionContainer
                }
              }
            },
          })

          console.log(`Transformed ${transformCount} text nodes`)

          // Generate the transformed code
          const generateOptions: GeneratorOptions = {
            retainLines: true,
            compact: false,
          } as const

          const result = generate(ast, generateOptions)

          return {code: result.code}
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.error('❌ Error during AST parsing/transformation:', errorMessage)
          return {code}
        }
      }
    )

    // Write messages.json at the end of the build
    build.onEnd((): void => {
      const outputPath = 'messages.json' as const
      writeFileSync(outputPath, JSON.stringify(messages, null, 2))
      console.log(`Extracted ${messages.length} messages → ${outputPath}`)

      // Clear messages for next build
      messages.length = 0
    })
  },
} as const

export default plugin
