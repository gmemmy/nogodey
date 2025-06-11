import {existsSync, mkdirSync, rmSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import * as glob from 'glob'
import {afterEach, expect, test, vi} from 'vitest'

vi.mock('glob')

const MESSAGES_PATH = join(process.cwd(), 'js', 'dist', 'messages.json')

afterEach(() => {
  if (existsSync(MESSAGES_PATH)) rmSync(MESSAGES_PATH)
  vi.resetModules()
})

test('build exits when no files found', async () => {
  vi.mocked(glob.sync).mockReturnValue([])
  await import('../../build')
  expect(existsSync(MESSAGES_PATH)).toBe(false)
})

test('build writes messages when files provided', async () => {
  // Create a tmp tsx file for glob to pick up
  const tmpFile = join(process.cwd(), 'js', '__tmp__.tsx')
  mkdirSync(join(process.cwd(), 'js'), {recursive: true})
  writeFileSync(tmpFile, '<Text>Hello</Text>') // minimal react tsx
  vi.mocked(glob.sync).mockReturnValue([tmpFile])

  await import('../../build')
  expect(existsSync(MESSAGES_PATH)).toBe(true)
  rmSync(tmpFile)
})
