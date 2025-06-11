export default class IntlMessageFormatMock {
  constructor(
    private msg: string,
    _locale: string
  ) {}
  format(vars: Record<string, string | number | boolean>): string {
    if (this.msg.includes('plural')) {
      const count = Number(vars.count)
      return count === 1 ? `${count} item` : `${count} items`
    }
    if (this.msg.includes('select')) {
      const gender = String(vars.gender)
      if (gender === 'male') return 'He is here'
      if (gender === 'female') return 'She is here'
      return 'They are here'
    }
    return this.msg
  }
}
