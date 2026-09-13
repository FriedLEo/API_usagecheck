/**
 * Shared number and currency formatting for the renderer.
 *
 * Amounts arrive from the provider as decimal strings and `currency` is a
 * free-form provider field, so every formatter here has to survive input that
 * `Intl` would reject. `Intl.NumberFormat` throws a `RangeError` on anything
 * that is not an ISO-4217 code, which would otherwise take down the dashboard.
 */

const moneyFormatters = new Map<string, Intl.NumberFormat | null>()
const plainFormatters = new Map<string, Intl.NumberFormat>()
const tokenFormatters = new Map<string, Intl.NumberFormat>()
const percentFormatters = new Map<string, Intl.NumberFormat>()

function toFiniteNumber(amount: number | string): number | null {
  const value = typeof amount === 'string' ? Number(amount) : amount
  return Number.isFinite(value) ? value : null
}

function plainFormatter(locale: string | undefined, fractionDigits: number): Intl.NumberFormat {
  const key = `${locale ?? ''}|${fractionDigits}`
  const cached = plainFormatters.get(key)
  if (cached) return cached
  const formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })
  plainFormatters.set(key, formatter)
  return formatter
}

function moneyFormatter(currency: string, fractionDigits: number, locale: string | undefined): Intl.NumberFormat | null {
  const key = `${locale ?? ''}|${currency}|${fractionDigits}`
  if (!moneyFormatters.has(key)) {
    let formatter: Intl.NumberFormat | null = null
    try {
      formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits
      })
    } catch {
      formatter = null
    }
    moneyFormatters.set(key, formatter)
  }
  return moneyFormatters.get(key) ?? null
}

/** Formats an amount with its currency unit, e.g. `CN¥4.80`. */
export function formatMoney(
  amount: number | string,
  currency: string,
  options: { fractionDigits?: number; locale?: string } = {}
): string {
  const value = toFiniteNumber(amount)
  if (value === null) return '—'
  const fractionDigits = options.fractionDigits ?? 2
  const formatter = moneyFormatter(currency, fractionDigits, options.locale)
  if (formatter) return formatter.format(value)
  return `${currency} ${plainFormatter(options.locale, fractionDigits).format(value)}`.trim()
}

/** Formats a token count with thousands separators and no decimals. */
export function formatTokens(amount: number | string, locale?: string): string {
  const value = toFiniteNumber(amount)
  if (value === null) return '—'
  const key = locale ?? ''
  const cached = tokenFormatters.get(key)
  if (cached) return cached.format(value)
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  tokenFormatters.set(key, formatter)
  return formatter.format(value)
}

/** Formats a percentage with up to two decimals and a `%` suffix, e.g. `0.9%`. */
export function formatPercent(amount: number | string, locale?: string): string {
  const value = toFiniteNumber(amount)
  if (value === null) return '—'
  const key = locale ?? ''
  const cached = percentFormatters.get(key)
  if (cached) return `${cached.format(value)}%`
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })
  percentFormatters.set(key, formatter)
  return `${formatter.format(value)}%`
}

/**
 * Formats a countdown to an ISO instant. Shows the two most significant units,
 * the way the Zen console reads: `3h 20m` for a short window, `29d 9h` for a
 * monthly one. Past instants clamp to `0h 0m`. `nowMs` is injectable so the
 * result is deterministic under test.
 */
export function countdown(until: string, nowMs: number = Date.now()): string {
  const target = new Date(until).getTime()
  if (!Number.isFinite(target)) return '—'
  const seconds = Math.max(0, Math.floor((target - nowMs) / 1000))
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`
}
