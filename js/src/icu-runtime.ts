// biome-ignore lint/suspicious/noExplicitAny: external library without types in ambient.
// @ts-ignore
import {parse} from '@formatjs/icu-messageformat-parser'
// biome-ignore lint/suspicious/noExplicitAny: external library without types.
// @ts-ignore
import IntlMessageFormat from 'intl-messageformat'

// Very small cache to avoid recompiling the same message repeatedly.
const CACHE = new Map<string, IntlMessageFormat>()

export function formatICU(
  message: string,
  vars: Record<string, string | number | boolean>,
  locale: string = Intl.DateTimeFormat().resolvedOptions().locale
): string {
  let fmt = CACHE.get(message)
  if (!fmt) {
    const ast = parse(message)
    fmt = new IntlMessageFormat(ast, locale)
    CACHE.set(message, fmt)
  }
  return fmt.format(vars) as string
}
