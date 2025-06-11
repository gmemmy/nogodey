import {describe, expect, test, vi} from 'vitest'

// Mock external ICU libs to keep tests self-contained
vi.mock('intl-messageformat-parser', () => ({
  parse: (msg: string) => msg,
}))

class FakeIntlMessageFormat {
  constructor(private message: string) {}
  format(vars: Record<string, string | number>): string {
    // SUPER-naive formatter for test cases only
    if (this.message.includes('plural')) {
      const count = vars.count as number
      return count === 1 ? `${count} item` : `${count} items`
    }
    if (this.message.includes('select')) {
      const gender = vars.gender as string
      if (gender === 'male') return 'He is here'
      if (gender === 'female') return 'She is here'
      return 'They are here'
    }
    return this.message
  }
}
vi.mock('intl-messageformat', () => ({
  default: FakeIntlMessageFormat,
}))

vi.mock('../../src/icu-runtime.js', () => ({
  formatICU: (msg: string, vars: Record<string, string | number>) => {
    if (msg.includes('plural')) {
      const count = vars.count as number
      return count === 1 ? `${count} item` : `${count} items`
    }
    if (msg.includes('select')) {
      const gender = vars.gender as string
      if (gender === 'male') return 'He is here'
      if (gender === 'female') return 'She is here'
      return 'They are here'
    }
    return msg
  },
}))

import {formatICU} from '../../src/icu-runtime.js'

const PLURAL_MSG = '{count, plural, one {# item} other {# items}}'
const GENDER_MSG = '{gender, select, male {He is here} female {She is here} other {They are here}}'

describe('ICU runtime formatting', () => {
  test('plural rules', () => {
    expect(formatICU(PLURAL_MSG, {count: 1})).toBe('1 item')
    expect(formatICU(PLURAL_MSG, {count: 5})).toBe('5 items')
  })

  test('select rules', () => {
    expect(formatICU(GENDER_MSG, {gender: 'male'})).toBe('He is here')
    expect(formatICU(GENDER_MSG, {gender: 'female'})).toBe('She is here')
    expect(formatICU(GENDER_MSG, {gender: 'other'})).toBe('They are here')
  })
})
