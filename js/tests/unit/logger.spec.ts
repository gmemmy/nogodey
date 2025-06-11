import {afterEach, expect, test, vi} from 'vitest'
import {info} from '../../src/logger'

// Spy on console.log to capture output
const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

afterEach(() => {
  logSpy.mockReset()
})

test('info prints structured JSON', () => {
  info({foo: 'bar'}, 'hello')

  expect(logSpy).toHaveBeenCalledTimes(1)

  const loggedLine = logSpy.mock.calls[0]?.[0] as string
  const obj = JSON.parse(loggedLine)

  expect(obj).toMatchObject({level: 'info', message: 'hello', foo: 'bar'})
  expect(obj.timestamp).toBeDefined()
})
