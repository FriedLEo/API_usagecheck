import { describe, expect, it } from 'vitest'
import { countdown, formatMoney, formatPercent, formatTokens } from '../src/renderer/src/format'

describe('formatMoney', () => {
  it('attaches the currency unit and rounds to two decimals', () => {
    expect(formatMoney('4.8042952', 'CNY', { locale: 'en-US' })).toBe('CN¥4.80')
    expect(formatMoney('4.8042952', 'USD', { locale: 'en-US' })).toBe('$4.80')
  })

  it('supports whole-unit values for chart axis ticks', () => {
    expect(formatMoney(8, 'CNY', { locale: 'en-US', fractionDigits: 0 })).toBe('CN¥8')
  })

  it('falls back to a plain code and amount for non-ISO currency strings', () => {
    expect(formatMoney('4.8', 'CREDITS', { locale: 'en-US' })).toBe('CREDITS 4.80')
  })

  it('renders a dash instead of NaN for unusable amounts', () => {
    expect(formatMoney('not-a-number', 'USD', { locale: 'en-US' })).toBe('—')
  })
})

describe('formatTokens', () => {
  it('groups thousands without decimals', () => {
    expect(formatTokens(1234567, 'en-US')).toBe('1,234,567')
  })

  it('renders a dash instead of NaN for unusable amounts', () => {
    expect(formatTokens('nope', 'en-US')).toBe('—')
  })
})

describe('formatPercent', () => {
  it('keeps up to two decimals and drops trailing zeros', () => {
    expect(formatPercent('0.9', 'en-US')).toBe('0.9%')
    expect(formatPercent('5.3', 'en-US')).toBe('5.3%')
    expect(formatPercent(12, 'en-US')).toBe('12%')
  })

  it('rounds beyond two decimals', () => {
    expect(formatPercent('4.8042952', 'en-US')).toBe('4.8%')
    expect(formatPercent('10.567', 'en-US')).toBe('10.57%')
  })

  it('renders a dash for unusable input', () => {
    expect(formatPercent('nope', 'en-US')).toBe('—')
  })
})

describe('countdown', () => {
  const now = Date.parse('2026-09-13T12:00:00.000Z')

  it('formats a future instant as hours and minutes', () => {
    expect(countdown('2026-09-13T15:20:00.000Z', now)).toBe('3h 20m')
  })

  it('switches to days once the window is longer than a day', () => {
    const target = new Date(now + (29 * 86_400 + 9 * 3600) * 1000).toISOString()
    expect(countdown(target, now)).toBe('29d 9h')
  })

  it('clamps a past instant to zero', () => {
    expect(countdown('2026-09-13T11:00:00.000Z', now)).toBe('0h 0m')
  })

  it('renders a dash for an unparseable instant', () => {
    expect(countdown('not-a-date', now)).toBe('—')
  })
})
