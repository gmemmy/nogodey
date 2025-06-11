import {mkdirSync, writeFileSync} from 'node:fs'
import {dirname} from 'node:path'
import type {GeneratorOptions} from '@babel/generator'
import {type ParserOptions, parse} from '@babel/parser'
import type {NodePath, Visitor} from '@babel/traverse'
import type * as t from '@babel/types'
import type {Plugin, PluginBuild} from 'esbuild'
import {getBuildExtensions} from 'esbuild-extra'
import slug from 'slug'
import * as logger from './src/logger.js'

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

// ICU detection helpers
const ICU_PATTERN = /\{[^}]*?,\s*(plural|select)\s*,/i
const ICU_VAR_RE = /\{(\w+)\s*,\s*(?:plural|select)/gi

const extractIcuVars = (msg: string): string[] => {
  const vars = new Set<string>()
  for (const m of msg.matchAll(ICU_VAR_RE)) {
    if (m[1]) vars.add(m[1])
  }
  return [...vars]
}

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

        logger.info(
          {
            filePath,
            fileSize: code.length,
          },
          'starting AST transformation'
        )

        if (!code) {
          logger.warn({filePath}, 'no code provided in transform args')
          return {code}
        }

        const transformTimer = logger.startTimer('ast_transform')

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
                logger.info(
                  {
                    filePath,
                    elementType: 'Text',
                    childrenCount: node.children?.length || 0,
                  },
                  'found Text element'
                )

                // Transform JSXText children
                // biome-ignore lint/suspicious/noExplicitAny: child nodes can be various JSX types
                node.children = node.children.map((child: any) => {
                  if (child.type === 'JSXText' && child.value?.trim()) {
                    const txt = child.value.trim()
                    const key = buildKey(filePath, txt)
                    const loc = createLocation(child)

                    logger.info(
                      {
                        filePath,
                        key,
                        text: txt,
                        line: loc.line,
                        column: loc.column,
                      },
                      'recording text message'
                    )

                    recordMessage(key, txt, filePath, loc)
                    transformCount++

                    const isIcu = ICU_PATTERN.test(txt)
                    const argNodes: t.Expression[] = [{type: 'StringLiteral', value: key}]
                    if (isIcu) {
                      const vars = extractIcuVars(txt)
                      const props: t.ObjectProperty[] = vars.map(v => ({
                        type: 'ObjectProperty',
                        key: {type: 'Identifier', name: v},
                        value: {type: 'Identifier', name: v},
                        shorthand: true,
                        computed: false,
                      }))
                      argNodes.push({type: 'ObjectExpression', properties: props})
                    }

                    // Replace with JSXExpressionContainer calling __NOGO__
                    return {
                      type: 'JSXExpressionContainer',
                      expression: {
                        type: 'CallExpression',
                        callee: {type: 'Identifier', name: '__NOGO__'},
                        arguments: argNodes,
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

                  logger.info(
                    {
                      filePath,
                      attributeName: node.name.name,
                      key,
                      text: txt,
                      line: loc.line,
                      column: loc.column,
                    },
                    'recording attribute message'
                  )

                  recordMessage(key, txt, filePath, loc)
                  transformCount++

                  const isIcu = ICU_PATTERN.test(txt)
                  const argNodes: t.Expression[] = [{type: 'StringLiteral', value: key}]
                  if (isIcu) {
                    const vars = extractIcuVars(txt)
                    const props: t.ObjectProperty[] = vars.map(v => ({
                      type: 'ObjectProperty',
                      key: {type: 'Identifier', name: v},
                      value: {type: 'Identifier', name: v},
                      shorthand: true,
                      computed: false,
                    }))
                    argNodes.push({type: 'ObjectExpression', properties: props})
                  }

                  // Replace with JSXExpressionContainer calling __NOGO__
                  node.value = {
                    type: 'JSXExpressionContainer',
                    expression: {
                      type: 'CallExpression',
                      callee: {type: 'Identifier', name: '__NOGO__'},
                      arguments: argNodes,
                    },
                  } as t.JSXExpressionContainer
                }
              }
            },
          })

          logger.info(
            {
              filePath,
              transformCount,
            },
            'AST traversal completed'
          )

          // Generate the transformed code
          const generateOptions: GeneratorOptions = {
            retainLines: true,
            compact: false,
          } as const

          const result = generate(ast, generateOptions)
          transformTimer.observe()

          logger.info(
            {
              filePath,
              transformCount,
              outputSize: result.code.length,
            },
            'AST transformation completed'
          )

          return {code: result.code}
        } catch (_error) {
          transformTimer.observe()
          const errorMessage = _error instanceof Error ? _error.message : String(_error)

          logger.error(
            {
              filePath,
              errorMessage,
              errorType: _error instanceof Error ? _error.constructor.name : 'Unknown',
            },
            'error during AST parsing/transformation'
          )

          return {code}
        }
      }
    )

    // Write messages.json at the end of the build
    build.onEnd((): void => {
      const outputPath = 'dist/messages.json' as const
      const writeTimer = logger.startTimer('messages_write')

      // Ensure output directory exists
      try {
        mkdirSync(dirname(outputPath), {recursive: true})
      } catch (_error) {
        // Directory might already exist, which is fine
      }

      writeFileSync(outputPath, JSON.stringify(messages, null, 2))
      writeTimer.observe()

      logger.info(
        {
          messageCount: messages.length,
          outputPath,
        },
        'extracted messages written to file'
      )

      // Clear messages for next build
      messages.length = 0
    })
  },
} as const

export default plugin
