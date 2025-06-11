import type {PluginBuild} from 'esbuild'
import {describe, expect, test} from 'vitest'
import plugin from '../../plugin'

function makeBuild() {
  // Store collected onTransform callbacks so we can invoke them in tests
  const calls: Array<(args: {code: string; path: string}) => Promise<{code: string}>> = []

  const mockBuild = {
    onLoad() {},
    onEnd() {},
    // Stub the onTransform callback
    onTransform(
      _filter: RegExp,
      fn: (args: {code: string; path: string}) => Promise<{code: string}>
    ) {
      calls.push(fn)
    },
  } as unknown as PluginBuild

  // Initialise plugin with our mocked build object
  plugin.setup(mockBuild)

  return {calls}
}

describe('nogodey plugin transform edge cases', () => {
  test('skips files in node_modules', async () => {
    const {calls} = makeBuild()
    const res = await calls[0]!({code: 'x', path: '/a/node_modules/foo.tsx'})
    expect(res.code).toBe('x')
  })

  test('empty code returns untouched', async () => {
    const {calls} = makeBuild()
    const res = await calls[0]!({code: '', path: '/a/file.tsx'})
    expect(res.code).toBe('')
  })
})
