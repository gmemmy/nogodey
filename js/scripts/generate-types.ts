import {promises as fs} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const jsRoot = path.resolve(__dirname, '..')
const messagesPath = path.join(jsRoot, 'dist', 'messages.json')
const outputPath = path.join(jsRoot, 'nogodey.d.ts')

/**
 * Read and parse messages.json if it exists.
 */
async function readMessages(filePath: string): Promise<unknown[] | null> {
  try {
    const raw = await fs.readFile(filePath)
    return JSON.parse(raw.toString()) as unknown[]
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException
    if (nodeErr.code === 'ENOENT') {
      // File absent on first run – return null so we can emit a permissive type.
      console.warn(`messages.json not found at ${filePath}. Generating empty typings.`)
      return null
    }

    throw new Error(`Unable to read ${filePath}: ${(err as Error).message}`)
  }
}

/**
 * Extract unique translation keys from raw messages.
 */
function extractKeys(messages: unknown[]): Set<string> {
  if (!Array.isArray(messages)) {
    throw new Error("messages.json must be an array of objects with a 'key' property.")
  }

  const keys = new Set<string>()
  for (const entry of messages) {
    if (typeof entry === 'object' && entry !== null && 'key' in entry) {
      const k = (entry as Record<string, unknown>).key
      if (typeof k === 'string' && k.length > 0) keys.add(k)
    }
  }
  return keys
}

/**
 * Convert the key set into union type lines.
 */
function buildUnion(keys: Set<string>): string {
  if (keys.size === 0) return '  string'

  return Array.from(keys)
    .sort((a, b) => a.localeCompare(b))
    .map(k => `  | '${k}'`)
    .join('\n')
}

/**
 * Generate and write the .d.ts file.
 */
async function writeTypes(unionLines: string): Promise<void> {
  const content = `// Auto-generated – do not edit by hand\nexport type LocaleKeys =\n${unionLines};\n\nexport type NogoKeyed = (key: LocaleKeys, vars?: Record<string, unknown>) => string;\n\ndeclare const __NOGO__: NogoKeyed;\nexport { __NOGO__ };\n`

  await fs.writeFile(outputPath, content)
}

async function main(): Promise<void> {
  try {
    const rawMessages = await readMessages(messagesPath)
    const keys = rawMessages ? extractKeys(rawMessages) : new Set<string>()
    const union = buildUnion(keys)
    await writeTypes(union)

    console.log(`Generated ${outputPath} with ${keys.size} ${keys.size === 1 ? 'key' : 'keys'}.`)
  } catch (error) {
    console.error((error as Error).message)
    process.exitCode = 1
  }
}

main()
